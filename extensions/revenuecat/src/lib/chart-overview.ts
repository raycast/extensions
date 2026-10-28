/** RevenueCat’s overview includes today and starts 28 days ago (UTC). */
export function overviewDateRange(now = new Date()) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return {
    start: new Date(today - 28 * 86_400_000).toISOString().slice(0, 10),
    end: new Date(today).toISOString().slice(0, 10),
  };
}

export function chartTotal(data: unknown, measure: string, unit: string, currency: string): number {
  const chart = data as {
    object?: unknown;
    segments?: unknown;
    yaxis_currency?: unknown;
    measures?: { display_name?: unknown; unit?: unknown }[];
    summary?: { total?: Record<string, unknown> };
  } | null;
  const value = chart?.summary?.total?.[measure];
  if (
    chart?.object !== "chart_data" ||
    (Array.isArray(chart.segments) ? chart.segments.length > 0 : chart.segments != null) ||
    (unit === "$" && chart.yaxis_currency !== currency) ||
    !Array.isArray(chart.measures) ||
    !chart.measures.some((entry) => entry.display_name === measure && entry.unit === unit) ||
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    throw new Error(`RevenueCat did not return a valid ${measure} total.`);
  }
  return value;
}

export function chartActiveCustomers(data: unknown): number {
  const chart = data as {
    object?: unknown;
    resolution?: unknown;
    segments?: unknown;
    measures?: { display_name?: unknown; unit?: unknown }[];
    values?: { measure?: unknown; value?: unknown }[];
  } | null;
  const measure = Array.isArray(chart?.measures)
    ? chart.measures.findIndex((entry) => entry.display_name === "Active Customers" && entry.unit === "#")
    : -1;
  const values = Array.isArray(chart?.values) ? chart.values.filter((entry) => entry.measure === measure) : [];
  if (
    chart?.object !== "chart_data" ||
    chart.resolution !== "year" ||
    measure < 0 ||
    (Array.isArray(chart.segments) ? chart.segments.length > 0 : chart.segments != null) ||
    values.length !== 1 ||
    typeof values[0].value !== "number" ||
    !Number.isFinite(values[0].value)
  )
    throw new Error("RevenueCat did not return a single distinct Active Customers count.");
  return values[0].value;
}

/** Current metrics come from today's daily bucket, including its incomplete value. */
export function chartCurrentValue(
  data: unknown,
  measure: string,
  unit: string,
  currency: string,
  date: string,
): number {
  const chart = data as {
    object?: unknown;
    resolution?: unknown;
    segments?: unknown;
    yaxis_currency?: unknown;
    measures?: { display_name?: unknown; unit?: unknown }[];
    values?: { measure?: unknown; cohort?: unknown; value?: unknown }[];
  } | null;
  const index = Array.isArray(chart?.measures)
    ? chart.measures.findIndex((entry) => entry.display_name === measure && entry.unit === unit)
    : -1;
  const cohort = Date.parse(`${date}T00:00:00Z`) / 1000;
  const values = Array.isArray(chart?.values)
    ? chart.values.filter((entry) => entry.measure === index && entry.cohort === cohort)
    : [];
  if (
    chart?.object !== "chart_data" ||
    chart.resolution !== "day" ||
    index < 0 ||
    (Array.isArray(chart.segments) ? chart.segments.length > 0 : chart.segments != null) ||
    (unit === "$" && chart.yaxis_currency !== currency) ||
    values.length !== 1 ||
    typeof values[0].value !== "number" ||
    !Number.isFinite(values[0].value)
  )
    throw new Error(`RevenueCat did not return a valid current ${measure} value for ${date}.`);
  return values[0].value;
}
