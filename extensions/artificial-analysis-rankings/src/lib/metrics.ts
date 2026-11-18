export type MetricKey = "intelligence" | "coding" | "speed" | "inputPrice" | "outputPrice" | "latency";

export interface MetricDefinition {
  title: string;
  commandTitle: string;
  direction: "ascending" | "descending";
  unit: string;
  nonnegative: boolean;
  format: (value: number | null) => string;
  /** A short label that carries the unit, for compact layouts such as comparison cards. */
  label: string;
  /** The value without its unit, to pair with {@link MetricDefinition.label}. */
  formatBare: (value: number | null) => string;
}

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const seconds = new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 });
const bare = (formatter: Intl.NumberFormat) => (value: number | null) =>
  value === null ? "—" : formatter.format(value);
const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 8,
});

export function formatScore(value: number | null): string {
  return value === null ? "—" : value.toFixed(1);
}

export function formatPrice(value: number | null): string {
  if (value === null) return "—";
  if (value > 0 && value < 0.00000001) return `$${value.toExponential(2)}`;
  return currency.format(value);
}

export function isPriceMetric(metric: MetricKey): boolean {
  return metric === "inputPrice" || metric === "outputPrice";
}

/** Metrics grouped for selectors and detail tables, in display order. */
export const METRIC_GROUPS: { title: string; metrics: MetricKey[] }[] = [
  { title: "Quality", metrics: ["intelligence", "coding"] },
  { title: "Performance", metrics: ["speed", "latency"] },
  { title: "Price per 1M Tokens", metrics: ["inputPrice", "outputPrice"] },
];

export const METRIC_ORDER: MetricKey[] = METRIC_GROUPS.flatMap((group) => group.metrics);

export const METRICS: Record<MetricKey, MetricDefinition> = {
  intelligence: {
    title: "Intelligence Index",
    commandTitle: "All AI Models",
    direction: "descending",
    unit: "Index score",
    nonnegative: false,
    format: formatScore,
    label: "Intelligence",
    formatBare: formatScore,
  },
  coding: {
    title: "Coding Index",
    commandTitle: "Best Coding Models",
    direction: "descending",
    unit: "Index score",
    nonnegative: false,
    format: formatScore,
    label: "Coding",
    formatBare: formatScore,
  },
  speed: {
    title: "Output Speed",
    commandTitle: "Fastest AI Models",
    direction: "descending",
    unit: "Tokens per second",
    nonnegative: true,
    format: (v) => (v === null ? "—" : `${number.format(v)} t/s`),
    label: "Speed (tok/s)",
    formatBare: bare(number),
  },
  inputPrice: {
    title: "Input Price",
    commandTitle: "Model Pricing",
    direction: "ascending",
    unit: "USD per million input tokens",
    nonnegative: true,
    format: formatPrice,
    label: "Input (per 1M)",
    formatBare: formatPrice,
  },
  outputPrice: {
    title: "Output Price",
    commandTitle: "Model Pricing",
    direction: "ascending",
    unit: "USD per million output tokens",
    nonnegative: true,
    format: formatPrice,
    label: "Output (per 1M)",
    formatBare: formatPrice,
  },
  latency: {
    title: "Time to First Token",
    commandTitle: "Lowest Latency Models",
    direction: "ascending",
    unit: "Seconds",
    nonnegative: true,
    format: (v) => (v === null ? "—" : `${seconds.format(v)} s`),
    label: "Latency (s)",
    formatBare: bare(seconds),
  },
};
