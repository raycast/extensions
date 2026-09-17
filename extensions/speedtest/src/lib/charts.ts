import { Ping, Speed, SpeedSamples, SpeedtestResult } from "./speedtest.types";
import { FONT, svg, theme, xml } from "./svg";
import { convertBitsToMbps } from "../components/bandwidth/utils";
import { pingToString, speedToString } from "./utils";

// Non-linear speedometer scale, like speedtest.net: each tick gets the same
// angular span, so both a 3 Mbps hotel Wi-Fi and a gigabit line stay readable.
const GAUGE_TICKS_MBPS = [0, 1, 5, 10, 50, 100, 500, 1000];
const GAUGE_START_DEG = 150;
const GAUGE_SWEEP_DEG = 240;
export const GAUGE_W = 300;
export const GAUGE_H = 240;

function gaugeFraction(mbps: number): number {
  const last = GAUGE_TICKS_MBPS.length - 1;
  if (mbps <= 0) return 0;
  if (mbps >= GAUGE_TICKS_MBPS[last]) return 1;
  for (let i = 0; i < last; i++) {
    const lo = GAUGE_TICKS_MBPS[i];
    const hi = GAUGE_TICKS_MBPS[i + 1];
    if (mbps < hi) return (i + (mbps - lo) / (hi - lo)) / last;
  }
  return 1;
}

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
}

function arcPath(cx: number, cy: number, r: number, fromDeg: number, toDeg: number): string {
  const [x0, y0] = polar(cx, cy, r, fromDeg);
  const [x1, y1] = polar(cx, cy, r, toDeg);
  const largeArc = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

function splitSpeed(bandwidth: number | undefined): { value: string; unit: string } {
  const [value, unit] = speedToString(bandwidth).split(" ");
  return unit ? { value, unit } : { value: "—", unit: "Mbps" };
}

type GaugeOptions = {
  bandwidth: number;
  progress?: number;
  label: string;
  color: string;
  /** Override the big number in the middle (e.g. latency while pinging). */
  value?: string;
  unit?: string;
  /** Override the caption under the gauge. */
  status?: string;
  statusColor?: string;
};

/** Gauge body in a 300×240 box, origin top-left, so it can be composed. */
export function gaugeBody(opts: GaugeOptions): string {
  const { bandwidth, progress, label, color } = opts;
  const cx = GAUGE_W / 2;
  const cy = 150;
  const r = 110;
  const stroke = 14;
  const fraction = gaugeFraction(convertBitsToMbps(bandwidth));
  const knobDeg = GAUGE_START_DEG + GAUGE_SWEEP_DEG * fraction;
  const endDeg = GAUGE_START_DEG + GAUGE_SWEEP_DEG;
  const speed = splitSpeed(bandwidth);
  const value = opts.value ?? speed.value;
  const unit = opts.unit ?? speed.unit;

  const ticks = GAUGE_TICKS_MBPS.map((mbps, i) => {
    const deg = GAUGE_START_DEG + (GAUGE_SWEEP_DEG * i) / (GAUGE_TICKS_MBPS.length - 1);
    const [x1, y1] = polar(cx, cy, r + 11, deg);
    const [x2, y2] = polar(cx, cy, r + 17, deg);
    const [tx, ty] = polar(cx, cy, r + 29, deg);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${theme.muted}" stroke-width="2"/>
            <text x="${tx.toFixed(1)}" y="${(ty + 4).toFixed(1)}" text-anchor="middle" ${FONT} font-size="11" fill="${theme.muted}">${mbps}</text>`;
  }).join("");

  const filled =
    fraction > 0
      ? `<path d="${arcPath(cx, cy, r, GAUGE_START_DEG, knobDeg)}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"/>`
      : "";

  const running = progress !== undefined && progress < 1;
  const progressArc = running
    ? `<path d="${arcPath(cx, cy, r - 18, GAUGE_START_DEG, GAUGE_START_DEG + GAUGE_SWEEP_DEG * Math.max(progress, 0.005))}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" opacity="0.45"/>`
    : "";

  // A knob riding on the arc instead of a center needle: it never crosses the
  // number in the middle, whatever the speed.
  const [kx, ky] = polar(cx, cy, r, knobDeg);
  const knob = `<circle cx="${kx.toFixed(1)}" cy="${ky.toFixed(1)}" r="10" fill="${theme.text}" stroke="${color}" stroke-width="3"/>`;

  const status = opts.status ?? (running ? `${Math.round(progress * 100)}% · ${label}` : label);

  return `<path d="${arcPath(cx, cy, r, GAUGE_START_DEG, endDeg)}" fill="none" stroke="${theme.track}" stroke-width="${stroke}" stroke-linecap="round"/>
     ${filled}
     ${progressArc}
     ${ticks}
     ${knob}
     <text x="${cx}" y="${cy + 4}" text-anchor="middle" ${FONT} font-size="38" font-weight="700" fill="${theme.text}">${xml(value)}</text>
     <text x="${cx}" y="${cy + 28}" text-anchor="middle" ${FONT} font-size="14" fill="${theme.muted}">${xml(unit)}</text>
     <text x="${cx}" y="${GAUGE_H - 8}" text-anchor="middle" ${FONT} font-size="13" font-weight="600" fill="${opts.statusColor ?? color}">${xml(status)}</text>`;
}

export function speedGaugeSvg(opts: GaugeOptions): string {
  return svg(GAUGE_W, GAUGE_H, gaugeBody(opts));
}

/** Sparkline body drawn inside a w×h card at the origin. */
export function sparklineBody(samples: number[], color: string, w: number, h: number, title?: string): string {
  const pad = 14;
  const labelW = 96;
  const topPad = title ? 22 : 0;
  const card = `<rect width="${w}" height="${h}" rx="12" fill="${theme.card}"/>`;
  const heading = title
    ? `<text x="${pad}" y="${pad + 4}" ${FONT} font-size="11" font-weight="600" fill="${theme.muted}">${xml(title)}</text>`
    : "";

  if (samples.length < 2) {
    return `${card}${heading}
       <line x1="${pad}" y1="${(h + topPad) / 2}" x2="${w - pad}" y2="${(h + topPad) / 2}" stroke="${theme.faint}" stroke-width="2" stroke-dasharray="6 6"/>
       <text x="${w / 2}" y="${(h + topPad) / 2 - 12}" text-anchor="middle" ${FONT} font-size="13" fill="${theme.muted}">waiting for samples…</text>`;
  }

  const max = Math.max(...samples, 1);
  const plotTop = pad + topPad + 16;
  const plotBottom = h - pad;
  const points = samples.map((v, i) => {
    const x = pad + (i / (samples.length - 1)) * (w - pad * 2 - labelW);
    const y = plotBottom - (v / max) * (plotBottom - plotTop);
    return [x, y] as const;
  });
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lastX, lastY] = points[points.length - 1];
  const last = samples[samples.length - 1];

  return `${card}${heading}
     <line x1="${pad}" y1="${plotTop}" x2="${w - pad - labelW}" y2="${plotTop}" stroke="${theme.faint}" stroke-width="1" stroke-dasharray="4 4"/>
     <text x="${pad}" y="${plotTop - 5}" ${FONT} font-size="11" fill="${theme.muted}">peak ${speedToString(max)}</text>
     <polygon points="${pad},${plotBottom} ${line} ${lastX.toFixed(1)},${plotBottom}" fill="${color}" opacity="0.18"/>
     <polyline points="${line}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
     <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="4.5" fill="${color}"/>
     <text x="${(lastX + 12).toFixed(1)}" y="${(Math.min(Math.max(lastY, plotTop + 6), plotBottom - 4) + 5).toFixed(1)}" ${FONT} font-size="14" font-weight="600" fill="${theme.text}">${speedToString(last)}</text>
     <text x="${w - pad}" y="${h - pad + 2}" text-anchor="end" ${FONT} font-size="11" fill="${theme.muted}">${samples.length} samples</text>`;
}

export function speedSparklineSvg(samples: number[], color: string): string {
  return svg(600, 150, sparklineBody(samples, color, 600, 150));
}

type LatencyLike = Partial<Pick<Ping, "low" | "high" | "jitter" | "latency">>;

export function latencySvg(input: LatencyLike, title: string, color = theme.ping): string {
  const w = 600;
  const h = 150;
  const x0 = 40;
  const x1 = w - 40;
  const trackY = 88;
  const data = { latency: input.latency ?? 0, low: input.low ?? 0, high: input.high ?? 0, jitter: input.jitter ?? 0 };

  if (!data.latency) {
    return svg(
      w,
      h,
      `<rect width="${w}" height="${h}" rx="12" fill="${theme.card}"/>
       <line x1="${x0}" y1="${trackY}" x2="${x1}" y2="${trackY}" stroke="${theme.faint}" stroke-width="6" stroke-linecap="round"/>
       <text x="${w / 2}" y="${trackY - 28}" text-anchor="middle" ${FONT} font-size="14" fill="${theme.muted}">waiting for ${xml(title.toLowerCase())}…</text>`,
    );
  }

  const domainMax = Math.max(data.high, data.latency + data.jitter, 1) * 1.15;
  const toX = (ms: number) => x0 + (Math.max(ms, 0) / domainMax) * (x1 - x0);
  const clampLabelX = (x: number) => Math.min(Math.max(x, x0 + 24), x1 - 24);
  const lowX = toX(data.low);
  const highX = toX(data.high);
  const latX = toX(data.latency);
  const jitterHalf = Math.max(toX(data.jitter) - x0, 0) / 2;

  return svg(
    w,
    h,
    `<rect width="${w}" height="${h}" rx="12" fill="${theme.card}"/>
     <text x="${x0}" y="40" ${FONT} font-size="28" font-weight="700" fill="${theme.text}">${pingToString(data.latency)}</text>
     <text x="${x0}" y="58" ${FONT} font-size="12" fill="${theme.muted}">${xml(title)}</text>
     <text x="${x1}" y="40" text-anchor="end" ${FONT} font-size="14" fill="${theme.muted}">jitter <tspan font-weight="600" fill="${theme.text}">${pingToString(data.jitter)}</tspan></text>
     <line x1="${x0}" y1="${trackY}" x2="${x1}" y2="${trackY}" stroke="${theme.track}" stroke-width="6" stroke-linecap="round"/>
     <line x1="${lowX.toFixed(1)}" y1="${trackY}" x2="${highX.toFixed(1)}" y2="${trackY}" stroke="${theme.muted}" stroke-width="6" stroke-linecap="round" opacity="0.55"/>
     <rect x="${(latX - jitterHalf).toFixed(1)}" y="${trackY - 12}" width="${(jitterHalf * 2).toFixed(1)}" height="24" rx="6" fill="${color}" opacity="0.28"/>
     <circle cx="${latX.toFixed(1)}" cy="${trackY}" r="8" fill="${color}"/>
     <circle cx="${latX.toFixed(1)}" cy="${trackY}" r="3.5" fill="${theme.card}"/>
     <text x="${clampLabelX(lowX).toFixed(1)}" y="${trackY + 34}" text-anchor="middle" ${FONT} font-size="11" fill="${theme.muted}">low ${pingToString(data.low)}</text>
     <text x="${clampLabelX(highX).toFixed(1)}" y="${trackY + 34}" text-anchor="middle" ${FONT} font-size="11" fill="${theme.muted}">high ${pingToString(data.high)}</text>
     <text x="${x0}" y="${trackY + 52}" ${FONT} font-size="11" fill="${theme.muted}">0 ms</text>
     <text x="${x1}" y="${trackY + 52}" text-anchor="end" ${FONT} font-size="11" fill="${theme.muted}">${domainMax.toFixed(0)} ms</text>`,
  );
}

export function loadedLatencySvg(speed: Speed, title: string, color: string): string {
  // Progress events carry no latency block; it only arrives with the final result.
  const latency: Partial<Speed["latency"]> = speed.latency ?? {};
  return latencySvg({ ...latency, latency: latency.iqm }, title, color);
}

export function progressRingIcon(progress: number, color: string): string {
  const size = 32;
  const c = size / 2;
  const r = 11;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(Math.max(progress, 0.02), 1));
  return svg(
    size,
    size,
    `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${theme.track}" stroke-width="4"/>
     <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round"
       stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}" transform="rotate(-90 ${c} ${c})"/>`,
  );
}

export function summarySvg(result: SpeedtestResult): string {
  const w = 600;
  const rowH = 46;
  const rows = [
    { label: "Download", bandwidth: result.download.bandwidth, color: theme.download },
    { label: "Upload", bandwidth: result.upload.bandwidth, color: theme.upload },
  ];
  const h = rows.length * rowH + 64;
  const max = Math.max(...rows.map((r) => r.bandwidth), 1);
  const barX = 120;
  const barW = 340;

  const bars = rows
    .map((row, i) => {
      const y = 16 + i * rowH;
      const bw = Math.max((row.bandwidth / max) * barW, row.bandwidth > 0 ? 6 : 0);
      return `<text x="16" y="${y + 20}" ${FONT} font-size="14" fill="${theme.muted}">${row.label}</text>
              <rect x="${barX}" y="${y + 4}" width="${barW}" height="24" rx="7" fill="${theme.faint}"/>
              <rect x="${barX}" y="${y + 4}" width="${bw.toFixed(1)}" height="24" rx="7" fill="${row.color}"/>
              <text x="${barX + barW + 14}" y="${y + 21}" ${FONT} font-size="15" font-weight="600" fill="${theme.text}">${speedToString(row.bandwidth)}</text>`;
    })
    .join("");

  const pingY = 16 + rows.length * rowH + 12;
  const { ping } = result;
  const pingLine = ping.latency
    ? `<circle cx="24" cy="${pingY + 6}" r="6" fill="${theme.ping}"/>
       <text x="40" y="${pingY + 11}" ${FONT} font-size="14" fill="${theme.muted}">Ping <tspan font-weight="600" fill="${theme.text}">${pingToString(ping.latency)}</tspan>  ·  jitter <tspan font-weight="600" fill="${theme.text}">${pingToString(ping.jitter)}</tspan>  ·  packet loss <tspan font-weight="600" fill="${theme.text}">${(ping.packetLoss ?? 0).toFixed(1)}%</tspan></text>`
    : `<text x="16" y="${pingY + 11}" ${FONT} font-size="14" fill="${theme.muted}">Ping —</text>`;

  return svg(w, h, `<rect width="${w}" height="${h}" rx="12" fill="${theme.card}"/>${bars}${pingLine}`);
}

// ---------------------------------------------------------------------------
// Dashboard: the hero image of the main view. One big meter for the phase that
// is running, then both meters side by side once the test has finished.
// ---------------------------------------------------------------------------

export type TestPhase = "starting" | "ping" | "download" | "upload" | "done" | "error";

export type DashboardState = {
  phase: TestPhase;
  result: SpeedtestResult;
  progress: { ping?: number; download?: number; upload?: number };
  samples: SpeedSamples;
  errorMessage?: string;
};

export const DASHBOARD_W = 560;

type Step = { key: "ping" | "download" | "upload"; title: string; color: string; value: string; done: boolean };

function stepperBody(state: DashboardState, y: number): string {
  const { result, phase } = state;
  const order: TestPhase[] = ["starting", "ping", "download", "upload", "done"];
  // After a failure only the phases that actually produced a value count as done.
  const isDone = (key: Step["key"], value: string) =>
    phase === "error" ? value !== "" : order.indexOf(phase) > order.indexOf(key);
  const pingValue = result.ping.latency ? pingToString(result.ping.latency) : "";
  const downloadValue = result.download.bandwidth ? speedToString(result.download.bandwidth) : "";
  const uploadValue = result.upload.bandwidth ? speedToString(result.upload.bandwidth) : "";
  const steps: Step[] = [
    { key: "ping", title: "Ping", color: theme.ping, value: pingValue, done: isDone("ping", pingValue) },
    {
      key: "download",
      title: "Download",
      color: theme.download,
      value: downloadValue,
      done: isDone("download", downloadValue),
    },
    { key: "upload", title: "Upload", color: theme.upload, value: uploadValue, done: isDone("upload", uploadValue) },
  ];
  const gap = 12;
  const pillW = (DASHBOARD_W - gap * (steps.length - 1)) / steps.length;
  const pillH = 44;

  return steps
    .map((step, i) => {
      const x = i * (pillW + gap);
      const active = phase === step.key;
      const lit = active || step.done;
      const fill = lit ? step.color : theme.card;
      const fillOpacity = active ? 0.28 : step.done ? 0.16 : 1;
      const border = active ? `stroke="${step.color}" stroke-width="2"` : "";
      const titleColor = lit ? theme.text : theme.muted;
      const valueText = active && !step.value ? "measuring…" : step.value || "pending";
      return `<rect x="${x.toFixed(1)}" y="${y}" width="${pillW.toFixed(1)}" height="${pillH}" rx="12" fill="${fill}" fill-opacity="${fillOpacity}" ${border}/>
              <circle cx="${(x + 18).toFixed(1)}" cy="${y + pillH / 2}" r="5" fill="${lit ? step.color : theme.track}"/>
              <text x="${(x + 32).toFixed(1)}" y="${y + 19}" ${FONT} font-size="12" font-weight="600" fill="${titleColor}">${step.title}</text>
              <text x="${(x + 32).toFixed(1)}" y="${y + 34}" ${FONT} font-size="12" fill="${lit ? theme.text : theme.muted}">${xml(valueText)}</text>`;
    })
    .join("");
}

export function dashboardSvg(state: DashboardState): string {
  const { phase, result, progress, samples } = state;
  const sparkH = 110;
  const stepperH = 44;
  const gapY = 14;
  const parts: string[] = [];
  let y = 0;

  // Both meters are always on screen. The one that is running animates, the
  // other one waits with its final value (or a dash) so the layout never jumps.
  // Ping is too fast to deserve its own screen; it shows up in the strip below.
  const order: TestPhase[] = ["starting", "ping", "download", "upload", "done"];
  const waitingStatus = (): string => (phase === "starting" ? "connecting…" : "waiting…");
  const meter = (key: "download" | "upload", label: string, color: string): string => {
    const speed = result[key];
    const running = phase === key;
    const finished = phase === "error" ? speed.bandwidth > 0 : order.indexOf(phase) > order.indexOf(key);
    if (running) return gaugeBody({ bandwidth: speed.bandwidth, progress: progress[key], label, color });
    if (finished) return gaugeBody({ bandwidth: speed.bandwidth, label, color });
    return gaugeBody({
      bandwidth: 0,
      label,
      color,
      status: phase === "error" ? label : `${label} · ${waitingStatus()}`,
      statusColor: theme.muted,
    });
  };

  const scale = 0.88;
  const gw = GAUGE_W * scale;
  const gapX = DASHBOARD_W - gw * 2;
  parts.push(
    `<g transform="translate(0,${y}) scale(${scale})">${meter("download", "Download", theme.download)}</g>`,
    `<g transform="translate(${(gw + gapX).toFixed(1)},${y}) scale(${scale})">${meter("upload", "Upload", theme.upload)}</g>`,
  );
  y += GAUGE_H * scale + gapY;

  if (phase === "error") {
    parts.push(
      `<rect x="0" y="${y}" width="${DASHBOARD_W}" height="${sparkH}" rx="12" fill="${theme.bad}" fill-opacity="0.14"/>
       <text x="${DASHBOARD_W / 2}" y="${y + sparkH / 2 - 4}" text-anchor="middle" ${FONT} font-size="16" font-weight="600" fill="${theme.bad}">Speedtest failed</text>
       <text x="${DASHBOARD_W / 2}" y="${y + sparkH / 2 + 18}" text-anchor="middle" ${FONT} font-size="13" fill="${theme.muted}">${xml(state.errorMessage ?? "Something went wrong. Please try again.")}</text>`,
    );
  } else {
    const half = (DASHBOARD_W - gapY) / 2;
    parts.push(
      `<g transform="translate(0,${y})">${sparklineBody(samples.download, theme.download, half, sparkH, "Download over time")}</g>`,
      `<g transform="translate(${half + gapY},${y})">${sparklineBody(samples.upload, theme.upload, half, sparkH, "Upload over time")}</g>`,
    );
  }
  y += sparkH + gapY;

  parts.push(stepperBody(state, y));
  y += stepperH;

  return svg(DASHBOARD_W, y, parts.join(""));
}
