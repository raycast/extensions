export interface Project {
  id: string;
  name: string;
  created_at?: number;
  icon_url?: string | null;
  icon_url_large?: string | null;
}
export interface Metric {
  id: string;
  name: string;
  description: string;
  unit: string;
  period: string;
  value: number;
  last_updated_at: number | null;
}
export interface Overview {
  metrics: Metric[];
  currency: string;
}
const API = "https://api.revenuecat.com/v2";

export function formatMetric(metric: Metric, currency: string): string {
  if (metric.unit === "$" || metric.unit === currency) {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(
      metric.value,
    );
  }
  const value = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(metric.value);
  return metric.unit === "#" || !metric.unit ? value : `${value}${metric.unit === "%" ? "" : " "}${metric.unit}`;
}
export function periodLabel(period: string): string {
  if (period === "P0D") return "Current";
  const days = /^P(\d+)D$/.exec(period);
  return days ? `Last ${days[1]} days` : period;
}
export function apiError(status: number, retryAfter: string | null): string {
  if (status === 401)
    return "Authentication rejected. Log out of RevenueCat in extension settings, then reopen the command to reconnect.";
  if (status === 403)
    return "Permission denied. Enable Charts & Metrics overview read; enable Projects read for project discovery.";
  if (status === 404)
    return "Project not found. Choose an accessible project from the project menu or reconnect RevenueCat.";
  if (status === 429)
    return `RevenueCat rate limit reached. Try again${retryAfter && /^\d+$/.test(retryAfter) ? ` in ${retryAfter} seconds` : " shortly"}.`;
  return `RevenueCat request failed (HTTP ${status}). Try refreshing shortly.`;
}
export class RevenueCatClient {
  private apiKey: string | (() => Promise<string>);
  private request: typeof fetch;
  constructor(apiKey: string | (() => Promise<string>), request: typeof fetch = fetch) {
    this.apiKey = typeof apiKey === "string" ? apiKey.trim() : apiKey;
    this.request = request;
  }
  protected async get<T>(path: string, signal?: AbortSignal, permission?: string): Promise<T> {
    const url = new URL(path.startsWith("/v2/") ? path : `${API}${path}`, API);
    if (url.origin !== "https://api.revenuecat.com" || !url.pathname.startsWith("/v2/"))
      throw new Error("Invalid RevenueCat API URL.");
    const token = typeof this.apiKey === "string" ? this.apiKey : await this.apiKey();
    const timeout = AbortSignal.timeout(15000);
    const response = await this.request(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      redirect: "error",
    });
    if (response.status === 403 && permission)
      throw new Error(`Enable ${permission} for your RevenueCat connection to use this view.`);
    if (!response.ok) throw new Error(apiError(response.status, response.headers.get("retry-after")));
    return response.json() as Promise<T>;
  }
  async projects(signal?: AbortSignal): Promise<Project[]> {
    const projects: Project[] = [];
    let path: string | null = "/projects?limit=100";
    const seen = new Set<string>();
    while (path) {
      if (seen.has(path)) throw new Error("RevenueCat returned a repeated pagination cursor.");
      seen.add(path);
      const page: { items: Project[]; next_page: string | null } = await this.get(path, signal);
      if (!Array.isArray(page.items) || page.items.some((p) => typeof p.id !== "string" || typeof p.name !== "string"))
        throw new Error("Unexpected RevenueCat projects response.");
      projects.push(...page.items);
      path = page.next_page;
    }
    return projects;
  }
  async overview(projectId: string, currency: string, signal?: AbortSignal): Promise<Overview> {
    const data = await this.get<Overview>(
      `/projects/${encodeURIComponent(projectId)}/metrics/overview?currency=${encodeURIComponent(currency)}`,
      signal,
    );
    if (
      !Array.isArray(data.metrics) ||
      !/^[A-Z]{3}$/.test(data.currency) ||
      data.metrics.some(
        (m) =>
          typeof m.id !== "string" ||
          typeof m.name !== "string" ||
          typeof m.description !== "string" ||
          typeof m.unit !== "string" ||
          typeof m.period !== "string" ||
          !Number.isFinite(m.value),
      )
    )
      throw new Error("Unexpected RevenueCat metrics response.");
    return data;
  }
}
export const demoOverview: Overview = {
  currency: "USD",
  metrics: [
    {
      id: "mrr",
      name: "Monthly Recurring Revenue",
      description: "Monthly normalized revenue from active subscriptions.",
      unit: "$",
      period: "P0D",
      value: 4280,
    },
    {
      id: "revenue",
      name: "Revenue",
      description: "Revenue over the last 28 days.",
      unit: "$",
      period: "P28D",
      value: 5176.42,
    },
    {
      id: "active_subscriptions",
      name: "Active Subscriptions",
      description: "Currently active paid subscriptions.",
      unit: "#",
      period: "P0D",
      value: 612,
    },
    {
      id: "active_trials",
      name: "Active Trials",
      description: "Customers currently in a trial.",
      unit: "#",
      period: "P0D",
      value: 84,
    },
    {
      id: "new_customers",
      name: "New Customers",
      description: "New customers in the last 28 days.",
      unit: "#",
      period: "P28D",
      value: 1386,
    },
    {
      id: "active_users",
      name: "Active Users",
      description: "Customers active in the last 28 days.",
      unit: "#",
      period: "P28D",
      value: 4821,
    },
  ].map((m) => ({ ...m, last_updated_at: null })),
};
