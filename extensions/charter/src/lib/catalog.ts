import { SHADCN_BLOCKS } from "../data/shadcn";
import { SHADCN_VIEW } from "../data/urls";

export type Provider = "mermaid" | "shadcn" | "echarts";

/** The search-bar dropdown: every type with Mermaid first, or one library's view of the catalog. */
export type Lens = "all" | Provider;

export type Family = "flow" | "structure" | "hierarchy" | "quantity" | "time" | "geo" | "framework";

export interface MermaidSupport {
  /** The first line of the diagram, e.g. `radar-beta`. */
  keyword: string;
  /** Mermaid release that added the type. Absent means long-standing. */
  since?: string;
  docs: string;
  /** A complete, valid example, short enough to read at a glance. */
  template: string;
  /** Extra guidance for a model writing this type. */
  hint?: string;
}

export type ShadcnFamily = "area" | "bar" | "line" | "pie" | "radar" | "radial";

/** One registry block, pulled by scripts/shadcn.mjs. */
export interface ShadcnBlock {
  name: string;
  /** The part after the dash in the block's card title: "Horizontal", "Stacked", or "Default". */
  title: string;
  /** The component as the registry ships it. */
  source: string;
}

export interface ShadcnSupport {
  /** The chart family on ui.shadcn.com/charts, which is also the key into the pulled blocks. */
  family: ShadcnFamily;
  /** The block the catalog treats as this type's example, e.g. `chart-radar-default`. */
  block: string;
  docs: string;
}

/** A plain ECharts option: JSON-serializable, so no functions. */
export type EchartsOption = Record<string, unknown>;

export interface EchartsSupport {
  /** Series type in the ECharts option, e.g. `radar`. */
  series: string;
  docs: string;
  /** A complete, small option that draws the type. */
  option: EchartsOption;
  /** Extra guidance for a model writing this option. */
  hint?: string;
}

export interface ChartType {
  id: string;
  name: string;
  family: Family;
  synonyms: string[];
  /** One sentence: when to reach for it. */
  use: string;
  mermaid?: MermaidSupport;
  shadcn?: ShadcnSupport;
  echarts?: EchartsSupport;
  notes?: string;
}

export const PROVIDER_ORDER: Provider[] = ["mermaid", "shadcn", "echarts"];

/** Display names; shadcn is lowercase by its own convention. */
export const PROVIDER_TITLES: Record<Provider, string> = { mermaid: "Mermaid", shadcn: "shadcn", echarts: "ECharts" };

export function matchesLens(chart: ChartType, lens: Lens): boolean {
  return lens === "all" || Boolean(chart[lens]);
}

/** The provider whose content a view shows: the lens when the type has it, else the first present. */
export function lensProvider(chart: ChartType, lens: Lens): Provider {
  if (lens !== "all" && chart[lens]) return lens;
  return PROVIDER_ORDER.find((provider) => Boolean(chart[provider])) ?? "mermaid";
}

/** Providers that cannot draw the chart, in display order. */
export function missingProviders(chart: ChartType): Provider[] {
  return PROVIDER_ORDER.filter((provider) => !chart[provider]);
}

export function groupByFamily(charts: ChartType[]): Map<Family, ChartType[]> {
  const groups = new Map<Family, ChartType[]>();
  for (const chart of charts) {
    const group = groups.get(chart.family) ?? [];
    group.push(chart);
    groups.set(chart.family, group);
  }
  return groups;
}

export function docsUrl(chart: ChartType, provider: Provider): string | undefined {
  return chart[provider]?.docs;
}

/** "Mermaid 11.6+" for types with a known first release, "Mermaid" for long-standing ones. */
export function mermaidTag(chart: ChartType): string | undefined {
  if (!chart.mermaid) return undefined;
  return chart.mermaid.since ? `Mermaid ${chart.mermaid.since}+` : "Mermaid";
}

/** The keyword with its first release folded in: "radar-beta, 11.6+". */
export function mermaidLabel(chart: ChartType): string | undefined {
  if (!chart.mermaid) return undefined;
  return chart.mermaid.since ? `${chart.mermaid.keyword}, ${chart.mermaid.since}+` : chart.mermaid.keyword;
}

/**
 * What the tile says under the name. Under All the question is which libraries
 * draw it; under the Mermaid lens the version still matters; under the others
 * the picture and the name say it all.
 */
export function tileSubtitle(chart: ChartType, lens: Lens): string | undefined {
  if (lens === "all") {
    return PROVIDER_ORDER.filter((provider) => chart[provider])
      .map((provider) => PROVIDER_TITLES[provider])
      .join(", ");
  }
  if (lens === "mermaid" && chart.mermaid?.since) return mermaidTag(chart);
  return undefined;
}

export function shadcnAddCommand(block: string): string {
  return `npx shadcn@latest add ${block}`;
}

/** Every block in the type's family, the catalog's example first. */
export function shadcnVariants(chart: ChartType): ShadcnBlock[] {
  if (!chart.shadcn) return [];
  const blocks = SHADCN_BLOCKS[chart.shadcn.family];
  return [...blocks].sort((a, b) => Number(b.name === chart.shadcn?.block) - Number(a.name === chart.shadcn?.block));
}

function shadcnBlock(chart: ChartType): ShadcnBlock | undefined {
  return shadcnVariants(chart).find((block) => block.name === chart.shadcn?.block);
}

export function shadcnPreviewUrl(chart: ChartType): string | undefined {
  return chart.shadcn ? `${SHADCN_VIEW}/${chart.shadcn.block}` : undefined;
}

/** JSON with two-space indents, but arrays of plain values on one line, so data rows stay rows. */
export function formatOption(value: unknown, indent = ""): string {
  const inner = indent + "  ";
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (value.every((item) => item === null || typeof item !== "object")) {
      return `[${value.map((item) => JSON.stringify(item)).join(", ")}]`;
    }
    return `[\n${value.map((item) => inner + formatOption(item, inner)).join(",\n")}\n${indent}]`;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    const lines = entries.map(([key, item]) => `${inner}${JSON.stringify(key)}: ${formatOption(item, inner)}`);
    return `{\n${lines.join(",\n")}\n${indent}}`;
  }
  return JSON.stringify(value);
}

/** The provider's example as text: Mermaid syntax, the ECharts option as JSON, or the shadcn component. */
export function rawTemplate(chart: ChartType, provider: Provider): string | undefined {
  if (provider === "mermaid") return chart.mermaid?.template;
  if (provider === "echarts") return chart.echarts ? formatOption(chart.echarts.option) : undefined;
  return shadcnBlock(chart)?.source;
}

const FENCE_LANGUAGE: Record<Provider, string> = { mermaid: "mermaid", echarts: "json", shadcn: "tsx" };

/** The template inside a fence, ready to paste into a chat or a Markdown note. */
export function fencedTemplate(chart: ChartType, provider: Provider): string | undefined {
  const raw = rawTemplate(chart, provider);
  return raw === undefined ? undefined : "```" + FENCE_LANGUAGE[provider] + "\n" + raw + "\n```";
}

/** What to paste into a model conversation so it answers with this chart, drawn by this provider. */
export function promptSnippet(chart: ChartType, provider: Provider): string {
  const name = chart.name.toLowerCase();
  if (provider === "mermaid" && chart.mermaid) {
    const lines = [
      `Return the answer as a Mermaid ${name} chart (\`${chart.mermaid.keyword}\`) inside a \`\`\`mermaid fence.`,
    ];
    if (chart.mermaid.since) lines.push(`This type needs Mermaid ${chart.mermaid.since} or later.`);
    if (chart.mermaid.hint) lines.push(chart.mermaid.hint);
    lines.push("Follow this syntax exactly:", "", chart.mermaid.template);
    return lines.join("\n");
  }
  if (provider === "echarts" && chart.echarts) {
    const lines = [
      `Return the answer as an Apache ECharts option (JSON) using a \`${chart.echarts.series}\` series, inside a \`\`\`json fence.`,
      "Keep the option self-contained: data inline, short labels, no functions.",
    ];
    if (chart.echarts.hint) lines.push(chart.echarts.hint);
    const raw = rawTemplate(chart, "echarts");
    if (raw) lines.push("Shape it like this:", "", raw);
    return lines.join("\n");
  }
  if (provider === "shadcn" && chart.shadcn) {
    const lines = [
      `Return the answer as a shadcn/ui chart based on the \`${chart.shadcn.block}\` block (Recharts), as a React component with the data inline.`,
      `It installs with \`${shadcnAddCommand(chart.shadcn.block)}\`.`,
    ];
    const source = rawTemplate(chart, "shadcn");
    if (source) lines.push("Start from this component:", "", source);
    return lines.join("\n");
  }
  return `Return the answer as a ${name} chart.`;
}

/** Search keywords Raycast matches alongside the title. */
export function searchKeywords(chart: ChartType): string[] {
  const keywords = new Set<string>(chart.synonyms);
  keywords.add(chart.family);
  if (chart.mermaid) {
    keywords.add("mermaid");
    keywords.add(chart.mermaid.keyword);
  }
  if (chart.shadcn) {
    keywords.add("shadcn");
    keywords.add("recharts");
    keywords.add(chart.shadcn.block);
  }
  if (chart.echarts) {
    keywords.add("echarts");
    keywords.add(chart.echarts.series);
  }
  return [...keywords];
}
