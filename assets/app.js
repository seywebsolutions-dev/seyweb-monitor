(() => {
  const TARGET = "https://raw.githubusercontent.com/seywebsolutions-dev/seyweb-solution/main/public/monitor-logs/latest.json";
  const FALLBACK_TARGET = "https://seywebsolutions.com";
  const MAX_BARS = 40;

  const els = {
    statusLabel: document.getElementById("statusLabel"),
    pulse: document.getElementById("pulse"),
    uptimeValue: document.getElementById("uptimeValue"),
    latestValue: document.getElementById("latestValue"),
    bars: document.getElementById("bars"),
    timelineList: document.getElementById("timelineList"),
  };

  let lastStatus = "unknown";

  function setStatus(overall, code, ts) {
    const status = code === 200 ? "up" : "down";
    lastStatus = status;

    els.statusLabel.textContent = code === 200 ? "Operational" : "Downtime";
    els.pulse.className = "pulse " + status;
    els.uptimeValue.textContent = overall ? (overall.uptimeRatio != null ? `${Math.round(overall.uptimeRatio * 100)}%` : "—") : "—";
    els.latestValue.textContent = ts ? new Date(ts).toLocaleString() : "No data yet";
  }

  function renderChart(series) {
    const data = Array.isArray(series) && series.length ? series.slice(-MAX_BARS) : [];
    const svgW = 360, svgH = 160, padX = 16, padY = 16;
    const maxVal = Math.max(1, ...data.map((d) => (d.up || 0) + (d.down || 0)));
    const usable = svgW - padX * 2;
    const slot = data.length ? usable / data.length : usable;
    const w = Math.max(1, slot - 2);

    let html = "";
    data.forEach((d, i) => {
      const upH = (d.up / maxVal) * (svgH - padY * 2);
      const downH = (d.down / maxVal) * (svgH - padY * 2);
      const x = padX + i * slot;
      const yUp = svgH - padY - upH;
      const yDown = svgH - padY - downH;
      html += `<rect x="${x}" y="${yUp}" width="${w}" height="${upH}" rx="2" fill="url(#barUp)" opacity="0.95"/>`;
      html += `<rect x="${x + w + 1}" y="${yDown}" width="${w}" height="${downH}" rx="2" fill="#ef4444" opacity="0.85"/>`;
    });
    els.bars.innerHTML = html;
  }

  function renderTimeline(series) {
    const items = Array.isArray(series) ? series.slice(-20).reverse() : [];
    if (!items.length) {
      els.timelineList.innerHTML = `<li class="empty">Waiting for first check…</li>`;
      return;
    }
    els.timelineList.innerHTML = items.map((d) => {
      const cls = d.status === "up" ? "up" : d.status === "down" ? "down" : "";
      return `
        <li class="timeline-item">
          <span class="timeline-dot ${cls}"></span>
          <div class="timeline-meta">
            <span class="timeline-msg">${d.status === "up" ? "Site reachable" : "Site unreachable"} — HTTP ${d.code ?? "—"}</span>
            <span class="timeline-ts">${new Date(d.ts).toLocaleString()}</span>
          </div>
        </li>
      `;
    }).join("");
  }

  async function fetchJSON(url) {
    try {
      const res = await fetch(url, { method: "GET", cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } catch (e) {
      console.warn("Monitor fetch failed:", e.message);
      return null;
    }
  }

  async function load() {
    const data = await fetchJSON(TARGET);
    if (!data) {
      els.statusLabel.textContent = "No data";
      els.pulse.className = "pulse";
      return;
    }
    setStatus(data.overall, data?.latest?.code, data?.latest?.ts);
    renderChart(data.series || []);
    renderTimeline(data.series || []);
  }

  load();
  setInterval(load, 15 * 60 * 1000);
})();
