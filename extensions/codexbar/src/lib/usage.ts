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
 * are carried over from the other source. CLI errors only surface when the app has no data.
 */
export function mergeUsage(app: ProviderUsage[], cli: ProviderUsage[]): ProviderUsage[] {
  const cliByProvider = new Map(cli.map((entry) => [entry.provider, entry]));
  const merged = app.map((fromApp) => {
    const fromCli = cliByProvider.get(fromApp.provider);
    cliByProvider.delete(fromApp.provider);
    if (!fromCli || fromCli.error) return { ...fromApp, plan: fromApp.plan ?? fromCli?.plan };
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

/** The window closest to running out, used for one-line summaries. */
export function tightestWindow(usage: ProviderUsage): LimitWindow | undefined {
  return usage.windows.reduce<LimitWindow | undefined>(
    (worst, window) => (!worst || window.usedPercent > worst.usedPercent ? window : worst),
    undefined,
  );
}
