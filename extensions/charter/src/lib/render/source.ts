import { CHARTS } from "../../data/charts";

export type SourceKind = "mermaid" | "echarts";

export interface ChartSource {
  kind: SourceKind;
  text: string;
}

/**
 * First-line keywords Mermaid accepts that the catalog does not list under
 * a type of its own: aliases, older spellings and the non-beta forms.
 */
const EXTRA_MERMAID_KEYWORDS = [
  "graph",
  "stateDiagram",
  "C4Container",
  "C4Component",
  "C4Dynamic",
  "C4Deployment",
  "zenuml",
  "sankey",
  "xychart",
  "block",
  "packet",
  "architecture",
  "radar",
  "treemap",
  "treeView",
  "swimlane",
  "venn",
  "ishikawa",
  "wardley",
  "cynefin",
  "usecase",
  "info",
];

const MERMAID_KEYWORDS = new Set(
  [...CHARTS.flatMap((chart) => (chart.mermaid ? [chart.mermaid.keyword] : [])), ...EXTRA_MERMAID_KEYWORDS].map((k) =>
    k.toLowerCase(),
  ),
);

/** Drops a surrounding ``` fence, with or without a language tag, so text copied from a chat renders as is. */
function stripFence(text: string): string {
  const match = text.trim().match(/^```[^\n]*\n([\s\S]*?)\n?```$/);
  return (match ? match[1] : text).trim();
}

function firstToken(text: string): string | undefined {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("%%")) continue;
    return trimmed.split(/[\s:;{]/)[0];
  }
  return undefined;
}

function isEchartsOption(text: string): boolean {
  if (!text.startsWith("{")) return false;
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null && "series" in parsed;
  } catch {
    return false;
  }
}

/** Mermaid when the first line opens with a diagram keyword, ECharts when it is JSON with a series key. */
export function detectSource(raw: string | undefined | null): ChartSource | undefined {
  if (!raw) return undefined;
  const text = stripFence(raw);
  if (!text) return undefined;
  if (isEchartsOption(text)) return { kind: "echarts", text };
  const token = firstToken(text);
  if (token && (MERMAID_KEYWORDS.has(token.toLowerCase()) || text.startsWith("%%{"))) return { kind: "mermaid", text };
  return undefined;
}

export function sourceLabel(source: ChartSource): string {
  return source.kind === "mermaid" ? "Mermaid" : "ECharts";
}
