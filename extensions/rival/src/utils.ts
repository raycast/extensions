// --------------------------------------------------------------------------
// Rival Raycast Extension - Formatting & Utility Functions
// --------------------------------------------------------------------------

import { Color, Icon, Image } from "@raycast/api";
import { PROVIDER_COLORS, PROVIDER_NAMES, RIVAL_BASE } from "./constants.js";
import type { FilterCategory, LensModel, SortKey } from "./types.js";

// --------------------------------------------------------------------------
// Number formatting
// --------------------------------------------------------------------------

/**
 * Formats a number with commas. 1247 -> "1,247"
 */
export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/**
 * Formats a dollar amount. Handles sub-cent values gracefully.
 * 2 -> "$2.00", 0.075 -> "$0.075", 0 -> "Free"
 */
export function formatPrice(n: number): string {
  if (n === 0) return "Free";
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(4)}`;
}

/**
 * Formats a context window. 1048576 -> "1M tokens", 200000 -> "200K tokens"
 */
export function formatContext(tokens: number): string {
  if (tokens >= 1_000_000) {
    const m = tokens / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M tokens`;
  }
  if (tokens >= 1_000) {
    const k = tokens / 1_000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K tokens`;
  }
  return `${formatNumber(tokens)} tokens`;
}

/**
 * Formats context for compact display in accessories. "1M" instead of "1M tokens"
 */
export function formatContextShort(tokens: number): string {
  if (tokens >= 1_000_000) {
    const m = tokens / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M ctx`;
  }
  if (tokens >= 1_000) {
    const k = tokens / 1_000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K ctx`;
  }
  return `${tokens} ctx`;
}

/**
 * Formats a percentage. 72.3 -> "72.3%"
 */
export function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`;
}

// --------------------------------------------------------------------------
// Provider helpers
// --------------------------------------------------------------------------

/**
 * Returns the human-readable provider name or title-cases the slug.
 */
export function getProviderName(slug: string): string {
  return PROVIDER_NAMES[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}

/**
 * Returns a tinted circle icon for the provider, falling back to a neutral gray.
 */
export function getProviderIcon(provider: string): Image.ImageLike {
  const hex = PROVIDER_COLORS[provider];
  if (hex) {
    return { source: Icon.CircleFilled, tintColor: hex };
  }
  return { source: Icon.CircleFilled, tintColor: Color.SecondaryText };
}

// --------------------------------------------------------------------------
// Pricing string helpers
// --------------------------------------------------------------------------

/**
 * One-liner pricing string: "$2.00 / $8.00 per 1M" or "Price unavailable"
 */
export function pricingOneLiner(model: LensModel): string {
  if (!model.pricing) return "Price unavailable";
  const { input, output } = model.pricing;
  if (input === 0 && output === 0) return "Free";
  return `${formatPrice(input)} in / ${formatPrice(output)} out per 1M`;
}

/**
 * Short pricing for accessories: "$2.00/$8.00"
 */
export function pricingShort(model: LensModel): string {
  if (!model.pricing) return "No price";
  const { input, output } = model.pricing;
  if (input === 0 && output === 0) return "Free";
  return `${formatPrice(input)}/${formatPrice(output)}`;
}

// --------------------------------------------------------------------------
// URL builders
// --------------------------------------------------------------------------

export function modelUrl(id: string): string {
  return `${RIVAL_BASE}/models/${id}`;
}

export function compareUrl(a: string, b: string): string {
  return `${RIVAL_BASE}/compare/${a}/${b}`;
}

export function labUrl(): string {
  return `${RIVAL_BASE}/app/lab`;
}

// --------------------------------------------------------------------------
// Detail markdown builders
// --------------------------------------------------------------------------

/**
 * Builds the rich markdown string shown in the detail sidebar for a model.
 */
export function buildModelDetailMarkdown(model: LensModel): string {
  const provider = getProviderName(model.provider);
  const lines: string[] = [];

  // Header
  lines.push(`# ${model.name}`);

  const headerParts: string[] = [`**${provider}**`];
  if (model.rank != null) headerParts.push(`Rank **#${model.rank}**`);
  if (model.score != null)
    headerParts.push(`Score **${model.score.toFixed(1)}**`);
  lines.push(headerParts.join("  ·  "));

  lines.push("");
  lines.push("---");
  lines.push("");

  // Specs table
  lines.push("## Specs");
  lines.push("| | |");
  lines.push("|---|---|");

  if (model.ctx != null) {
    lines.push(`| Context | ${formatContext(model.ctx)} |`);
  }
  if (model.pricing) {
    lines.push(`| Input | ${formatPrice(model.pricing.input)} / 1M tokens |`);
    lines.push(`| Output | ${formatPrice(model.pricing.output)} / 1M tokens |`);
  } else {
    lines.push("| Pricing | Unavailable |");
  }
  if (model.winRate != null) {
    lines.push(`| Win Rate | ${formatPercent(model.winRate)} |`);
  }
  if (model.duels != null) {
    lines.push(`| Duels | ${formatNumber(model.duels)} |`);
  }

  // Best for
  if (model.bestFor.length > 0) {
    lines.push("");
    lines.push("## Best For");
    lines.push(model.bestFor.join("  ·  "));
  }

  // Benchmarks
  if (model.benchmarks && Object.keys(model.benchmarks).length > 0) {
    lines.push("");
    lines.push("## Benchmarks");
    lines.push("| Benchmark | Score |");
    lines.push("|-----------|-------|");
    for (const [name, score] of Object.entries(model.benchmarks)) {
      lines.push(`| ${name} | ${score} |`);
    }
  }

  return lines.join("\n");
}

/**
 * Builds the side-by-side comparison markdown for two models.
 */
export function buildComparisonMarkdown(a: LensModel, b: LensModel): string {
  const lines: string[] = [];

  lines.push(`# ${a.name} vs ${b.name}`);
  lines.push("");
  lines.push("| | " + a.name + " | " + b.name + " |");
  lines.push("|---|---|---|");

  lines.push(
    `| Provider | ${getProviderName(a.provider)} | ${getProviderName(b.provider)} |`,
  );
  lines.push(
    `| Rank | ${a.rank != null ? "#" + a.rank : "Unranked"} | ${b.rank != null ? "#" + b.rank : "Unranked"} |`,
  );
  lines.push(
    `| Score | ${a.score != null ? a.score.toFixed(1) : "N/A"} | ${b.score != null ? b.score.toFixed(1) : "N/A"} |`,
  );
  lines.push(
    `| Context | ${a.ctx != null ? formatContext(a.ctx) : "N/A"} | ${b.ctx != null ? formatContext(b.ctx) : "N/A"} |`,
  );
  lines.push(
    `| Input Price | ${a.pricing ? formatPrice(a.pricing.input) + " / 1M" : "N/A"} | ${b.pricing ? formatPrice(b.pricing.input) + " / 1M" : "N/A"} |`,
  );
  lines.push(
    `| Output Price | ${a.pricing ? formatPrice(a.pricing.output) + " / 1M" : "N/A"} | ${b.pricing ? formatPrice(b.pricing.output) + " / 1M" : "N/A"} |`,
  );
  lines.push(
    `| Win Rate | ${a.winRate != null ? formatPercent(a.winRate) : "N/A"} | ${b.winRate != null ? formatPercent(b.winRate) : "N/A"} |`,
  );
  lines.push(
    `| Duels | ${a.duels != null ? formatNumber(a.duels) : "N/A"} | ${b.duels != null ? formatNumber(b.duels) : "N/A"} |`,
  );

  // Best for
  const aBestFor = a.bestFor.length > 0 ? a.bestFor.join(", ") : "N/A";
  const bBestFor = b.bestFor.length > 0 ? b.bestFor.join(", ") : "N/A";
  lines.push(`| Best For | ${aBestFor} | ${bBestFor} |`);

  // Verdict section
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Verdict");
  lines.push("");

  const verdictParts: string[] = [];

  // Rank comparison
  if (a.rank != null && b.rank != null) {
    const better = a.rank < b.rank ? a : b;
    const worse = a.rank < b.rank ? b : a;
    if (a.rank !== b.rank) {
      verdictParts.push(
        `${better.name} is ranked higher (#${better.rank} vs #${worse.rank})`,
      );
    } else {
      verdictParts.push(`Both are ranked #${a.rank}`);
    }
  }

  // Price comparison
  if (a.pricing && b.pricing) {
    if (a.pricing.input < b.pricing.input) {
      verdictParts.push(
        `cheaper on input (${formatPrice(a.pricing.input)} vs ${formatPrice(b.pricing.input)})`,
      );
    } else if (b.pricing.input < a.pricing.input) {
      verdictParts.push(
        `${b.name} is cheaper on input (${formatPrice(b.pricing.input)} vs ${formatPrice(a.pricing.input)})`,
      );
    }
  }

  // Context comparison
  if (a.ctx != null && b.ctx != null && a.ctx !== b.ctx) {
    const bigger = a.ctx > b.ctx ? a : b;
    const smaller = a.ctx > b.ctx ? b : a;
    // Reason: TypeScript can't narrow through ternary + property access, so we assert non-null
    // after the null check guard above.
    verdictParts.push(
      `${bigger.name} has a larger context window (${formatContextShort(bigger.ctx!)} vs ${formatContextShort(smaller.ctx!)})`,
    );
  }

  if (verdictParts.length > 0) {
    lines.push(verdictParts.join(". ") + ".");
  } else {
    lines.push("Both models are closely matched on available metrics.");
  }

  return lines.join("\n");
}

// --------------------------------------------------------------------------
// Sorting
// --------------------------------------------------------------------------

/**
 * Returns a sort comparator for the given key.
 */
export function sortModels(models: LensModel[], key: SortKey): LensModel[] {
  const sorted = [...models];

  switch (key) {
    case "rank":
      // Ranked models first (by rank asc), then unranked sorted by name
      sorted.sort((a, b) => {
        if (a.rank != null && b.rank != null) return a.rank - b.rank;
        if (a.rank != null) return -1;
        if (b.rank != null) return 1;
        return a.name.localeCompare(b.name);
      });
      break;

    case "price-asc":
      // Cheapest first by input price. Models without pricing go to the end.
      sorted.sort((a, b) => {
        const aPrice = a.pricing
          ? a.pricing.input + a.pricing.output
          : Infinity;
        const bPrice = b.pricing
          ? b.pricing.input + b.pricing.output
          : Infinity;
        return aPrice - bPrice;
      });
      break;

    case "price-desc":
      // Most expensive first. Models without pricing go to the end.
      sorted.sort((a, b) => {
        const aPrice = a.pricing ? a.pricing.input + a.pricing.output : -1;
        const bPrice = b.pricing ? b.pricing.input + b.pricing.output : -1;
        return bPrice - aPrice;
      });
      break;

    case "name":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;

    case "context":
      // Largest context first. Null goes to end.
      sorted.sort((a, b) => {
        const aCtx = a.ctx ?? -1;
        const bCtx = b.ctx ?? -1;
        return bCtx - aCtx;
      });
      break;
  }

  return sorted;
}

// --------------------------------------------------------------------------
// Filtering
// --------------------------------------------------------------------------

/**
 * Filters models by category.
 */
export function filterModels(
  models: LensModel[],
  category: FilterCategory,
): LensModel[] {
  switch (category) {
    case "all":
      return models;
    case "ranked":
      return models.filter((m) => m.rank != null);
    case "free":
      return models.filter(
        (m) => m.pricing && m.pricing.input === 0 && m.pricing.output === 0,
      );
    case "affordable":
      // Input price under $1 per 1M tokens
      return models.filter(
        (m) => m.pricing && m.pricing.input > 0 && m.pricing.input <= 1,
      );
    case "premium":
      // Input price $5+ per 1M tokens
      return models.filter((m) => m.pricing && m.pricing.input >= 5);
    case "large-context":
      // 100K+ context
      return models.filter((m) => m.ctx != null && m.ctx >= 100_000);
  }
}

/**
 * Filters models by provider slug.
 */
export function filterByProvider(
  models: LensModel[],
  provider: string,
): LensModel[] {
  if (provider === "all") return models;
  return models.filter((m) => m.provider === provider);
}

/**
 * Returns deduplicated provider slugs sorted by model count (descending).
 */
export function getProviderSlugs(models: LensModel[]): string[] {
  const counts = new Map<string, number>();
  for (const m of models) {
    counts.set(m.provider, (counts.get(m.provider) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([slug]) => slug);
}

// --------------------------------------------------------------------------
// Cost calculation
// --------------------------------------------------------------------------

export interface CostResult {
  model: LensModel;
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

/**
 * Calculates token cost for every model that has pricing data.
 * Returns results sorted by total cost ascending.
 */
export function calculateCosts(
  models: LensModel[],
  inputTokens: number,
  outputTokens: number,
): CostResult[] {
  const results: CostResult[] = [];

  for (const model of models) {
    if (!model.pricing) continue;
    const inputCost = (inputTokens / 1_000_000) * model.pricing.input;
    const outputCost = (outputTokens / 1_000_000) * model.pricing.output;
    results.push({
      model,
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
    });
  }

  results.sort((a, b) => a.totalCost - b.totalCost);
  return results;
}

/**
 * Formats a tiny dollar amount for cost results. "$0.0024" etc.
 */
export function formatCost(n: number): string {
  if (n === 0) return "$0.00";
  if (n >= 100) return `$${n.toFixed(2)}`;
  if (n >= 1) return `$${n.toFixed(3)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  if (n >= 0.001) return `$${n.toFixed(5)}`;
  return `$${n.toFixed(6)}`;
}

/**
 * Builds the cost detail markdown for a specific model at given token counts.
 */
export function buildCostDetailMarkdown(
  result: CostResult,
  inputTokens: number,
  outputTokens: number,
): string {
  const { model, inputCost, outputCost, totalCost } = result;
  const lines: string[] = [];

  lines.push(`# ${model.name}`);
  lines.push(`**${getProviderName(model.provider)}**`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Cost Breakdown");
  lines.push("");
  lines.push("| | |");
  lines.push("|---|---|");
  lines.push(`| Input Tokens | ${formatNumber(inputTokens)} |`);
  lines.push(`| Output Tokens | ${formatNumber(outputTokens)} |`);
  lines.push(
    `| Input Rate | ${formatPrice(model.pricing!.input)} / 1M tokens |`,
  );
  lines.push(
    `| Output Rate | ${formatPrice(model.pricing!.output)} / 1M tokens |`,
  );
  lines.push("");
  lines.push("## Total");
  lines.push("");
  lines.push("| Component | Cost |");
  lines.push("|-----------|------|");
  lines.push(`| Input | ${formatCost(inputCost)} |`);
  lines.push(`| Output | ${formatCost(outputCost)} |`);
  lines.push(`| **Total** | **${formatCost(totalCost)}** |`);

  // Extrapolation
  lines.push("");
  lines.push("## At Scale");
  lines.push("");
  lines.push("| Requests | Cost |");
  lines.push("|----------|------|");
  lines.push(`| 100 | ${formatCost(totalCost * 100)} |`);
  lines.push(`| 1,000 | ${formatCost(totalCost * 1_000)} |`);
  lines.push(`| 10,000 | ${formatCost(totalCost * 10_000)} |`);
  lines.push(`| 100,000 | ${formatCost(totalCost * 100_000)} |`);

  return lines.join("\n");
}
