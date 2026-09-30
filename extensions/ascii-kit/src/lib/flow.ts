import { BIG_ARROWS } from "./arrows";
import { BOX, BoxStyle, renderBox } from "./box";
import { stack } from "./layout";
import { displayWidth, padCenter, splitLines } from "./width";

// ► and ▼ rather than ▶: ▶ has an emoji form that some renderers draw 2 columns wide.
const ARROW = /\s*(?:-+>|=+>|→|⇒|⟶|►|▶)\s*/u;
// A bare > only between spaces, so `x >= 5` and `<div>` stay whole.
const ARROW_OR_GT = /\s*(?:-+>|=+>|→|⇒|⟶|►|▶)\s*|\s+>\s+/u;

/**
 * Steps come from `A > B -> C → D` on one line, or one step per line. With one step per line, a
 * bare > is part of the step (`count > 0`); only arrows split it further.
 */
export function parseFlow(input: string): string[] {
  const lines = splitLines(input)
    .map((l) => l.trim())
    .filter(Boolean);
  const parts = lines.length === 1 ? lines[0].split(ARROW_OR_GT) : lines.flatMap((l) => l.split(ARROW));
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** `A → B → C` */
export function renderFlowInline(input: string, arrow = "→"): string {
  return parseFlow(input).join(` ${arrow} `);
}

/** Boxes side by side, joined by arrows on the middle row. */
export function renderFlowHorizontal(input: string, style: BoxStyle = "light"): string {
  const c = BOX[style];
  const steps = parseFlow(input);
  const arrow = c.h.repeat(2) + "►";
  const gap = " ".repeat(displayWidth(arrow));
  const top: string[] = [];
  const mid: string[] = [];
  const bot: string[] = [];
  steps.forEach((s) => {
    const rule = c.h.repeat(displayWidth(s) + 2);
    top.push(c.tl + rule + c.tr);
    mid.push(`${c.v} ${s} ${c.v}`);
    bot.push(c.bl + rule + c.br);
  });
  return [top.join(gap), mid.join(arrow), bot.join(gap)].join("\n");
}

/** Equal-width boxes stacked top to bottom, joined by ▼ under a joint in the bottom edge. */
export function renderFlowVertical(input: string, style: BoxStyle = "light"): string {
  const c = BOX[style];
  const steps = parseFlow(input);
  const inner = Math.max(...steps.map(displayWidth)) + 2;
  // Keep the joint in the exact middle: an odd rule width has a single centre column.
  const width = inner % 2 ? inner : inner + 1;
  const half = (width - 1) / 2;
  const indent = " ".repeat(1 + half);
  const out: string[] = [];
  steps.forEach((s, i) => {
    const last = i === steps.length - 1;
    out.push(c.tl + c.h.repeat(width) + c.tr);
    out.push(c.v + padCenter(s, width) + c.v);
    out.push(last ? c.bl + c.h.repeat(width) + c.br : c.bl + c.h.repeat(half) + c.tj + c.h.repeat(half) + c.br);
    if (!last) out.push(indent + "▼");
  });
  return out.join("\n");
}

/** Equal-width boxes stacked top to bottom, joined by heavy ┃ ┃ ▼ arrows. */
export function renderFlowVerticalHeavy(input: string, style: BoxStyle = "light"): string {
  const steps = parseFlow(input);
  const widest = Math.max(...steps.map(displayWidth));
  // Odd inner width + 4 border/padding columns = odd box width: one exact centre column.
  const inner = widest % 2 ? widest : widest + 1;
  return stack(
    steps.map((s) => renderBox(s, { style, align: "center", minWidth: inner })),
    BIG_ARROWS.heavyDown,
  );
}
