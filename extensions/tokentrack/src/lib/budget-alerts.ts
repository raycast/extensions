import { LocalStorage, showToast, Toast } from "@raycast/api";
import {
  budgetCadenceForProvider,
  budgetSpendForProvider,
  getProviderBudgetAmount,
} from "./budget";
import type { CodexBudgetSnapshot } from "./codex-budget";
import { getCodexBudgetLoadRange } from "./codex-budget";
import { getUsageLoadRange } from "./format";
import { snapshotHasUsage } from "./usage-cache";
import type { ProviderUsageSnapshot } from "./usage-snapshot";
import { formatCurrencyMoney } from "./format";
import type { SourceProviderKey } from "./types";
import { loadUsage } from "./usage";
import type { BudgetAlertSettings } from "./budget-alert-settings";

const STORAGE_PREFIX = "budget-alert:";

export const BUDGET_MONITOR_PROVIDERS: SourceProviderKey[] = [
  "claude",
  "codex",
  "cursor",
];

const PROVIDER_LABELS: Record<SourceProviderKey, string> = {
  claude: "Claude",
  codex: "Codex",
  cursor: "Cursor",
};

type BudgetAlertState = {
  periodKey: string;
  lastAlertedThreshold: number;
};

export type BudgetCheckResult = {
  provider: SourceProviderKey;
  label: string;
  spend: number;
  cap: number;
  pct: number;
  cadence: "weekly" | "monthly";
  periodKey: string;
  skipped: boolean;
  skipReason?: "errors-zero-spend" | "alerts-disabled";
  shouldAlert: boolean;
  alertMessage?: string;
};

function storageKey(provider: SourceProviderKey): string {
  return `${STORAGE_PREFIX}${provider}`;
}

/** Calendar month id for Claude/Cursor monthly budgets. */
export function monthlyBudgetPeriodKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Rolling Codex window — keyed by window start (ISO). */
export function codexBudgetPeriodKey(
  codexBudget?: CodexBudgetSnapshot,
): string {
  if (!codexBudget?.windowActive) return "inactive";
  return codexBudget.window.start.toISOString();
}

export function budgetPeriodKeyForProvider(
  provider: SourceProviderKey,
  codexBudget?: CodexBudgetSnapshot,
  now = new Date(),
): string {
  return provider === "codex"
    ? codexBudgetPeriodKey(codexBudget)
    : monthlyBudgetPeriodKey(now);
}

async function readAlertState(
  provider: SourceProviderKey,
): Promise<BudgetAlertState | null> {
  const raw = await LocalStorage.getItem<string>(storageKey(provider));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BudgetAlertState;
  } catch {
    return null;
  }
}

async function writeAlertState(
  provider: SourceProviderKey,
  state: BudgetAlertState,
): Promise<void> {
  await LocalStorage.setItem(storageKey(provider), JSON.stringify(state));
}

function cadenceLabel(cadence: "weekly" | "monthly"): string {
  return cadence === "weekly" ? "weekly" : "monthly";
}

function formatWarningSummary(
  label: string,
  pct: number,
  cap: number,
  currency: string,
  cadence: "weekly" | "monthly",
): string {
  const pctStr = Math.round(pct * 100).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
  const capStr = formatCurrencyMoney(cap, currency);
  return `${label} ${pctStr}% of ${capStr} ${cadenceLabel(cadence)} cap`;
}
function formatAlertMessage(
  label: string,
  pct: number,
  cap: number,
  currency: string,
  cadence: "weekly" | "monthly",
): string {
  const pctStr = Math.round(pct * 100).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
  const capStr = formatCurrencyMoney(cap, currency);
  return `${label} ${pctStr}% of ${capStr} ${cadenceLabel(cadence)} budget`;
}

/** True when snapshot is error-only with zero budget spend — skip alerting. */
export function isUnreliableBudgetSnapshot(
  snapshot: ProviderUsageSnapshot,
  spend: number,
): boolean {
  if (spend > 0) return false;
  if (snapshot.errors.length === 0) return false;
  return !snapshotHasUsage(snapshot);
}

export async function evaluateProviderBudget(
  provider: SourceProviderKey,
  snapshot: ProviderUsageSnapshot,
  prefs: Preferences,
  options: {
    alertsEnabled: boolean;
    threshold: number;
    /** When false, detect crossings without persisting dedup state (manual runs). */
    recordAlert?: boolean;
  },
): Promise<BudgetCheckResult> {
  const label = PROVIDER_LABELS[provider];
  const currency = prefs.currency || "USD";
  const cap = getProviderBudgetAmount(prefs, provider);
  const cadence = budgetCadenceForProvider(provider);
  const spend = budgetSpendForProvider(
    provider,
    snapshot.periods,
    snapshot.codexBudget,
  );
  const pct = cap > 0 ? spend / cap : 0;
  const periodKey = budgetPeriodKeyForProvider(provider, snapshot.codexBudget);

  const base: BudgetCheckResult = {
    provider,
    label,
    spend,
    cap,
    pct,
    cadence,
    periodKey,
    skipped: false,
    shouldAlert: false,
  };

  if (isUnreliableBudgetSnapshot(snapshot, spend)) {
    return { ...base, skipped: true, skipReason: "errors-zero-spend" };
  }

  if (provider === "codex" && periodKey === "inactive") {
    return base;
  }

  if (!options.alertsEnabled) {
    return { ...base, skipped: true, skipReason: "alerts-disabled" };
  }

  const thresholdPct = options.threshold / 100;
  if (pct < thresholdPct) {
    return base;
  }

  const recordAlert = options.recordAlert ?? true;
  const stored = recordAlert ? await readAlertState(provider) : null;
  const alreadyAlerted =
    recordAlert &&
    stored?.periodKey === periodKey &&
    stored.lastAlertedThreshold >= options.threshold;

  if (alreadyAlerted) {
    return base;
  }

  const alertMessage = formatAlertMessage(label, pct, cap, currency, cadence);

  if (recordAlert) {
    await writeAlertState(provider, {
      periodKey,
      lastAlertedThreshold: options.threshold,
    });
  }

  return {
    ...base,
    shouldAlert: recordAlert,
    alertMessage: recordAlert ? alertMessage : undefined,
  };
}

export async function checkBudgetThresholdAlerts(
  prefs: Preferences,
  options: {
    recordAlert: boolean;
    settings: BudgetAlertSettings;
    /** Reuse snapshots already in memory — avoids rescanning those providers. */
    snapshots?: Partial<Record<SourceProviderKey, ProviderUsageSnapshot>>;
    /** Defaults to all providers when omitted. */
    providers?: SourceProviderKey[];
  },
): Promise<BudgetCheckResult[]> {
  const { enabled: alertsEnabled, threshold } = options.settings;
  const providers = options.providers ?? BUDGET_MONITOR_PROVIDERS;
  const results: BudgetCheckResult[] = [];

  for (const provider of providers) {
    let snapshot = options.snapshots?.[provider];
    if (!snapshot) {
      const range =
        provider === "codex" ? getCodexBudgetLoadRange() : getUsageLoadRange();
      snapshot = await loadUsage(range, provider);
    }
    results.push(
      await evaluateProviderBudget(provider, snapshot, prefs, {
        alertsEnabled,
        threshold,
        recordAlert: options.recordAlert,
      }),
    );
  }

  return results;
}

export async function showBudgetAlertToasts(
  results: BudgetCheckResult[],
): Promise<void> {
  for (const result of results) {
    if (!result.shouldAlert || !result.alertMessage) continue;
    await showToast({
      style: Toast.Style.Animated,
      title: "Budget threshold reached",
      message: result.alertMessage,
    });
  }
}

export function formatMonitorSubtitle(
  results: BudgetCheckResult[],
  threshold: number,
): string {
  const active = results.filter(
    (r) => r.skipReason !== "errors-zero-spend" && r.cap > 0,
  );
  if (active.length === 0) return "No budget data";

  const thresholdPct = threshold / 100;
  const warnings = active.filter((r) => r.pct >= thresholdPct);
  if (warnings.length === 0) return "All budgets OK";

  if (warnings.length === 1) {
    const w = warnings[0];
    return `${w.label} ${Math.round(w.pct * 100)}%`;
  }

  return `${warnings.length} budgets over ${threshold}%`;
}

export function formatUserInitiatedSummary(
  results: BudgetCheckResult[],
  threshold: number,
  alertsEnabled: boolean,
  currency: string,
): string {
  if (!alertsEnabled) {
    return "Budget alerts are disabled in preferences";
  }

  const thresholdPct = threshold / 100;
  const active = results.filter((r) => r.skipReason !== "errors-zero-spend");
  const warnings = active.filter((r) => r.pct >= thresholdPct && r.cap > 0);

  if (warnings.length === 0) {
    const unreliable = active.some((r) => r.skipReason === "errors-zero-spend");
    if (unreliable) return "All budgets OK (some sources unavailable)";
    return "All budgets OK";
  }

  return warnings
    .map((w) =>
      formatWarningSummary(w.label, w.pct, w.cap, currency, w.cadence),
    )
    .join(" · ");
}
