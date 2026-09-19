/* iStat 风格状态栏小图：深色竖胶囊 + 直方。无 canvas，纯 SVG。 */

export const SPARKLINE_HISTORY = 24;
export const SPARKLINE_PILL_SLOTS = 10;
export const SPARKLINE_WIDTH = 22;
export const SPARKLINE_HEIGHT = 28;
/** 内存胶囊比 CPU 窄：压力语义单色，占位够用即可。 */
export const SPARKLINE_MEM_WIDTH = 16;

export interface CpuBar {
  user: number;
  sys: number;
}

export const SPARK_CPU = "#64D2FF";
export const SPARK_USER = "#0A84FF";
export const SPARK_SYS = "#FF375F";
export const SPARK_MEM = "#BF5AF2";
export const RING_PRESSURE = "#0A84FF";
export const RING_CPU = "#64D2FF";
export const SEG_APP = "#0A84FF";
export const SEG_WIRED = "#FF375F";
export const SEG_COMPRESSED = "#FFD60A";

const PILL = "#1C1C1E";
const PILL_STROKE = "#3A3A3C";
const TRACK = "#D1D1D6";

export function pushHistory(values: readonly number[], sample: number, max = SPARKLINE_HISTORY): number[] {
  const next = values.length >= max ? values.slice(values.length - max + 1) : values.slice();
  next.push(clamp01(sample));
  return next;
}

export function pushCpuBars(values: readonly CpuBar[], sample: CpuBar, max = SPARKLINE_HISTORY): CpuBar[] {
  const next = values.length >= max ? values.slice(values.length - max + 1) : values.slice();
  next.push({ user: clamp01(sample.user), sys: clamp01(sample.sys) });
  return next;
}

function pillShell(w: number, h: number, clipId: string, bars: string): string {
  const rx = 6;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><clipPath id="${clipId}"><rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="${rx}"/></clipPath></defs>
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="${rx}" fill="${PILL}" stroke="${PILL_STROKE}" stroke-width="0.6"/>
  <g clip-path="url(#${clipId})">${bars}</g>
</svg>`;
}

/** 单色竖胶囊。样本不足时靠右对齐。 */
export function sparklineSvg(values: readonly number[], color: string, w = SPARKLINE_WIDTH): string {
  const h = SPARKLINE_HEIGHT;
  const inset = 1.6;
  const innerW = w - inset * 2;
  const innerH = h - inset * 2;
  const shown = values.slice(-SPARKLINE_PILL_SLOTS);
  const barW = innerW / SPARKLINE_PILL_SLOTS;
  const start = SPARKLINE_PILL_SLOTS - shown.length;
  const bars: string[] = [];
  for (let i = 0; i < shown.length; i++) {
    const ratio = clamp01(shown[i] ?? 0);
    const bh = Math.max(ratio > 0 ? 1.2 : 0, ratio * innerH);
    if (bh <= 0) continue;
    const x = inset + (start + i) * barW;
    const y = inset + innerH - bh;
    bars.push(
      `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(Math.max(0.7, barW - 0.35))}" height="${fmt(bh)}" rx="0.4" fill="${color}"/>`,
    );
  }
  return pillShell(w, h, `s${hashColor(color)}`, bars.join(""));
}

/** CPU 竖胶囊：蓝用户在下、粉系统叠上。 */
export function stackedSparklineSvg(values: readonly CpuBar[]): string {
  const w = SPARKLINE_WIDTH;
  const h = SPARKLINE_HEIGHT;
  const inset = 1.6;
  const innerW = w - inset * 2;
  const innerH = h - inset * 2;
  const shown = values.slice(-SPARKLINE_PILL_SLOTS);
  const barW = innerW / SPARKLINE_PILL_SLOTS;
  const start = SPARKLINE_PILL_SLOTS - shown.length;
  const bars: string[] = [];
  for (let i = 0; i < shown.length; i++) {
    const user = clamp01(shown[i]?.user ?? 0);
    const sys = clamp01(shown[i]?.sys ?? 0);
    const uh = user * innerH;
    const sh = sys * innerH;
    const x = inset + (start + i) * barW;
    const bw = Math.max(0.7, barW - 0.35);
    const base = inset + innerH;
    if (uh > 0)
      bars.push(
        `<rect x="${fmt(x)}" y="${fmt(base - uh)}" width="${fmt(bw)}" height="${fmt(uh)}" fill="${SPARK_USER}"/>`,
      );
    if (sh > 0)
      bars.push(
        `<rect x="${fmt(x)}" y="${fmt(base - uh - sh)}" width="${fmt(bw)}" height="${fmt(sh)}" fill="${SPARK_SYS}"/>`,
      );
  }
  return pillShell(w, h, "scpu", bars.join(""));
}

/** 面板用宽直方。 */
export function stackedHistSvg(values: readonly CpuBar[], w = 360, h = 88): string {
  if (!values.length) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" rx="8" fill="#2c2c2e"/></svg>`;
  }
  const barW = w / values.length;
  const bars: string[] = [];
  for (let i = 0; i < values.length; i++) {
    const user = clamp01(values[i]?.user ?? 0);
    const sys = clamp01(values[i]?.sys ?? 0);
    const uh = user * h;
    const sh = sys * h;
    const x = i * barW;
    const bw = Math.max(0.8, barW - 0.7);
    if (uh > 0)
      bars.push(`<rect x="${fmt(x)}" y="${fmt(h - uh)}" width="${fmt(bw)}" height="${fmt(uh)}" fill="${SPARK_USER}"/>`);
    if (sh > 0)
      bars.push(
        `<rect x="${fmt(x)}" y="${fmt(h - uh - sh)}" width="${fmt(bw)}" height="${fmt(sh)}" fill="${SPARK_SYS}"/>`,
      );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" rx="8" fill="#2c2c2e"/>${bars.join("")}
</svg>`;
}

/** 性能核蓝、能效核粉，按列折行。 */
export function coresGridSvg(pCores: readonly number[], eCores: readonly number[], cols = 7): string {
  const cell = 28;
  const all = [
    ...pCores.map((ratio) => ({ ratio, color: SPARK_USER })),
    ...eCores.map((ratio) => ({ ratio, color: SPARK_SYS })),
  ];
  const rows = Math.max(1, Math.ceil(all.length / cols));
  const w = cols * cell;
  const h = rows * cell;
  const rings = all
    .map((core, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = col * cell + cell / 2;
      const cy = row * cell + cell / 2;
      const r = 9.2;
      const c = 2 * Math.PI * r;
      const len = clamp01(core.ratio) * c;
      const track = `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${r}" fill="none" stroke="#5c5c5e" stroke-width="2.6"/>`;
      if (len < 0.2) return track;
      return `${track}<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${r}" fill="none" stroke="${core.color}" stroke-width="2.6" stroke-dasharray="${fmt(len)} ${fmt(c - len)}" transform="rotate(-90 ${fmt(cx)} ${fmt(cy)})" stroke-linecap="round"/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${rings}</svg>`;
}

/** 单色进度环，给 Pressure / CPU 菜单项图标。ratio 未知时只画虚线底轨，区别于真实的 0。 */
export function ringSvg(ratio: number | undefined, color: string): string {
  if (ratio === undefined) return stackedRingSvg([], true);
  return stackedRingSvg([{ ratio, color }]);
}

/** 内存环：App / Wired / Compressed 按物理内存占比分段，剩余为底轨。 */
export function stackedRingSvg(parts: readonly { ratio: number; color: string }[], unknown = false): string {
  const r = 6.15;
  const c = 2 * Math.PI * r;
  const sw = 2.55;
  let offset = 0;
  const arcs = parts
    .map((part) => {
      const len = clamp01(part.ratio) * c;
      if (len < 0.2) return "";
      const circle = `<circle cx="8" cy="8" r="${r}" fill="none" stroke="${part.color}" stroke-width="${sw}" stroke-dasharray="${fmt(len)} ${fmt(c - len)}" stroke-dashoffset="${fmt(-offset)}" transform="rotate(-90 8 8)"/>`;
      offset += len;
      return circle;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
  <circle cx="8" cy="8" r="${r}" fill="none" stroke="${TRACK}" stroke-width="${sw}"${unknown ? ' stroke-dasharray="1.8 2.2"' : ""}/>
  ${arcs}
</svg>`;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function fmt(value: number): string {
  return value.toFixed(2);
}

function hashColor(color: string): string {
  return color.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "x";
}
