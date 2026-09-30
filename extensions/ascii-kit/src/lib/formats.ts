import { BannerOptions, renderBanner } from "./banner";
import { renderBox, renderTitledBox } from "./box";
import { parseCallouts, renderCallouts } from "./callouts";
import { parseSeries, renderBars, renderColumns, renderLineChart, renderSparkline } from "./chart";
import { renderFlowHorizontal, renderFlowInline, renderFlowVertical, renderFlowVerticalHeavy } from "./flow";
import { renderNested } from "./nested";
import { renderOrgChart } from "./orgchart";
import {
  looksLikeTimeline,
  parseGantt,
  parseTimeline,
  renderGantt,
  renderKanban,
  renderTimelineHorizontal,
  renderTimelineVertical,
} from "./planning";
import { MESSAGE, parseSequence, renderSequence } from "./sequence";
import { STYLE_CAVEAT, TextStyle, styleText } from "./textstyle";
import { parseTable, renderTable } from "./table";
import { TreeNode, parseTree, renderTree } from "./tree";
import { parseFlow } from "./flow";
import { splitLines } from "./width";

export type Kind = "tree" | "box" | "table" | "flow" | "sequence" | "chart" | "plan" | "code" | "text";

export interface Format {
  id: string;
  kind: Kind;
  title: string;
  render: (input: string) => string;
  /** A format-specific reason it can't draw the input, on top of its kind's. */
  unusable?: (input: string) => string | undefined;
  /** Shown under the preview: a trade-off worth knowing before pasting. */
  caveat?: string;
}

const banner = (id: string, title: string, opts: BannerOptions): Format => ({
  id,
  kind: "text",
  title,
  render: (s) => renderBanner(s, opts),
  unusable: (s) =>
    renderBanner(s, opts).trim() ? undefined : "Only letters, digits and . , ! ? - : ' / + have banner glyphs.",
});

const styled = (id: string, title: string, style: TextStyle): Format => ({
  id,
  kind: "text",
  title,
  render: (s) => styleText(s, style),
  caveat: STYLE_CAVEAT,
});

const noNegatives = (s: string) =>
  parseSeries(s)?.values.some((v) => v < 0)
    ? "Bars start at zero, so negative values can't be drawn: use Line chart."
    : undefined;

const needsGantt = (s: string) =>
  parseGantt(s) ? undefined : "Needs `task start length` or `task 2-4` rows, all of them.";
const needsMilestones = (s: string) => (parseTimeline(s).length < 2 ? "Needs at least two milestones." : undefined);
const needsCards = (s: string) =>
  splitLines(s.trim()).length < 2 ? "Needs a header row of column names and at least one row of cards." : undefined;

const needsBody = (s: string) =>
  splitLines(s.trim()).length < 2 ? "Needs a title line and at least one line under it." : undefined;

export const FORMATS: Format[] = [
  { id: "tree-light", kind: "tree", title: "Tree · light", render: (s) => renderTree(s, "light") },
  { id: "tree-rounded", kind: "tree", title: "Tree · rounded", render: (s) => renderTree(s, "rounded") },
  { id: "tree-heavy", kind: "tree", title: "Tree · heavy", render: (s) => renderTree(s, "heavy") },
  { id: "tree-ascii", kind: "tree", title: "Tree · plain ASCII", render: (s) => renderTree(s, "ascii") },
  { id: "tree-org", kind: "tree", title: "Tree · top-down (org chart)", render: renderOrgChart },
  { id: "tree-nested", kind: "tree", title: "Tree · nested boxes", render: renderNested },
  { id: "box-light", kind: "box", title: "Box · light", render: (s) => renderBox(s, { style: "light" }) },
  { id: "box-rounded", kind: "box", title: "Box · rounded", render: (s) => renderBox(s, { style: "rounded" }) },
  { id: "box-heavy", kind: "box", title: "Box · heavy", render: (s) => renderBox(s, { style: "heavy" }) },
  { id: "box-double", kind: "box", title: "Box · double", render: (s) => renderBox(s, { style: "double" }) },
  { id: "box-titled", kind: "box", title: "Box · titled", render: (s) => renderTitledBox(s), unusable: needsBody },
  {
    id: "box-titled-rounded",
    kind: "box",
    title: "Box · titled, rounded",
    render: (s) => renderTitledBox(s, "rounded"),
    unusable: needsBody,
  },
  {
    id: "box-titled-heavy",
    kind: "box",
    title: "Box · titled, heavy",
    render: (s) => renderTitledBox(s, "heavy"),
    unusable: needsBody,
  },
  { id: "table-light", kind: "table", title: "Table · box", render: (s) => renderTable(s, "light") },
  { id: "table-rounded", kind: "table", title: "Table · rounded", render: (s) => renderTable(s, "rounded") },
  { id: "table-plain", kind: "table", title: "Table · plain", render: (s) => renderTable(s, "plain") },
  { id: "table-markdown", kind: "table", title: "Table · markdown", render: (s) => renderTable(s, "markdown") },
  { id: "table-kanban", kind: "table", title: "Table · kanban board", render: renderKanban, unusable: needsCards },
  { id: "flow-inline", kind: "flow", title: "Flow · inline arrows", render: (s) => renderFlowInline(s) },
  { id: "flow-horizontal", kind: "flow", title: "Flow · boxes across", render: (s) => renderFlowHorizontal(s) },
  { id: "flow-vertical", kind: "flow", title: "Flow · boxes down", render: (s) => renderFlowVertical(s) },
  {
    id: "flow-vertical-heavy",
    kind: "flow",
    title: "Flow · boxes down, heavy arrows",
    render: (s) => renderFlowVerticalHeavy(s),
  },
  { id: "sequence", kind: "sequence", title: "Sequence · lanes", render: (s) => renderSequence(s) },
  { id: "chart-bars", kind: "chart", title: "Chart · bars", render: (s) => renderBars(s), unusable: noNegatives },
  {
    id: "chart-columns",
    kind: "chart",
    title: "Chart · columns",
    render: (s) => renderColumns(s),
    unusable: noNegatives,
  },
  { id: "chart-line", kind: "chart", title: "Chart · line", render: (s) => renderLineChart(s) },
  { id: "chart-sparkline", kind: "chart", title: "Chart · sparkline", render: (s) => renderSparkline(s) },
  { id: "plan-gantt", kind: "plan", title: "Plan · Gantt", render: (s) => renderGantt(s), unusable: needsGantt },
  {
    id: "plan-timeline",
    kind: "plan",
    title: "Plan · timeline across",
    render: renderTimelineHorizontal,
    unusable: needsMilestones,
  },
  {
    id: "plan-timeline-vertical",
    kind: "plan",
    title: "Plan · timeline down",
    render: renderTimelineVertical,
    unusable: needsMilestones,
  },
  { id: "code-callouts", kind: "code", title: "Code · callouts", render: renderCallouts },
  styled("text-bold", "Text · bold", "bold"),
  styled("text-italic", "Text · italic", "italic"),
  styled("text-bold-italic", "Text · bold italic", "boldItalic"),
  styled("text-mono", "Text · monospace", "mono"),
  styled("text-strike", "Text · strikethrough", "strike"),
  styled("text-underline", "Text · underline", "underline"),
  banner("text-banner", "Text · banner, small caps", { size: "small" }),
  banner("text-banner-tall", "Text · banner, tall caps", { size: "tall" }),
  banner("text-banner-tall-mixed", "Text · banner, tall, mixed case", { size: "tall", mixedCase: true }),
];

export const KIND_TITLES: Record<Kind, string> = {
  tree: "Tree",
  box: "Box",
  table: "Table",
  flow: "Flow",
  sequence: "Sequence",
  chart: "Chart",
  plan: "Plan",
  code: "Code",
  text: "Text",
};

export const EXPECTS: Record<Kind, string> = {
  tree: "an indented or bulleted list (tabs or spaces), or an existing tree to restyle",
  box: "any text; a line of `---` becomes a divider",
  table: "rows separated by tabs (from a spreadsheet), pipes, 2+ spaces or commas; first row is the header",
  flow: "`A > B > C` (also `->`, `→`, `=>`), or one step per line",
  sequence: "one message per line: `A -> B: label`, `B --> A: reply` for a dashed return",
  chart:
    "`label value` rows (tab, colon or spaces before the number; `$`, `%` and `1,200` are fine), or one line of numbers",
  plan: "`task start length` or `task 2-4` rows for a Gantt chart (a first line like `Sprint` names the unit); `date: label` rows for a timeline",
  code: "code lines, then `target: note` lines whose target appears in the code (wrap it in backticks if it contains a colon)",
  text: "any text: the styles work letter by letter; the banner has A–Z, 0–9 and basic punctuation",
};

const countNodes = (nodes: TreeNode[]): number => nodes.reduce((n, c) => n + 1 + countNodes(c.children), 0);

/**
 * Why a kind can't draw this input, or undefined if it can. Without this, a one-line input
 * "renders" as a tree that is just the line itself, which looks like a broken preview.
 */
export function unusable(kind: Kind, input: string): string | undefined {
  switch (kind) {
    case "tree":
      return countNodes(parseTree(input)) < 2 ? "Only one item found: a tree needs at least two lines." : undefined;
    case "table":
      return (parseTable(input)[0]?.length ?? 0) < 2 ? "Only one column found." : undefined;
    case "flow":
      return parseFlow(input).length < 2 ? "Only one step found." : undefined;
    case "sequence":
      return parseSequence(input).messages.length === 0 ? "No messages found." : undefined;
    case "box":
      return input.trim() ? undefined : "The input is empty.";
    case "chart":
      return parseSeries(input) ? undefined : "Not every line ends in a number.";
    case "code":
      return parseCallouts(input) ? undefined : "No `target: note` lines whose target appears in the code above.";
    case "text":
      return input.trim() ? undefined : "The input is empty.";
    case "plan":
      return parseGantt(input) || parseTimeline(input).length >= 2 ? undefined : "Needs two or more rows.";
  }
}

/** Why this format can't draw the input: its kind's reason first, then its own. */
export function formatUnusable(f: Format, input: string): string | undefined {
  return unusable(f.kind, input) ?? f.unusable?.(input);
}

/** Best guess at what the input is meant to become, most likely first. */
export function detectKinds(input: string): Kind[] {
  const lines = splitLines(input).filter((l) => l.trim());
  const order: Kind[] = [];
  const add = (k: Kind) => !order.includes(k) && order.push(k);

  const indents = new Set(lines.map((l) => l.match(/^[\t ]*/)?.[0].length ?? 0));
  const bulleted = lines.filter((l) => /^\s*(?:[-*+•]|\d+[.)])\s/.test(l)).length;
  const drawn = lines.some((l) => /[├└┣┗╰]/.test(l));
  const tabular =
    lines.length > 1 &&
    (lines.some((l) => l.includes("\t")) ||
      lines.every((l) => l.includes("|")) ||
      lines.filter((l) => /\S {2,}\S/.test(l)).length >= lines.length - 1);
  const arrows = /\s(?:-+>|=+>|→|⇒|>)\s/.test(input);
  const messages = lines.filter((l) => MESSAGE.test(l) && l.includes(":")).length;

  const series = parseSeries(input);

  if (parseCallouts(input)) add("code");
  if (messages > 0 && messages === lines.length) add("sequence");
  // Gantt rows also end in numbers, so they must win over charts.
  if (parseGantt(input) || looksLikeTimeline(input)) add("plan");
  // Every line ends in a number and nothing is nested: a chart. With a header row, a table first.
  if (series && !series.header && indents.size === 1) add("chart");
  if (arrows && lines.length === 1) add("flow");
  if (drawn || indents.size > 1 || bulleted === lines.length) add("tree");
  if (tabular) add("table");
  if (series) add("chart");
  if (arrows) add("flow");
  add("box");
  add("tree");
  add("table");
  add("flow");
  if (messages > 0) add("sequence");
  add("chart");
  add("plan");
  add("code");
  // Text styles are never the guess: they're a deliberate choice.
  add("text");
  return order;
}
