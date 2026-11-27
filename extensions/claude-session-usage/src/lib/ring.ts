export const AMBER = "#F5A524";
export const RED = "#F31260";
export const GREEN = "#34C759";

export type Arc = { pct: number; color?: string };

export type RingOptions = {
  outer?: Arc;
  inner?: Arc;
  error?: boolean;
};

export type IconPair = { light: string; dark: string };

const SIZE = 36;
const C = SIZE / 2;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

export function arcLength(pct: number, r: number): number | "full" | null {
  const p = Math.max(0, Math.min(100, pct));
  if (p <= 0) return null;
  if (p >= 99.5) return "full";
  return round3((2 * Math.PI * r * p) / 100);
}

function circle(r: number, width: number, stroke: string, extra = ""): string {
  return `<circle cx="${C}" cy="${C}" r="${r}" fill="none" stroke="${stroke}" stroke-width="${width}"${extra}/>`;
}

function ring(arc: Arc | undefined, r: number, width: number, fg: string): string {
  const track = circle(r, width, fg, ` stroke-opacity="0.25"`);
  const len = arc ? arcLength(arc.pct, r) : null;
  if (!arc || len === null) return track;
  const color = arc.color ?? fg;
  if (len === "full") return track + circle(r, width, color);
  const dash = ` stroke-linecap="round" stroke-dasharray="${len} ${round3(2 * Math.PI * r)}" transform="rotate(-90 ${C} ${C})"`;
  return track + circle(r, width, color, dash);
}

export function ringSvg(o: RingOptions, fg: string): string {
  let body: string;
  if (o.error) {
    body =
      ring(undefined, 13, 6, fg) +
      `<rect x="16.25" y="9.5" width="3.5" height="11" rx="1.75" fill="${fg}"/>` +
      `<circle cx="${C}" cy="25.25" r="2" fill="${fg}"/>`;
  } else if (o.outer) {
    body = ring(o.outer, 14.5, 4.5, fg) + ring(o.inner, 8, 4.5, fg);
  } else {
    body = ring(o.inner, 13, 6, fg);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">${body}</svg>`;
}

export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export function ringIcon(o: RingOptions): IconPair {
  return {
    light: svgDataUri(ringSvg(o, "#000000")),
    dark: svgDataUri(ringSvg(o, "#FFFFFF")),
  };
}

export function colorFor(pct: number, warn: number, crit: number): string | undefined {
  if (pct >= 100 || pct >= crit) return RED;
  if (pct >= warn) return AMBER;
  return GREEN;
}
