import { createHash } from "node:crypto";
import { PROVIDERS, type ProviderConfig, type UsagePeriod } from "./providers";

export interface KeyValueStore {
  getItem(key: string): Promise<string | undefined>;
  setItem(key: string, value: string): Promise<void>;
}

export interface UsageSnapshot {
  readonly period: UsagePeriod;
  readonly used: number;
  readonly limit: number | undefined;
  readonly remaining: number | undefined;
}

export interface ProviderUsage {
  readonly provider: ProviderConfig;
  readonly usage: UsageSnapshot;
}

const PERIOD_LABELS: Readonly<Record<UsagePeriod, string>> = {
  day: "today",
  month: "this month",
};

export function usageKey(provider: ProviderConfig, now: Date): string {
  return [
    "usage",
    provider.id,
    fingerprint(provider.apiKey),
    provider.model,
    periodStamp(periodOf(provider), now),
  ].join(":");
}

export async function readUsage(
  store: KeyValueStore,
  provider: ProviderConfig,
  now: Date,
): Promise<UsageSnapshot> {
  const used = parseCount(await store.getItem(usageKey(provider, now)));
  return snapshot(provider, used);
}

export async function incrementUsage(
  store: KeyValueStore,
  provider: ProviderConfig,
  now: Date,
): Promise<UsageSnapshot> {
  const key = usageKey(provider, now);
  const used = parseCount(await store.getItem(key)) + 1;
  await store.setItem(key, String(used));
  return snapshot(provider, used);
}

export function formatUsage(usage: UsageSnapshot): string {
  const period = PERIOD_LABELS[usage.period];
  if (usage.limit === undefined) {
    return `${usage.used.toLocaleString("en-US")} ${period}`;
  }
  return `${usage.used.toLocaleString("en-US")} / ${usage.limit.toLocaleString("en-US")} ${period}`;
}

export function loadProviderUsage(
  store: KeyValueStore,
  providers: readonly ProviderConfig[],
  now: Date,
): Promise<ProviderUsage[]> {
  return Promise.all(
    providers.map(async (provider) => ({ provider, usage: await readUsage(store, provider, now) })),
  );
}

export function summarizeProviderUsage(overview: readonly ProviderUsage[]): string {
  if (overview.length === 0) {
    return "No provider configured. Add an API key in the extension preferences.";
  }
  const lines = overview.map(
    ({ provider, usage }) =>
      `${PROVIDERS[provider.id].name} · ${provider.model}: ${formatUsage(usage)}`,
  );
  if (lines.length === 1) {
    return lines.join("");
  }
  return ["Tries in order:", ...lines.map((line, index) => `${index + 1}. ${line}`)].join("\n");
}

function snapshot(provider: ProviderConfig, used: number): UsageSnapshot {
  const limit = PROVIDERS[provider.id].limit;
  return {
    period: periodOf(provider),
    used,
    limit: limit?.maxRequests,
    remaining: limit === undefined ? undefined : Math.max(0, limit.maxRequests - used),
  };
}

function periodOf(provider: ProviderConfig): UsagePeriod {
  return PROVIDERS[provider.id].limit?.period ?? "day";
}

function fingerprint(apiKey: string | undefined): string {
  return apiKey ? createHash("sha256").update(apiKey).digest("hex").slice(0, 8) : "local";
}

function periodStamp(period: UsagePeriod, now: Date): string {
  const isoDate = now.toISOString();
  return period === "day" ? isoDate.slice(0, 10) : isoDate.slice(0, 7);
}

function parseCount(value: string | undefined): number {
  const count = Number(value ?? 0);
  return Number.isInteger(count) && count >= 0 ? count : 0;
}
