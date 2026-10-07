import { displayWidth, padCenter, padEnd, splitLines } from "./width";

const block = (text: string) => splitLines(text);
const widthOf = (lines: string[]) => Math.max(0, ...lines.map(displayWidth));

/**
 * Joins multi-line blocks side by side. `joint` goes between each pair and may itself span
 * several rows (a big arrow); it's centred vertically against the tallest block.
 */
export function sideBySide(blocks: string[], joint: string): string {
  const split = blocks.map(block);
  const jointLines = block(joint);
  const jointWidth = widthOf(jointLines);
  const height = Math.max(jointLines.length, ...split.map((b) => b.length));
  const widths = split.map(widthOf);
  const jointTop = Math.floor((height - jointLines.length) / 2);
  return Array.from({ length: height }, (_, row) => {
    const j = padEnd(jointLines[row - jointTop] ?? "", jointWidth);
    return split.map((b, i) => padEnd(b[row] ?? "", widths[i])).join(j);
  })
    .map((l) => l.trimEnd())
    .join("\n");
}

/** Stacks blocks top to bottom, each block and joint centred on the widest block. */
export function stack(blocks: string[], joint = ""): string {
  const all = [...blocks.map(block), block(joint)];
  const width = widthOf(all.flat());
  const centre = (lines: string[]) => {
    const w = widthOf(lines);
    const left = " ".repeat(Math.floor((width - w) / 2));
    return lines.map((l) => (left + padEnd(l, w)).trimEnd());
  };
  const out: string[] = [];
  blocks.forEach((b, i) => {
    out.push(...centre(block(b)));
    if (joint && i < blocks.length - 1) out.push(...centre(block(joint)));
  });
  return out.join("\n");
}

/** A drop shadow one column right and one row down, like a TUI modal. */
export function withShadow(text: string, shade = "░"): string {
  const lines = block(text);
  const width = widthOf(lines);
  return [
    padEnd(lines[0], width),
    ...lines.slice(1).map((l) => padEnd(l, width) + shade),
    " " + shade.repeat(width),
  ].join("\n");
}

/** Centres each line of `text` within `width` columns. */
export function centreLines(text: string, width: number): string {
  return block(text)
    .map((l) => padCenter(l, width).trimEnd())
    .join("\n");
}

/** Pads every line of a joint by `gap` spaces on both sides, so it doesn't touch the blocks. */
export function spaced(joint: string, gap = 1): string {
  const lines = block(joint);
  const w = widthOf(lines);
  const pad = " ".repeat(gap);
  return lines.map((l) => pad + padEnd(l, w) + pad).join("\n");
}
