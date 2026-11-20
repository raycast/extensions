import { BIG_ARROWS } from "./arrows";
import { BOX, BoxStyle, renderBox } from "./box";
import { stack } from "./layout";
import { displayWidth, padCenter, splitLines } from "./width";

// ► and ▼ rather than ▶: ▶ has an emoji form that some renderers draw 2 columns wide.
// A bare > only between spaces, and not before a number or a number with a unit: `x >= 5`, `<div>`,
// `count > 0` and `Storage > 5GB` stay whole, `Draft > Review` and `Setup > 2FA` split. A list number
// (`2. Do`, `2) Do`) is a step, not a quantity. It's a guess: an arrow in a flow and a comparison in
// a step look the same.
const QUANTITY = String.raw`[-+]?[$€£]?\.?\d[\d,.]*\s?(?:%|[kKMGTP]i?B|[kKMG]|ms|s|sec|min|h|hrs?|d|days?|px|x)?`;
const ORDINAL = String.raw`\d+[.)]\s`;
const ARROW = String.raw`\s*(?:-+>|=+>|→|⇒|⟶|►|▶)\s*`;
const SEPARATOR = new RegExp(String.raw`${ARROW}|\s+>\s+(?:(?=${ORDINAL})|(?!${QUANTITY}(?![\p{L}\d])))`, "u");
// Two or more bare `>` and no other arrow is a chain (`HD > 4K > 8K`, `Setup > 4K HDMI > Done`), so
// every `>` splits. Not when a quantity after a `>` joins another condition (`RAM > 5GB and disk >
// 10GB`). A line that uses `->` keeps its bare `>` as comparisons (`Plan -> Check count > 0 -> Ship`).
const CHAIN = new RegExp(String.raw`${ARROW}|\s+>\s+`, "u");
const CONDITION = new RegExp(String.raw`^${QUANTITY}(?![\p{L}\d])\s+(?:and|or|&&|\|\|)\s`, "iu");
const isChain = (line: string) => {
  const pieces = line.split(/\s+>\s+/);
  return pieces.length > 2 && !new RegExp(ARROW, "u").test(line) && !pieces.slice(1).some((p) => CONDITION.test(p));
};

/** Steps come from `A > B -> C → D` on one line, or one step per line (which can chain too). */
export function parseFlow(input: string): string[] {
  const lines = splitLines(input)
    .map((l) => l.trim())
    .filter(Boolean);
  const parts = lines.flatMap((l) => l.split(isChain(l) ? CHAIN : SEPARATOR));
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
