import { alignRows } from "./columns";
import { displayWidth, expandTabs, padCenter, padEnd, splitLines } from "./width";

export type BoxStyle = "light" | "rounded" | "heavy" | "double" | "ascii";

export interface BoxChars {
  tl: string;
  tr: string;
  bl: string;
  br: string;
  h: string;
  v: string;
  /** Left and right ends of a divider row. */
  ml: string;
  mr: string;
  /** Top, bottom and middle column joints, used by tables. */
  tj: string;
  bj: string;
  x: string;
}

export const BOX: Record<BoxStyle, BoxChars> = {
  light: { tl: "┌", tr: "┐", bl: "└", br: "┘", h: "─", v: "│", ml: "├", mr: "┤", tj: "┬", bj: "┴", x: "┼" },
  rounded: { tl: "╭", tr: "╮", bl: "╰", br: "╯", h: "─", v: "│", ml: "├", mr: "┤", tj: "┬", bj: "┴", x: "┼" },
  heavy: { tl: "┏", tr: "┓", bl: "┗", br: "┛", h: "━", v: "┃", ml: "┣", mr: "┫", tj: "┳", bj: "┻", x: "╋" },
  double: { tl: "╔", tr: "╗", bl: "╚", br: "╝", h: "═", v: "║", ml: "╠", mr: "╣", tj: "╦", bj: "╩", x: "╬" },
  ascii: { tl: "+", tr: "+", bl: "+", br: "+", h: "-", v: "|", ml: "+", mr: "+", tj: "+", bj: "+", x: "+" },
};

/** A line that is only dashes (`---`, `———`, `───`) becomes a divider inside the box. */
const DIVIDER = /^\s*[-—─=]{3,}\s*$/u;

export interface BoxOptions {
  style?: BoxStyle;
  align?: "left" | "center";
  /** Minimum inner width, so stacked boxes can share a width. */
  minWidth?: number;
  /** Drawn into the top border: `┌─ Title ─────┐`, the usual TUI panel style. */
  title?: string;
  /** Minimum number of body rows, so boxes side by side can share a height. */
  minHeight?: number;
}

/** Tab-separated lines become aligned columns; other lines pass through untouched. */
function alignTabbed(lines: string[]): string[] {
  const tabbed = lines.flatMap((l, i) => (l.includes("\t") ? [i] : []));
  if (!tabbed.length) return lines;
  const aligned = alignRows(tabbed.map((i) => lines[i].split("\t").map((c) => c.trim())));
  const out = [...lines];
  tabbed.forEach((lineIndex, k) => (out[lineIndex] = aligned[k]));
  return out;
}

/** Wraps text in a box sized to its widest line. Blank lines at the edges are dropped. */
export function renderBox(input: string, opts: BoxOptions = {}): string {
  const c = BOX[opts.style ?? "light"];
  const pad = opts.align === "center" ? padCenter : padEnd;
  const lines = alignTabbed(splitLines(input)).map((l) => expandTabs(l).trimEnd());
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  if (!lines.length) lines.push("");
  while (lines.length < (opts.minHeight ?? 0)) lines.push("");

  const title = opts.title?.trim();
  const titleWidth = title ? displayWidth(title) + 2 : 0;
  const inner = Math.max(opts.minWidth ?? 0, titleWidth, ...lines.filter((l) => !DIVIDER.test(l)).map(displayWidth));
  const rule = c.h.repeat(inner + 2);
  const top = title ? c.tl + c.h + ` ${title} ` + c.h.repeat(inner + 1 - titleWidth) + c.tr : c.tl + rule + c.tr;
  const body = lines.map((l) => (DIVIDER.test(l) ? c.ml + rule + c.mr : `${c.v} ${pad(l, inner)} ${c.v}`));
  return [top, ...body, c.bl + rule + c.br].join("\n");
}

/** The first line becomes the title in the top border; a `---` line right after it is dropped. */
export function renderTitledBox(input: string, style: BoxStyle = "light"): string {
  const lines = splitLines(input.trim());
  const rest = lines.slice(1);
  if (rest.length && DIVIDER.test(rest[0])) rest.shift();
  return renderBox(rest.join("\n"), { style, title: lines[0] });
}
