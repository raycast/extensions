import { FONT_SIZE, line, rect, text } from "./chart";
import { dayDate } from "./tokens";

/** One bar per day, as Lancetta's Usage pane draws a day's tokens. */
export type Bar = { day: string; value: number };

export const BARS_W = 640;
export const BARS_H = 260;
const PAD = { left: 10, right: 10, top: 34, bottom: 40 };

export function barsSVG(bars: Bar[], tint: string, dark: boolean, format: (n: number) => string): string {
  const ink = dark ? "#FFFFFF" : "#000000";
  const plotW = BARS_W - PAD.left - PAD.right;
  const plotH = BARS_H - PAD.top - PAD.bottom;
  const bottom = PAD.top + plotH;
  const max = Math.max(1, ...bars.map((b) => b.value));
  const slot = plotW / Math.max(1, bars.length);
  const gap = Math.min(6, slot * 0.25);
  const parts: string[] = [];

  parts.push(rect(PAD.left, PAD.top, plotW, plotH, ink, 0.05, 6));
  parts.push(line(PAD.left, PAD.top, PAD.left + plotW, PAD.top, ink, 0.15, 1, "4 4"));
  parts.push(text(PAD.left, PAD.top - 10, `max ${format(max)}`, ink, 0.55));

  // a label every few days, so they never run into each other
  const every = Math.max(1, Math.ceil(bars.length / 7));
  bars.forEach((bar, i) => {
    const h = (bar.value / max) * plotH;
    const x = PAD.left + i * slot + gap / 2;
    if (h > 0) parts.push(rect(x, bottom - h, slot - gap, h, tint, 0.9, Math.min(4, (slot - gap) / 3)));
    if ((bars.length - 1 - i) % every === 0) {
      const label = dayDate(bar.day).toLocaleDateString(undefined, { day: "numeric", month: "short" });
      // the last label ends at its bar's right edge, so it is never cut by the drawing's
      const last = i === bars.length - 1;
      parts.push(
        text(
          last ? x + slot - gap : x + (slot - gap) / 2,
          bottom + 26,
          label,
          ink,
          0.5,
          FONT_SIZE - 2,
          last ? "end" : "middle",
        ),
      );
    }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${BARS_W}" height="${BARS_H}" viewBox="0 0 ${BARS_W} ${BARS_H}">${parts.join("")}</svg>`;
}
