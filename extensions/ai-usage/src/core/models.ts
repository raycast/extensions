export type ProviderId = "claude" | "codex";

/**
 * Both providers expose a variable number of limit windows with provider-specific
 * names (Codex adds per-model `additional_rate_limits`, Claude adds `weekly_scoped`),
 * so windows are modelled as a list rather than fixed session/weekly fields.
 */
export type WindowKind = "session" | "weekly" | "scoped";

export interface UsageWindow {
  /** Stable key used to track notification state across refreshes. */
  id: string;
  label: string;
  kind: WindowKind;
  usedPercent: number;
  resetsAt: Date | null;
  /** Primary windows are always rendered; the rest are revealed with ⌘D. */
  isPrimary: boolean;
}

export interface UsageResult {
  provider: ProviderId;
  displayName: string;
  planType?: string;
  windows: UsageWindow[];
  fetchedAt: Date;
}

export type FailureReason = "not-installed" | "not-authed" | "token-expired" | "network" | "unknown";

export interface ProviderFailure {
  ok: false;
  provider: ProviderId;
  displayName: string;
  reason: FailureReason;
  /** User-facing, actionable message. Never a raw stack trace. */
  detail: string;
}

export type ProviderOutcome = { ok: true; result: UsageResult } | ProviderFailure;

export interface UsageProvider {
  id: ProviderId;
  displayName: string;
  getUsage(): Promise<UsageResult>;
}

/** Thrown by providers to carry a reason code through to the UI. */
export class ProviderError extends Error {
  constructor(
    readonly reason: FailureReason,
    message: string,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export function primaryWindows(result: UsageResult): UsageWindow[] {
  return result.windows.filter((w) => w.isPrimary);
}

/**
 * A window whose reset time has passed has demonstrably rolled over, so the
 * percentage we hold is stale in a knowable way: it is now zero.
 */
export function effectiveUsedPercent(window: UsageWindow, now: Date = new Date()): number {
  if (window.resetsAt && window.resetsAt.getTime() <= now.getTime()) return 0;
  return window.usedPercent;
}
