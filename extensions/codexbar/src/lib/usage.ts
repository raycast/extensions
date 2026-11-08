import { parseDate, providerName, windowTitle } from "./format";
import { LimitWindow, ProviderUsage, RawRateWindow } from "./types";

interface CliUsageEntry {
  provider: string;
  rateWindowLabels?: Partial<Record<"primary" | "secondary" | "tertiary", string>>;
  usage?: {
    loginMethod?: string | null;
    primary?: RawRateWindow | null;
    secondary?: RawRateWindow | null;
    tertiary?: RawRateWindow | null;
    extraRateWindows?: { id: string; title?: string; window?: RawRateWindow | null }[];
    updatedAt?: string;
  } | null;
  error?: { message?: string } | null;
}

function formatPlan(plan: string | null | undefined): string | undefined {
  if (!plan) return undefined;
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

/** Parses `codexbar usage --format json` output (an array with one entry per enabled provider). */
export function parseUsageCli(json: unknown): ProviderUsage[] {
  if (!Array.isArray(json)) throw new Error("Unexpected output from codexbar usage");
  return (json as CliUsageEntry[]).map((entry) => {
    const usage = entry.usage ?? undefined;
    const windows: LimitWindow[] = [];
    for (const id of ["primary", "secondary", "tertiary"] as const) {
      const raw = usage?.[id];
      if (!raw || typeof raw.usedPercent !== "number") continue;
      windows.push({
        id,
        title: windowTitle(raw.windowMinutes ?? undefined, entry.rateWindowLabels?.[id] ?? id),
        usedPercent: raw.usedPercent,
        resetsAt: parseDate(raw.resetsAt),
        windowMinutes: raw.windowMinutes ?? undefined,
      });
    }
    for (const extra of usage?.extraRateWindows ?? []) {
      if (!extra.window || typeof extra.window.usedPercent !== "number") continue;
      windows.push({
        id: extra.id,
        title: extra.title ?? extra.id,
        usedPercent: extra.window.usedPercent,
        resetsAt: parseDate(extra.window.resetsAt),
        windowMinutes: extra.window.windowMinutes ?? undefined,
      });
    }
    return {
      provider: entry.provider,
      name: providerName(entry.provider),
      plan: formatPlan(usage?.loginMethod),
      windows,
      currency: "USD",
      updatedAt: parseDate(usage?.updatedAt),
      error: entry.error ? (entry.error.message ?? "Unknown error") : undefined,
      source: "cli" as const,
    };
  });
}

/**
 * Combines the app snapshot with the last CLI refresh. Per provider the newest successful
 * reading wins; token/cost totals (only in the snapshot) and the plan name (only in the CLI)
 * are carried over from the other source. When the refresh failed for a provider the app
 * reading is kept and the failure is attached as `refreshError`. With `enabled`, providers
 * that were disabled in CodexBar are dropped from the CLI cache.
 */
export function mergeUsage(app: ProviderUsage[], cli: ProviderUsage[], enabled?: string[]): ProviderUsage[] {
  const cliByProvider = new Map(
    cli.filter((entry) => !enabled || enabled.includes(entry.provider)).map((entry) => [entry.provider, entry]),
  );
  const merged = app.map((fromApp): ProviderUsage => {
    const fromCli = cliByProvider.get(fromApp.provider);
    cliByProvider.delete(fromApp.provider);
    if (!fromCli) return fromApp;
    if (fromCli.error) return { ...fromApp, plan: fromApp.plan ?? fromCli.plan, refreshError: fromCli.error };
    const cliIsNewer = (fromCli.updatedAt?.getTime() ?? 0) > (fromApp.updatedAt?.getTime() ?? 0);
    const base = cliIsNewer && fromCli.windows.length > 0 ? fromCli : fromApp;
    return {
      ...base,
      plan: fromCli.plan ?? fromApp.plan,
      todayCost: fromApp.todayCost,
      todayTokens: fromApp.todayTokens,
      last30DaysCost: fromApp.last30DaysCost,
      last30DaysTokens: fromApp.last30DaysTokens,
      currency: fromApp.currency,
    };
  });
  return [...merged, ...cliByProvider.values()];
}

export class NoUsageDataError extends Error {
  constructor(readonly appInstalled: boolean) {
    super(appInstalled ? "CodexBar has not written any usage data yet" : "CodexBar is not installed");
    this.name = "NoUsageDataError";
  }
}

/**
 * Picks what to show from the app snapshot (if any) and the cached CLI refresh. Without a
 * snapshot the cached refresh is enough; with neither, the error says whether CodexBar is
 * missing altogether or simply has not produced data yet.
 */
export function combineSources(input: {
  snapshot?: { providers: ProviderUsage[]; enabledProviders?: string[] };
  cached: ProviderUsage[];
  appInstalled: boolean;
}): ProviderUsage[] {
  if (input.snapshot) return mergeUsage(input.snapshot.providers, input.cached, input.snapshot.enabledProviders);
  if (input.cached.length > 0) return input.cached;
  throw new NoUsageDataError(input.appInstalled);
}

/** Providers that the last refresh could not update, by display name. */
export function failedRefreshes(usage: ProviderUsage[]): string[] {
  return usage.filter((entry) => entry.error || entry.refreshError).map((entry) => entry.name);
}

/** The window closest to running out, used for one-line summaries. */
export function tightestWindow(usage: ProviderUsage): LimitWindow | undefined {
  return usage.windows.reduce<LimitWindow | undefined>(
    (worst, window) => (!worst || window.usedPercent > worst.usedPercent ? window : worst),
    undefined,
  );
}
