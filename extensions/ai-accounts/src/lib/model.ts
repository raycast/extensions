// Shared data model. Everything under src/lib must stay free of @raycast/api imports
// so it can be unit-tested with plain Node (`npm test`).

export type Provider = "claude" | "codex";

export const PROVIDERS: readonly Provider[] = ["claude", "codex"];

export type WindowKind = "session" | "weekly" | "scoped";

export interface Pace {
  /** Percent of the window the backend expected to be used by now. */
  expectedUsedPct?: number;
  /** Backend's own judgement of whether the account lasts until the window resets. */
  willLastToReset?: boolean;
  /** Absolute ISO time the backend projects the window to run out (never re-derived from a relative ETA at render time). */
  projectedExhaustionAt?: string | null;
  /** Short backend-provided summary, e.g. "15% in deficit". Display only. */
  summary?: string;
  /** Backend stage label, e.g. "farAhead". Display only. */
  stage?: string;
}

export interface UsageWindow {
  /** Stable per-account id: "session" | "weekly" | "scoped:<name>". */
  id: string;
  kind: WindowKind;
  /** Short label for display: "5h", "Weekly", "Fable". */
  label: string;
  /** Percent used, 0..100. null = the window applies but its value is unknown. */
  usedPct: number | null;
  /** ISO time the window resets, or null when unknown. */
  resetsAt: string | null;
  /** ISO time the backend observed this value (source time, NOT the Raycast fetch time). */
  observedAt: string | null;
  windowMinutes?: number;
  pace?: Pace;
  /**
   * Backend-vouched trust horizon in minutes. When set, a reading this old is still decision-grade
   * (e.g. cswap schedules idle candidates every ~10 min and still reports them as decision-grade).
   */
  decisionMaxAgeMinutes?: number;
}

/** Why an account's numbers can or cannot drive decisions. */
export type AccountStatus =
  | "ok" // fresh, decision-grade data
  | "error" // backend reported an error for this account
  | "relogin" // credentials need a new login
  | "unavailable" // no usage data (e.g. API-key login, keychain locked)
  | "disabled"; // user disabled it in the backend (cswap disable)

export type SwitchTarget =
  | { kind: "cswap"; slot: number }
  | { kind: "codex-managed"; managedId: string; homePath: string }
  | { kind: "codex-live" };

export interface Account {
  provider: Provider;
  /**
   * Stable identity used for matching across refreshes and in switch requests.
   * claude: "claude:<lowercased email>|<organizationUuid or ''>"
   * codex:  "codex:<lowercased email>|<workspace label or ''>"
   */
  key: string;
  /** Display label: alias, email, or backend label. Never empty. */
  label: string;
  email: string | null;
  /** Plan / login method, e.g. "pro", "max". */
  plan: string | null;
  /** Workspace / organization display name. */
  workspace: string | null;
  alias?: string;
  /** true/false when observed; "unknown" when the default identity could not be determined. */
  active: boolean | "unknown";
  status: AccountStatus;
  /** Sanitized, human-readable reason for a non-ok status. */
  statusDetail?: string;
  /** All windows that apply to this account (unknown values stay present with usedPct=null). */
  windows: UsageWindow[];
  /** true when the numbers are last-known-good values the backend kept after a failure (display only, never actionable). */
  lastGood?: boolean;
  resetCredits?: { available: number; observedAt: string | null };
  switchTarget?: SwitchTarget;
  /**
   * Set when a one-key switch to this account is known to be refused right now (e.g. the live Codex login is
   * not saved in CodexBar yet). UI routes such rows to the hand-off and suggestions never target them.
   */
  switchBlocked?: string;
  /**
   * Set on the active claude-swap row when the live login belongs to another account (cswap foreign_credential).
   * A switch to this row's own slot repairs it; the list offers that as a separate action (Enter still refreshes).
   */
  loginRepair?: boolean;
  /**
   * A Claude login that is not in claude-swap yet (e.g. the Claude desktop app signed in to a new account).
   * The row offers "Add This Account" instead of a switch; it has no usage and is never suggested.
   */
  needsAdd?: boolean;
  /** A Claude desktop app instance is signed in to this account. */
  inClaudeApp?: boolean;
  /** Which instance: the regular app, or this account's own app instance (CLAUDE_USER_DATA_DIR folder). */
  claudeAppInstance?: "default" | "profile";
}

/** Result of fetching one provider. */
export interface ProviderFetch {
  provider: Provider;
  /** Where the data came from, e.g. "cswap", "codexbar", "codexbar-ambient". */
  source: string;
  accounts: Account[];
  /** Non-fatal provider-level notes to display (e.g. "claude-swap not installed; showing current login only"). */
  notices: string[];
}

export interface ProviderState {
  provider: Provider;
  source: string | null;
  accounts: Account[];
  notices: string[];
  /** ISO time of the last successful fetch commit. */
  committedAt: string | null;
  /** ISO time of the last fetch attempt (success or failure). */
  lastAttemptAt: string | null;
  /** Sanitized error from the last failed attempt (cleared on success). */
  lastError: string | null;
  /** Bumped on every switch; a fetch started under an older generation must not commit. */
  identityGeneration: number;
  /** Bumped on every commit. */
  revision: number;
}

export interface Snapshot {
  version: 2;
  providers: Record<Provider, ProviderState>;
}

export function emptyProviderState(provider: Provider): ProviderState {
  return {
    provider,
    source: null,
    accounts: [],
    notices: [],
    committedAt: null,
    lastAttemptAt: null,
    lastError: null,
    identityGeneration: 0,
    revision: 0,
  };
}

export function emptySnapshot(): Snapshot {
  return { version: 2, providers: { claude: emptyProviderState("claude"), codex: emptyProviderState("codex") } };
}

// ---------------------------------------------------------------------------
// Suggestions

export type SuggestionKind =
  | "exhausted" // active is known-exhausted; any non-exhausted alternative helps
  | "switch" // active below threshold; candidate clearly better
  | "pace" // advisory: active will not last to reset at current pace
  | "expiring" // opt-in advisory: another account's weekly quota expires soon
  | "info"; // display-only notes (e.g. reset credits); never actionable

export interface Suggestion {
  provider: Provider;
  kind: SuggestionKind;
  /** Stable id for hysteresis/cooldown bookkeeping, e.g. "codex:switch:<targetKey>". */
  id: string;
  title: string;
  detail: string;
  /** Present only for actionable kinds (exhausted, switch, pace, expiring). */
  targetKey?: string;
  fromKey?: string;
  /** Optional conditional hint, e.g. "or wait 25m for the 5h window to reset". */
  waitHint?: string;
}

export interface SuggestionPrefs {
  /** Percent remaining below which a proactive switch is suggested. */
  threshold: number;
  /** Minimum improvement in headroom (percentage points) for a proactive switch. */
  margin: number;
  includeScopedWindows: boolean;
  expiringQuotaAdvice: boolean;
  /** Lowercased emails/labels that suggestions must never target. */
  exclude: string[];
  /** Readings older than this (minutes, by source observation time) are not decision-grade. */
  decisionMaxAgeMinutes: number;
}

export interface SuggestionState {
  /** Suggestion ids currently "on" (for trigger/clear hysteresis). */
  active: string[];
  /** Suggestion id -> ISO time it last cleared (cooldown). */
  clearedAt: Record<string, string>;
}

export const emptySuggestionState = (): SuggestionState => ({ active: [], clearedAt: {} });

// ---------------------------------------------------------------------------
// Switch operations

export type OperationState = "running" | "succeeded" | "failed" | "unknown";

export interface SwitchRequest {
  requestId: string;
  provider: Provider;
  /** Account.key of the requested target. */
  targetKey: string;
  /** Email expected on the target (re-validated right before switching). */
  expectedEmail: string | null;
  /** Label for messages. */
  targetLabel: string;
  via: "list" | "menubar" | "suggestion";
}

export interface OperationRecord {
  requestId: string;
  provider: Provider;
  targetKey: string;
  targetLabel: string;
  state: OperationState;
  startedAt: string;
  finishedAt: string | null;
  message: string | null;
  /** The switcher's result once finished; noop and handoff are recorded as state "succeeded" and told apart here. */
  outcome?: SwitchResult["state"];
}

export interface SwitchResult {
  state: "succeeded" | "failed" | "unknown" | "noop" | "handoff";
  message: string;
  /**
   * A problem that a later refresh cannot disprove (e.g. the displaced account's saved copy changed).
   * When present, the outcome must never be upgraded by a post-switch refresh and the warning must be shown.
   */
  warning?: string;
}
