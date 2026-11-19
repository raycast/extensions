import { parseRevenueChart } from "./revenue-history";
import { RevenueCatClient } from "./revenuecat";
export interface Page<T> {
  items: T[];
  next_page: string | null;
}
export interface Customer {
  id: string;
  first_seen_at: number;
  last_seen_at: number | null;
  last_seen_country?: string | null;
  last_seen_platform?: string | null;
  last_seen_app_version?: string | null;
  attributes?: Page<{ name: string; value: string }>;
  active_entitlements?: Page<{ entitlement_id: string; expires_at: number | null }>;
}
export interface Subscription {
  id: string;
  product_id: string | null;
  status: string;
  store: string;
  environment: string;
  gives_access: boolean;
  auto_renewal_status: string;
  starts_at: number;
  current_period_ends_at: number | null;
  pending_payment: boolean;
  store_subscription_identifier: string;
  total_revenue_in_usd?: { gross: number; currency: string };
}
export interface CustomerEvent {
  id: string;
  type: string;
  created_at: number;
  occurred_at?: number | null;
  body: Record<string, unknown>;
}
export interface Product {
  id: string;
  store_identifier: string;
  display_name: string | null;
  type: string;
  state?: string;
  app_id: string;
  subscription?: { duration: string | null; trial_duration: string | null } | null;
  indicative_price?: { amount_micros: number; currency: string; country: string } | null;
}
export interface Offering {
  id: string;
  lookup_key: string;
  display_name: string;
  is_current: boolean;
  state?: string;
  paywall_id?: string | null;
}
export interface Revenue {
  value: number;
  currency: string;
  start_date: string;
  end_date: string;
  revenue_type: string;
}
export interface Bucket {
  start: string;
  end: string;
}
const part = encodeURIComponent;
export class ExplorerClient extends RevenueCatClient {
  async page<T extends { id: string }>(
    path: string,
    next: string | undefined,
    permission: string,
    signal?: AbortSignal,
  ): Promise<Page<T>> {
    if (next) {
      const origin = "https://api.revenuecat.com";
      const expected = new URL(`/v2${path}`, origin);
      const actual = new URL(next, origin);
      if (actual.origin !== origin || actual.pathname !== expected.pathname)
        throw new Error("Invalid RevenueCat pagination URL.");
      path = actual.pathname + actual.search;
    }
    const data = await this.get<Page<T>>(path, signal, permission);
    if (
      !Array.isArray(data.items) ||
      data.items.some((x) => !x || typeof x.id !== "string") ||
      (data.next_page != null && typeof data.next_page !== "string")
    )
      throw new Error("Unexpected RevenueCat list response.");
    return data;
  }
  customers(project: string, search: string, next?: string, signal?: AbortSignal) {
    const q = new URLSearchParams({ limit: "50" });
    if (search.trim()) q.set("search", search.trim());
    return this.page<Customer>(
      `/projects/${part(project)}/customers?${q}`,
      next,
      "customer_information:customers:read",
      signal,
    );
  }
  customer(project: string, customer: string, signal?: AbortSignal) {
    return this.get<Customer>(
      `/projects/${part(project)}/customers/${part(customer)}?expand=attributes`,
      signal,
      "customer_information:customers:read",
    );
  }
  subscriptions(project: string, customer: string, environment: string, next?: string, signal?: AbortSignal) {
    const q = new URLSearchParams({ limit: "50" });
    if (environment !== "all") q.set("environment", environment);
    return this.page<Subscription>(
      `/projects/${part(project)}/customers/${part(customer)}/subscriptions?${q}`,
      next,
      "customer_information:subscriptions:read",
      signal,
    );
  }
  events(project: string, customer: string, next?: string, signal?: AbortSignal) {
    return this.page<CustomerEvent>(
      `/projects/${part(project)}/customers/${part(customer)}/events?limit=50`,
      next,
      "customer_information:customers:read",
      signal,
    );
  }
  products(project: string, next?: string, signal?: AbortSignal) {
    return this.page<Product>(
      `/projects/${part(project)}/products?limit=50&expand=items.indicative_price`,
      next,
      "project_configuration:products:read",
      signal,
    );
  }
  offerings(project: string, next?: string, signal?: AbortSignal) {
    return this.page<Offering>(
      `/projects/${part(project)}/offerings?limit=50`,
      next,
      "project_configuration:offerings:read",
      signal,
    );
  }
  async dailyRevenue(project: string, bucket: Bucket, currency: string, signal?: AbortSignal) {
    const query = new URLSearchParams({
      start_date: bucket.start,
      end_date: bucket.end,
      currency,
      resolution: "0",
      realtime: "true",
      expand_periods: "false",
      selectors: JSON.stringify({ revenue_type: "revenue" }),
    });
    const data = await this.get<unknown>(
      `/projects/${part(project)}/charts/revenue?${query}`,
      signal,
      "charts_metrics:charts:read",
    );
    return parseRevenueChart(data, currency);
  }
  async revenue(project: string, bucket: Bucket, currency: string, signal?: AbortSignal): Promise<Revenue> {
    const query = new URLSearchParams({ start_date: bucket.start, end_date: bucket.end, currency });
    const data = await this.get<Revenue>(
      `/projects/${part(project)}/metrics/revenue?${query}`,
      signal,
      "charts_metrics:overview:read",
    );
    if (
      !Number.isFinite(data.value) ||
      !/^[A-Z]{3}$/.test(data.currency) ||
      data.start_date !== bucket.start ||
      data.end_date !== bucket.end
    )
      throw new Error("Unexpected RevenueCat revenue response.");
    return data;
  }
}
// Inclusive UTC dates; today's partial day is deliberately excluded.
export function revenueBuckets(count: number, days: number, now = new Date()): Bucket[] {
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const day = 86400000;
  return Array.from({ length: count }, (_, i) => {
    const end = midnight - ((count - i - 1) * days + 1) * day;
    return {
      start: new Date(end - (days - 1) * day).toISOString().slice(0, 10),
      end: new Date(end).toISOString().slice(0, 10),
    };
  });
}
export function previousPeriod(buckets: Bucket[]): Bucket {
  const start = Date.parse(buckets[0].start);
  const end = Date.parse(buckets[buckets.length - 1].end);
  const duration = end - start + 86400000;
  return {
    start: new Date(start - duration).toISOString().slice(0, 10),
    end: new Date(start - 86400000).toISOString().slice(0, 10),
  };
}
export function changeLabel(current: number, previous: number): string {
  if (previous === 0) return current === 0 ? "No change" : "No prior revenue";
  const percent = ((current - previous) / Math.abs(previous)) * 100;
  return `${percent > 0 ? "+" : ""}${percent.toFixed(1)}%`;
}
