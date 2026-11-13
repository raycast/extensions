// A small stacked bar chart (download below, upload above) as an SVG data URI for a Raycast markdown pane.
import type { Sample } from "./sample.ts";
import { buckets, fmt } from "./stats.ts";

const W = 420;
const H = 120;
const PAD_L = 4;
const PAD_R = 4;
const PAD_T = 20;
const PAD_B = 18;
const DOWN = "#4FB3F6";
const UP = "#F59E42";
const MUTED = "#8E8E93";

const label = (m: number) => (m < 60 ? `${Math.round(m)} min` : `${+(m / 60).toFixed(1)} h`);

export function chartMarkdown(
  samples: Sample[],
  now: number,
  windowMin: number,
  pick: (s: Sample) => [number, number],
  n = 48,
): string {
  const data = buckets(samples, now, windowMin, n, pick);
  const max = Math.max(1, ...data.map((d) => (d ? d[0] + d[1] : 0)));
  const slot = (W - PAD_L - PAD_R) / n;
  const bw = Math.max(1, slot - 1.5);
  const plotH = H - PAD_T - PAD_B;
  const bars: string[] = [];
  data.forEach((d, i) => {
    const x = PAD_L + i * slot;
    if (!d) {
      bars.push(
        `<rect x="${x.toFixed(1)}" y="${PAD_T + plotH - 1}" width="${bw.toFixed(1)}" height="1" fill="${MUTED}" opacity="0.35"/>`,
      );
      return;
    }
    const hd = (d[0] / max) * plotH;
    const hu = (d[1] / max) * plotH;
    if (hd > 0)
      bars.push(
        `<rect x="${x.toFixed(1)}" y="${(PAD_T + plotH - hd).toFixed(1)}" width="${bw.toFixed(1)}" height="${hd.toFixed(1)}" rx="1.5" fill="${DOWN}"/>`,
      );
    if (hu > 0)
      bars.push(
        `<rect x="${x.toFixed(1)}" y="${(PAD_T + plotH - hd - hu).toFixed(1)}" width="${bw.toFixed(1)}" height="${hu.toFixed(1)}" rx="1.5" fill="${UP}"/>`,
      );
  });
  const text = (x: number, y: number, t: string, anchor = "start", fill = MUTED) =>
    `<text x="${x}" y="${y}" font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="11" fill="${fill}" text-anchor="${anchor}">${t}</text>`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<line x1="${PAD_L}" y1="${PAD_T}" x2="${W - PAD_R}" y2="${PAD_T}" stroke="${MUTED}" stroke-opacity="0.25" stroke-dasharray="3 3"/>` +
    `<line x1="${PAD_L}" y1="${PAD_T + plotH}" x2="${W - PAD_R}" y2="${PAD_T + plotH}" stroke="${MUTED}" stroke-opacity="0.5"/>` +
    bars.join("") +
    text(PAD_L, 13, `peak ${fmt(max)} / ${label(windowMin / n)}`) +
    text(PAD_L, H - 4, `-${label(windowMin)}`) +
    text(W - PAD_R, H - 4, "now", "end") +
    text(W - PAD_R - 46, 13, "download", "end", DOWN) +
    text(W - PAD_R, 13, "upload", "end", UP) +
    `</svg>`;
  return `![chart](data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")})`;
}
