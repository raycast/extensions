import { demoOverview, Metric, Overview, RevenueCatClient } from "./revenuecat";

export const METRIC_ORDER = [
  "mrr",
  "revenue",
  "active_subscriptions",
  "active_trials",
  "new_customers",
  "active_users",
];
export const metricTitle = (metric: Metric) => (metric.id === "mrr" ? "MRR" : metric.name);
export function sortedMetrics(metrics: Metric[]) {
  const rank = (id: string) => (METRIC_ORDER.includes(id) ? METRIC_ORDER.indexOf(id) : METRIC_ORDER.length);
  return [...metrics].sort((a, b) => rank(a.id) - rank(b.id));
}
export function metricGroups(metrics: Metric[]) {
  const ordered = sortedMetrics(metrics);
  return [
    { title: "Revenue", ids: ["mrr", "revenue"] },
    { title: "Subscriptions", ids: ["active_subscriptions", "active_trials"] },
    { title: "Customers", ids: ["new_customers", "active_users"] },
    {
      title: "Other Metrics",
      ids: ordered.filter((metric) => !METRIC_ORDER.includes(metric.id)).map((metric) => metric.id),
    },
  ]
    .map((group) => ({ title: group.title, metrics: ordered.filter((metric) => group.ids.includes(metric.id)) }))
    .filter((group) => group.metrics.length > 0);
}
export async function loadOverview(
  client: Pick<RevenueCatClient, "overview">,
  projectId: string,
  currency: string,
  demo: boolean,
  signal?: AbortSignal,
  chartsV3 = true,
): Promise<Overview> {
  if (!demo) return client.overview(projectId, currency, signal, chartsV3);
  return {
    ...demoOverview,
    currency,
    metrics: demoOverview.metrics.map((metric) =>
      chartsV3 && metric.id === "active_users" ? { ...metric, name: "Active Customers" } : metric,
    ),
  };
}
