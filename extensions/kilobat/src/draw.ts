// The app's own look, drawn as SVG for Raycast's Markdown views: Panel, Sparkline and SpeedDial from
// Kilobat's Theme.swift and SpeedTestView.swift, at the same sizes, with a light variant for Raycast's light theme.

type Palette = Record<"text" | "muted" | "blue" | "violet" | "rose" | "orange" | "yellow" | "mint" | "ink", string> & {
  panel: number;
  stroke: number;
  sub: number;
  track: number;
};

const dark: Palette = {
  text: "#edf0fc",
  muted: "#a3a8bf",
  blue: "#66b3fa",
  violet: "#b096fa",
  rose: "#e08575",
  orange: "#ff9f0a",
  yellow: "#ffd60a",
  mint: "#5fd38d",
  ink: "#ffffff",
  panel: 0.035,
  stroke: 0.055,
  sub: 0.025,
  track: 0.07,
};

const light: Palette = {
  text: "#1c1d26",
  muted: "#6e7287",
  blue: "#2f80e0",
  violet: "#7a5cf0",
  rose: "#c8553f",
  orange: "#d97a00",
  yellow: "#b38600",
  mint: "#239a5b",
  ink: "#000000",
  panel: 0.04,
  stroke: 0.08,
  sub: 0.03,
  track: 0.08,
};

export let ink = dark;
export function setAppearance(appearance: string | undefined) {
  ink = appearance === "light" ? light : dark;
}

const FONT = `font-family="-apple-system, 'SF Pro Text', 'Helvetica Neue', sans-serif"`;

export const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Markdown for an SVG, sized for Raycast. */
export function image(svg: string, width: number, alt = "") {
  return `![${esc(alt)}](data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}?raycast-width=${width})`;
}

let gradientID = 0;

export function svg(width: number, height: number, body: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
}

export function text(
  x: number,
  y: number,
  value: string,
  {
    size = 11,
    weight = 400,
    fill = ink.text,
    anchor = "start",
    mono = false,
  }: { size?: number; weight?: number; fill?: string; anchor?: string; mono?: boolean } = {},
) {
  const family = mono ? `font-family="'SF Mono', Menlo, monospace"` : FONT;
  return `<text x="${x}" y="${y}" ${family} font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" style="font-variant-numeric: tabular-nums">${esc(value)}</text>`;
}

/** Kilobat's Panel: white at 3.5 %, a 5.5 % hairline, 9 pt corners. */
export const panel = (x: number, y: number, width: number, height: number) =>
  `<rect x="${x + 0.5}" y="${y + 0.5}" width="${width - 1}" height="${height - 1}" rx="9" fill="${ink.ink}" fill-opacity="${ink.panel}" stroke="${ink.ink}" stroke-opacity="${ink.stroke}"/>`;

/** The quieter inner box the app uses for traces: 2.5 %, 7 pt corners. */
export const inset = (x: number, y: number, width: number, height: number) =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="7" fill="${ink.ink}" fill-opacity="${ink.sub}"/>`;

/** Through every point with horizontal tangents, like the app's Sparkline.curve, so peaks never overshoot. */
export function curve(points: [number, number][]) {
  if (!points.length) return "";
  let d = `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const [px, py] = points[i - 1],
      [x, y] = points[i];
    const mid = (px + x) / 2;
    d += ` C${mid.toFixed(1)} ${py.toFixed(1)} ${mid.toFixed(1)} ${y.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

/** The app's Sparkline: a soft fill, a line, and either a glow (speeds) or a dot where it is now (quieter measures). */
export function sparkline(
  values: number[],
  box: { x: number; y: number; width: number; height: number },
  color: string,
  { glow = false, root = false, ceiling }: { glow?: boolean; root?: boolean; ceiling?: number } = {},
) {
  if (values.length < 2) return "";
  const lift = (v: number) => (root ? Math.sqrt(Math.max(0, v)) : Math.max(0, v));
  const maximum = Math.max(1e-9, lift(Math.max(root ? 1e-9 : 1, ceiling ?? Math.max(...values))));
  const points = values.map(
    (v, i) =>
      [
        box.x + (box.width * i) / (values.length - 1),
        box.y + box.height - 3 - (box.height - 6) * Math.min(1, lift(v) / maximum),
      ] as [number, number],
  );
  const line = curve(points);
  const id = `fill${++gradientID}`;
  const last = points[points.length - 1];
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity="${glow ? 0.28 : 0.18}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
<path d="M${points[0][0].toFixed(1)} ${box.y + box.height} L${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)} ${line.slice(line.indexOf("C"))} L${last[0].toFixed(1)} ${box.y + box.height}Z" fill="url(#${id})"/>
${
  glow
    ? `<path d="${line}" fill="none" stroke="${color}" stroke-opacity="0.12" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="${line}" fill="none" stroke="${color}" stroke-opacity="0.22" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`
    : ""
}
<path d="${line}" fill="none" stroke="${color}" stroke-width="${glow ? 1.6 : 1.4}" stroke-linecap="round" stroke-linejoin="round"/>
${glow ? "" : `<circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="4.5" fill="none" stroke="${color}" stroke-opacity="0.3" stroke-width="3"/><circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.5" fill="${color}"/>`}`;
}

const arcPoint = (cx: number, cy: number, r: number, degrees: number) => {
  const a = (degrees * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};

/** A 270° arc starting bottom left, like `Circle().trim(0, 0.75).rotationEffect(135°)`. */
export function arc(cx: number, cy: number, r: number, fraction: number) {
  const sweep = 270 * Math.max(0, Math.min(1, fraction));
  if (sweep <= 0) return "";
  const [x1, y1] = arcPoint(cx, cy, r, 135);
  const [x2, y2] = arcPoint(cx, cy, r, 135 + Math.min(sweep, 269.99));
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/** The app's SpeedDial: a log scale to 1000 Mbps, an inner ring for the phase's progress, the value in the middle. */
export function speedDial(
  cx: number,
  top: number,
  title: string,
  value: number | undefined,
  progress: number,
  color: string,
  active: boolean,
) {
  const cy = top + 15 + 64,
    r = 60.5;
  const fraction = Math.min(1, Math.max(0, Math.log10(1 + (value ?? 0)) / 3));
  const number = value == null ? "—" : value < 100 ? value.toFixed(1) : Math.round(value).toString();
  return `<path d="${arc(cx, cy, r, 1)}" fill="none" stroke="${ink.ink}" stroke-opacity="${ink.track}" stroke-width="7" stroke-linecap="round"/>
${active && fraction > 0 ? `<path d="${arc(cx, cy, r, fraction)}" fill="none" stroke="${color}" stroke-opacity="0.25" stroke-width="13" stroke-linecap="round"/>` : ""}
${fraction > 0 ? `<path d="${arc(cx, cy, r, fraction)}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round"/>` : ""}
<path d="${arc(cx, cy, r - 12, 1)}" fill="none" stroke="${color}" stroke-opacity="0.08" stroke-width="2"/>
${progress > 0 ? `<path d="${arc(cx, cy, r - 12, progress)}" fill="none" stroke="${color}" stroke-opacity="0.65" stroke-width="2" stroke-linecap="round"/>` : ""}
${text(cx, cy + 4, number, { size: 22, weight: 700, anchor: "middle" })}
${text(cx, cy + 20, "Mbps", { size: 10, fill: ink.muted, anchor: "middle" })}
${text(cx, top + 8, "30", { size: 8, fill: ink.muted, anchor: "middle" })}
${text(cx - 64, cy + 56, "0", { size: 8, fill: ink.muted, anchor: "middle" })}
${text(cx + 64, cy + 56, "1000", { size: 8, fill: ink.muted, anchor: "middle" })}
${text(cx, top + 159, active ? `${Math.round(progress * 100)}% · ${title}` : title, { size: 11, weight: 600, fill: active ? color : ink.muted, anchor: "middle" })}`;
}

/** A thin bar, as in the app's budget card. */
export function bar(x: number, y: number, width: number, fraction: number, color: string) {
  const filled = Math.max(0, Math.min(1, fraction)) * width;
  return `<rect x="${x}" y="${y}" width="${width}" height="4" rx="2" fill="${ink.ink}" fill-opacity="${ink.track}"/>${
    filled > 0 ? `<rect x="${x}" y="${y}" width="${filled.toFixed(1)}" height="4" rx="2" fill="${color}"/>` : ""
  }`;
}

/** A row of label on the left, value on the right: the app's resultRow. */
export const row = (x: number, y: number, width: number, label: string, value: string, color = ink.text) =>
  `${text(x, y, label, { fill: ink.muted })}${text(x + width, y, value, { fill: color, anchor: "end" })}`;

export const dot = (x: number, y: number, color: string, r = 3) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`;

/** Shortens text to roughly fit a width, since SVG can't measure it. */
export function fit(value: string, width: number, size: number) {
  const max = Math.floor(width / (size * 0.55));
  return value.length > max ? value.slice(0, Math.max(1, max - 1)).trimEnd() + "…" : value;
}

/** Breaks text into lines that roughly fit a width. */
export function wrap(value: string, width: number, size: number, maxLines = 3) {
  const max = Math.floor(width / (size * 0.52));
  const lines: string[] = [];
  let line = "";
  for (const word of value.split(/\s+/)) {
    if ((line + " " + word).trim().length > max && line) {
      lines.push(line);
      line = word;
    } else line = (line + " " + word).trim();
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = fit(lines[maxLines - 1] + " …", width, size);
  }
  return lines;
}

/** Simple line icons in the spirit of the SF Symbols the app uses. */
export const icons = {
  phone: (x: number, y: number, c: string) =>
    `<path d="M${x + 2} ${y + 1} l3 0 l1.2 3 l-1.8 1.2 a8 8 0 0 0 4.4 4.4 l1.2 -1.8 l3 1.2 l0 3 a1.5 1.5 0 0 1 -1.5 1.5 a12 12 0 0 1 -11 -11 a1.5 1.5 0 0 1 1.5 -1.5Z" fill="none" stroke="${c}" stroke-width="1.3" stroke-linejoin="round"/>`,
  video: (x: number, y: number, c: string) =>
    `<rect x="${x + 0.5}" y="${y + 3}" width="10" height="9" rx="2" fill="none" stroke="${c}" stroke-width="1.3"/><path d="M${x + 11} ${y + 6.5} l4 -2.5 v7 l-4 -2.5Z" fill="none" stroke="${c}" stroke-width="1.3" stroke-linejoin="round"/>`,
  tv: (x: number, y: number, c: string) =>
    `<rect x="${x + 0.5}" y="${y + 2}" width="15" height="10" rx="2" fill="none" stroke="${c}" stroke-width="1.3"/><path d="M${x + 6.5} ${y + 5} l3.5 2 l-3.5 2Z" fill="${c}"/><path d="M${x + 4.5} ${y + 14.5} h7" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/>`,
  sparkles: (x: number, y: number, c: string) =>
    `<path d="M${x + 6} ${y + 2} q1 4.5 5 5 q-4 .5 -5 5 q-1 -4.5 -5 -5 q4 -.5 5 -5Z" fill="none" stroke="${c}" stroke-width="1.2" stroke-linejoin="round"/><path d="M${x + 12.5} ${y + 1} q.4 1.8 2 2 q-1.6 .2 -2 2 q-.4 -1.8 -2 -2 q1.6 -.2 2 -2Z" fill="${c}"/>`,
  down: (x: number, y: number, c: string) =>
    `<path d="M${x + 6} ${y + 1} v10 M${x + 2} ${y + 7.5} l4 4 l4 -4" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  up: (x: number, y: number, c: string) =>
    `<path d="M${x + 6} ${y + 12} v-10 M${x + 2} ${y + 5.5} l4 -4 l4 4" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
};
