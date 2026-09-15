import { LDClause, LDFlagEnvironment, LDFlagRule, LDRolloutVariation, LDVariation } from "../types";

export function formatVariation(variation: LDVariation | undefined): string {
  if (!variation) return "(No variation)";
  if (variation.name) return variation.name;
  return JSON.stringify(variation.value);
}

/** Human label for variation `index`, 1-based to match the LaunchDarkly UI. */
export function formatVariationLabel(index: number): string {
  return `Variation ${index + 1}`;
}

/** LaunchDarkly rollout weights are expressed in thousandths of a percent (100000 = 100%). */
export function formatWeight(weight: number): string {
  const percent = weight / 1000;
  return `${Number.isInteger(percent) ? percent : percent.toFixed(2)}%`;
}

export function formatRollout(rolloutVariations: LDRolloutVariation[], variations: LDVariation[]): string {
  return rolloutVariations
    .map((v) => `${formatWeight(v.weight)} ${formatVariation(variations[v.variation])}`)
    .join(", ");
}

export function formatFallthrough(env: LDFlagEnvironment, variations: LDVariation[]): string {
  if (env.fallthrough?.rollout) return `Split [${formatRollout(env.fallthrough.rollout.variations, variations)}]`;
  if (env.fallthrough?.variation !== undefined) return formatVariation(variations[env.fallthrough.variation]);
  return "(No fallthrough)";
}

export function formatOffVariation(env: LDFlagEnvironment, variations: LDVariation[]): string {
  return env.offVariation === undefined ? "(No off variation)" : formatVariation(variations[env.offVariation]);
}

/** The value served by default: the fallthrough when on, the off variation when off. */
export function formatServedValue(env: LDFlagEnvironment, variations: LDVariation[]): string {
  return env.on ? formatFallthrough(env, variations) : formatOffVariation(env, variations);
}

const OP_LABELS: Record<string, string> = {
  in: "is one of",
  endsWith: "ends with",
  startsWith: "starts with",
  matches: "matches",
  contains: "contains",
  lessThan: "<",
  lessThanOrEqual: "<=",
  greaterThan: ">",
  greaterThanOrEqual: ">=",
  before: "before",
  after: "after",
  semVerEqual: "semver =",
  semVerLessThan: "semver <",
  semVerGreaterThan: "semver >",
  segmentMatch: "is in segment",
};

function formatClauseValue(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

/** `segmentNames` resolves segment keys to display names for `segmentMatch` clauses. */
export function formatClause(clause: LDClause, segmentNames: Record<string, string> = {}): string {
  const op = OP_LABELS[clause.op] ?? clause.op;
  const values = clause.values.map((v) =>
    clause.op === "segmentMatch" ? (segmentNames[String(v)] ?? formatClauseValue(v)) : formatClauseValue(v),
  );
  const subject = clause.op === "segmentMatch" ? "context" : `${clause.contextKind ?? "user"}.${clause.attribute}`;
  return `${subject} ${clause.negate ? "NOT " : ""}${op} ${values.join(", ")}`;
}

export function formatRuleServe(rule: LDFlagRule, variations: LDVariation[]): string {
  if (rule.rollout) return `Split [${formatRollout(rule.rollout.variations, variations)}]`;
  if (rule.variation !== undefined) return formatVariation(variations[rule.variation]);
  return "(No variation)";
}

export function formatRuleCompact(
  rule: LDFlagRule,
  variations: LDVariation[],
  segmentNames: Record<string, string> = {},
): string {
  const conditions = rule.clauses.map((c) => formatClause(c, segmentNames)).join(" AND ");
  return `IF ${conditions} → ${formatRuleServe(rule, variations)}`;
}

export function formatDate(value: number | string | undefined): string {
  if (value === undefined) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString();
}

export function formatRelativeDate(value: number | string | undefined): string {
  if (value === undefined) return "never";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "unknown";
  const seconds = Math.round((Date.now() - then) / 1000);
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.35, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];
  let value2 = seconds;
  for (const [size, unit] of units) {
    if (Math.abs(value2) < size) {
      return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(-Math.round(value2), unit);
    }
    value2 /= size;
  }
  return "unknown";
}

/** Escape characters that would break a markdown table cell. */
export function escapeMarkdownCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
