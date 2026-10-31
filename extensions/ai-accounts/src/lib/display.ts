import { currentWindowRemaining, DISPLAY_MAX_AGE_MINUTES, formatCountdown, windowPastReset } from "./format";
import { Account, OperationRecord, Provider, Snapshot, Suggestion, SuggestionPrefs, UsageWindow } from "./model";
import { Headroom, headroom } from "./suggest";

// Pure display helpers shared by the list and the menu bar (no @raycast imports).
// Display freshness is always the fixed maxAgeMinutes limit: a backend-vouched decision horizon
// (UsageWindow.decisionMaxAgeMinutes) makes an old reading usable for suggestions, never "current" on screen.

export type PercentMode = "remaining" | "used";
export type MenuBarValue = "detailed" | "headroom" | "weekly";

export function sessionWindow(account: Account): UsageWindow | undefined {
  return account.windows.find((w) => w.kind === "session");
}

export function weeklyWindow(account: Account): UsageWindow | undefined {
  return account.windows.find((w) => w.kind === "weekly");
}

/** Window names for detail panes and tooltips. */
export function windowName(w: UsageWindow): string {
  if (w.kind === "session") return "5-hour";
  if (w.kind === "weekly") return "Weekly";
  return `${w.label} weekly`;
}

/** Remaining percent for display, or null when the reading cannot be shown as current. */
export function currentRemaining(
  account: Account,
  w: UsageWindow,
  nowMs: number,
  maxAgeMinutes: number,
): number | null {
  return currentWindowRemaining(account, w, nowMs, maxAgeMinutes);
}

/** Headroom for display: same rules as suggestions, with the fixed display freshness limit. */
export function displayHeadroom(
  account: Account,
  prefs: SuggestionPrefs,
  nowMs: number,
  maxAgeMinutes: number = DISPLAY_MAX_AGE_MINUTES,
): Headroom {
  return headroom(account, prefs, nowMs, { maxAgeMinutes });
}

/** Convert a remaining percent into the number shown in the chosen mode. */
export function toShown(remaining: number | null, mode: PercentMode): number | null {
  if (remaining === null) return null;
  return mode === "used" ? 100 - remaining : remaining;
}

function num(value: number | null): string {
  return value === null ? "?" : String(Math.round(value));
}

/** "47%" / "?" in the chosen mode. */
export function shownText(remaining: number | null, mode: PercentMode): string {
  const v = toShown(remaining, mode);
  return v === null ? "?" : `${num(v)}%`;
}

/**
 * Menu-bar segment for a provider's active account.
 *  detailed: "5h 47% W 89% 3h20m" (then time to the 5h reset), or "W 89%" without a 5h window.
 *  headroom: lowest remaining window (in the chosen mode).
 *  weekly:   weekly window only.
 */
export function menuSegment(
  account: Account,
  opts: { value: MenuBarValue; percentMode: PercentMode; prefs: SuggestionPrefs; maxAgeMinutes: number },
  nowMs: number,
): string {
  const { percentMode, maxAgeMinutes } = opts;
  if (opts.value === "headroom") {
    const hr = displayHeadroom(account, opts.prefs, nowMs, maxAgeMinutes);
    return shownText(hr.value, percentMode);
  }
  const weekly = weeklyWindow(account);
  const weeklyValue = weekly ? currentRemaining(account, weekly, nowMs, maxAgeMinutes) : null;
  const session = sessionWindow(account);
  if (opts.value === "weekly" || !session) return `W ${shownText(weeklyValue, percentMode)}`;
  const sessionValue = currentRemaining(account, session, nowMs, maxAgeMinutes);
  const values = weekly
    ? `5h ${shownText(sessionValue, percentMode)} W ${shownText(weeklyValue, percentMode)}`
    : `5h ${shownText(sessionValue, percentMode)}`;
  const countdown =
    session.resetsAt && !windowPastReset(session, nowMs) ? formatCountdown(session.resetsAt, nowMs) : "";
  return countdown && countdown !== "—" ? `${values} ${countdown}` : values;
}

/** All account limits, e.g. "5h 47% · Wk 89% · Fable 100%". */
export function windowsSummary(
  account: Account,
  opts: { percentMode: PercentMode; maxAgeMinutes: number },
  nowMs: number,
): string {
  return account.windows
    .map((w) => {
      const label = w.kind === "weekly" ? "Wk" : w.label;
      const value = windowPastReset(w, nowMs)
        ? "↻"
        : shownText(currentRemaining(account, w, nowMs, opts.maxAgeMinutes), opts.percentMode);
      return `${label} ${value}`;
    })
    .join(" · ");
}

/**
 * Row the list opens on: the active Claude account, else the active Codex account. Opening on the active row makes
 * a reflexive Enter a refresh instead of a switch.
 */
export function activeRowId(snapshot: Snapshot): string | undefined {
  return (
    snapshot.providers.claude.accounts.find((a) => a.active === true)?.key ??
    snapshot.providers.codex.accounts.find((a) => a.active === true)?.key
  );
}

/** Actionable suggestions a click can switch to: the target is in the snapshot and not blocked from one-key switching. */
export function switchableSuggestions(suggestions: readonly Suggestion[], snapshot: Snapshot): Suggestion[] {
  return suggestions.filter((s) => {
    if (!s.targetKey) return false;
    const target = snapshot.providers[s.provider]?.accounts.find((a) => a.key === s.targetKey);
    return target !== undefined && !target.switchBlocked;
  });
}

/**
 * The switch record worth showing for a provider: the most recently started one that is still running or whose
 * outcome is unknown, unless a switch of that provider started after it has succeeded. A failed later switch does
 * not settle an earlier unknown one. Records are ordered by startedAt (the store keeps most-recently-updated first,
 * which a late orphan reconciliation can reorder); ties and unparseable times keep the stored order.
 */
export function unresolvedOperation(records: readonly OperationRecord[], provider: Provider): OperationRecord | null {
  const startedMs = (r: OperationRecord): number => {
    const ms = Date.parse(r.startedAt);
    return Number.isFinite(ms) ? ms : -Infinity;
  };
  const mine = records
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r?.provider === provider)
    .sort((a, b) => startedMs(b.r) - startedMs(a.r) || a.i - b.i)
    .map(({ r }) => r);
  for (const r of mine) {
    // A hand-off only opened CodexBar; it confirms nothing about an earlier unclear switch.
    if (r.state === "succeeded" && r.outcome !== "handoff") return null;
    if (r.state === "running" || r.state === "unknown") return r;
  }
  return null;
}

/** How long after a switch finishes the list waits for its post-switch refresh to take the provider lock. */
export const POST_SWITCH_SETTLE_MS = 3_000;

/**
 * Whether the list can stop following a switch it started: the record has left "running", and either the
 * post-switch refresh has landed (an attempt started after the switch did), or nothing will land: a hand-off
 * (nothing changed), or no refresh or switch holds the provider lock a moment after the switch finished (the
 * refresh was refused as busy or superseded, or the switch was refused before it started).
 */
export function switchWatchDone(
  op: OperationRecord | undefined,
  lastAttemptAt: string | null,
  providerLockHeld: boolean,
  nowMs: number,
): boolean {
  if (!op || op.state === "running") return false;
  if (op.outcome === "handoff") return true;
  const started = Date.parse(op.startedAt);
  const attempted = Date.parse(lastAttemptAt ?? "");
  if (!Number.isFinite(started) || attempted >= started) return true;
  if (providerLockHeld) return false;
  const finished = Date.parse(op.finishedAt ?? "");
  return !Number.isFinite(finished) || nowMs - finished >= POST_SWITCH_SETTLE_MS;
}

/**
 * The active claude-swap row whose live login belongs to another account: a switch to its own slot repairs it
 * (offered as a separate action; Enter on the active row still refreshes).
 */
export function canRepairLogin(account: Account): boolean {
  return (
    account.provider === "claude" &&
    account.active === true &&
    account.loginRepair === true &&
    account.switchTarget?.kind === "cswap" &&
    !account.switchBlocked
  );
}
