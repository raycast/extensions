import { Account, OperationRecord, PROVIDERS, Provider, ProviderFetch, SwitchRequest, SwitchResult } from "./model";
import { sanitize } from "./exec";
import {
  acquireLock,
  commitSwitch,
  FetchHooks,
  insertOperation,
  invalidateIdentity,
  readOperations,
  readSnapshot,
  reconcileRunningOperations,
  refreshProvider,
  RefreshOutcome,
  StoredOperationRecord,
  StoredProviderState,
  upsertOperation,
} from "./store";

// Orchestration shared by the Raycast commands: per-provider stale refresh and the switch
// workflow (provider lock -> operation record -> switcher -> commit -> post-switch refresh).
// Dependency-injected so it runs in plain Node tests without Raycast or real CLIs.

export interface SwitchHooks {
  /** Called with the pid of a child process doing the switch, so the provider lock is never reclaimed while it lives. */
  onSpawn?: (pid: number | undefined) => void;
}

export type SwitchOutcome = SwitchResult & { activeKey?: string };

export type Switcher = (req: SwitchRequest, hooks: SwitchHooks) => Promise<SwitchOutcome>;

export interface FlowDeps {
  /** Directory holding snapshot, operation records and locks. */
  dir: string;
  /** Fetchers get hooks that record their backend children in the provider lock. */
  fetchers: Record<Provider, (hooks: FetchHooks) => Promise<ProviderFetch>>;
  switchers: { claude: Switcher; codex: Switcher };
  nowMs?: () => number;
  /** How long a switch waits for a busy provider lock (default 60 s). Tests shorten it. */
  switchLockWaitMs?: number;
}

/** After a failed refresh, the same provider is not retried automatically for this long (from when it failed). */
export const FAILED_RETRY_MS = 60_000;
export const SWITCH_LOCK_WAIT_MS = 60_000;
export const POST_SWITCH_REFRESH_WAIT_MS = 5_000;

export const PROVIDER_NAMES: Record<Provider, string> = { claude: "Claude", codex: "Codex" };

function clock(deps: FlowDeps): number {
  return deps.nowMs ? deps.nowMs() : Date.now();
}

function isoMs(iso: string | null | undefined): number | null {
  if (typeof iso !== "string") return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function errorText(error: unknown): string {
  return sanitize(error instanceof Error ? error.message : error);
}

// ---------------------------------------------------------------------------
// Refresh

export type RefreshResult = RefreshOutcome | "fresh";

/**
 * Per-provider retry eligibility. A provider is due when it has no commit younger than maxAgeMs,
 * unless its last attempt failed less than FAILED_RETRY_MS ago, measured from when the failure was
 * recorded (a fetch can hang for its whole timeout first). Each provider is judged on its own state,
 * so a fresh Codex commit never suppresses a Claude retry.
 */
export function providerDue(state: StoredProviderState, nowMs: number, maxAgeMs: number): boolean {
  const failed = isoMs(state.lastFailedAt) ?? isoMs(state.lastAttemptAt);
  if (state.lastError !== null && failed !== null && nowMs - failed < FAILED_RETRY_MS) return false;
  const committed = isoMs(state.committedAt);
  if (committed === null) return true;
  return nowMs - committed >= maxAgeMs;
}

export async function refreshStale(
  deps: FlowDeps,
  opts: {
    maxAgeMs: number;
    force?: boolean;
    /** Limit the refresh to these providers (the others report "fresh"). Default: all. */
    providers?: readonly Provider[];
    /** Called as each provider settles (the list re-reads the snapshot per provider). */
    onSettled?: (provider: Provider, result: RefreshResult) => void;
  },
): Promise<Record<Provider, RefreshResult>> {
  const snap = readSnapshot(deps.dir);
  const now = clock(deps);
  const entries = await Promise.all(
    PROVIDERS.map(async (provider): Promise<[Provider, RefreshResult]> => {
      let result: RefreshResult;
      const skipped = opts.providers !== undefined && !opts.providers.includes(provider);
      if (skipped || (!opts.force && !providerDue(snap.providers[provider], now, opts.maxAgeMs))) {
        result = "fresh";
      } else {
        try {
          result = await refreshProvider(deps.dir, provider, deps.fetchers[provider], { waitMs: 0 });
        } catch (error) {
          // refreshProvider only throws when the state lock stays busy; report it, never crash the UI.
          result = { kind: "failed", error: errorText(error) || "Refresh failed" };
        }
      }
      try {
        opts.onSettled?.(provider, result);
      } catch {
        // UI callback errors must not change the refresh result
      }
      return [provider, result];
    }),
  );
  return Object.fromEntries(entries) as Record<Provider, RefreshResult>;
}

// ---------------------------------------------------------------------------
// Switch

const VIA = new Set(["list", "menubar", "suggestion"]);

/** Launch-context validation: the switch command accepts nothing but a well-formed SwitchRequest. */
export function isSwitchRequest(value: unknown): value is SwitchRequest {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.requestId !== "string" || v.requestId.length === 0 || v.requestId.length > 128) return false;
  if (typeof v.provider !== "string" || !(PROVIDERS as readonly string[]).includes(v.provider)) return false;
  if (typeof v.targetKey !== "string" || !v.targetKey.startsWith(`${v.provider}:`) || v.targetKey.length > 512) {
    return false;
  }
  if (!(v.expectedEmail === null || typeof v.expectedEmail === "string")) return false;
  if (typeof v.targetLabel !== "string") return false;
  if (typeof v.via !== "string" || !VIA.has(v.via)) return false;
  return true;
}

const RESULT_STATES = new Set(["succeeded", "failed", "unknown", "noop", "handoff"]);
const OUTCOME_TEXT_MAX = 400;

function normalizeOutcome(value: unknown): SwitchOutcome {
  if (!value || typeof value !== "object") return { state: "unknown", message: "The switch returned no result." };
  const v = value as Record<string, unknown>;
  if (typeof v.state !== "string" || !RESULT_STATES.has(v.state)) {
    return { state: "unknown", message: "The switch returned an unrecognized result." };
  }
  // Switch messages can carry recovery instructions (what is where, what to check), so they get more room
  // than the default cap; the HUD shortens them itself.
  const outcome: SwitchOutcome = {
    state: v.state as SwitchResult["state"],
    message: sanitize(v.message, OUTCOME_TEXT_MAX),
  };
  if (typeof v.activeKey === "string" && v.activeKey) outcome.activeKey = v.activeKey;
  const warning = sanitize(v.warning, OUTCOME_TEXT_MAX);
  if (warning) outcome.warning = warning;
  return outcome;
}

/** The message with the warning appended once, so every place that shows the message also shows the warning. */
function withWarning(message: string, warning: string | undefined): string {
  if (!warning || message.includes(warning)) return message;
  return message ? `${sentence(message)} ${warning}` : warning;
}

function toResult(outcome: SwitchOutcome, message: string = outcome.message): SwitchResult {
  return outcome.warning
    ? { state: outcome.state, message, warning: outcome.warning }
    : { state: outcome.state, message };
}

function recordState(state: SwitchResult["state"]): OperationRecord["state"] {
  if (state === "failed") return "failed";
  if (state === "unknown") return "unknown";
  return "succeeded"; // succeeded, noop and handoff
}

/**
 * Operations left "running" by a worker that died. Callers hold the provider lock, which a live switch keeps
 * (heartbeat) until it has recorded its result, so a running record whose switch no longer holds the lock is
 * orphaned. The re-check and the rewrite happen in one state-lock section (see reconcileRunningOperations).
 */
async function reconcileOrphans(deps: FlowDeps, provider: Provider): Promise<void> {
  await reconcileRunningOperations(
    deps.dir,
    provider,
    new Date(clock(deps)).toISOString(),
    "The switch worker stopped before reporting a result.",
  );
}

export async function performSwitch(deps: FlowDeps, req: SwitchRequest): Promise<SwitchResult> {
  if (!isSwitchRequest(req)) return { state: "failed", message: "Invalid switch request." };
  const provider = req.provider;
  const name = PROVIDER_NAMES[provider];
  const lock = await acquireLock(deps.dir, `provider-${provider}`, {
    purpose: "switch",
    waitMs: deps.switchLockWaitMs ?? SWITCH_LOCK_WAIT_MS,
  });
  if (!lock) {
    const message = `Another refresh or switch is still running for ${name}; try again shortly.`;
    // Record the refusal, so a list watching this request reports it instead of waiting for a result.
    const at = new Date(clock(deps)).toISOString();
    try {
      await insertOperation(deps.dir, {
        requestId: req.requestId,
        provider,
        targetKey: req.targetKey,
        targetLabel: sanitize(req.targetLabel),
        state: "failed",
        startedAt: at,
        finishedAt: at,
        message,
        outcome: "failed",
      });
    } catch {
      // the returned result still reports the refusal
    }
    return { state: "failed", message };
  }

  let outcome: SwitchOutcome;
  let record: StoredOperationRecord;
  let refresh = true;
  try {
    // A request id runs at most once, even if the command is launched again with the same context.
    const previous = readOperations(deps.dir).find((r) => r.requestId === req.requestId);
    if (previous) {
      return {
        state: "failed",
        message: `This switch request was already handled (${previous.state}); not repeating it.`,
      };
    }
    try {
      await reconcileOrphans(deps, provider);
    } catch {
      // bookkeeping only; the new switch validates its own target
    }

    record = {
      requestId: req.requestId,
      provider,
      targetKey: req.targetKey,
      targetLabel: sanitize(req.targetLabel),
      state: "running",
      startedAt: new Date(clock(deps)).toISOString(),
      finishedAt: null,
      message: null,
      lockToken: lock.token,
      generation: readSnapshot(deps.dir).providers[provider].identityGeneration,
    };
    try {
      await upsertOperation(deps.dir, record);
    } catch (error) {
      return { state: "failed", message: `Could not record the switch, so nothing was changed: ${errorText(error)}` };
    }

    try {
      const raw = await deps.switchers[provider](req, { onSpawn: (pid) => lock.setChildPid(pid) });
      outcome = normalizeOutcome(raw);
    } catch (error) {
      // The switcher may have changed credentials before throwing; never claim it did not.
      outcome = { state: "unknown", message: `Switch outcome unknown: ${errorText(error)}` };
    }
    if (!outcome.message) outcome.message = defaultMessage(outcome.state, name, req.targetLabel);
    outcome.message = withWarning(outcome.message, outcome.warning);

    try {
      if (outcome.state === "succeeded" || outcome.state === "noop") {
        await commitSwitch(deps.dir, provider, outcome.activeKey ?? req.targetKey);
      } else if (outcome.state === "unknown") {
        await invalidateIdentity(deps.dir, provider);
      }
    } catch {
      // The post-switch refresh below re-observes the active account.
    }

    try {
      await upsertOperation(deps.dir, {
        ...record,
        state: recordState(outcome.state),
        finishedAt: new Date(clock(deps)).toISOString(),
        message: outcome.message,
        outcome: outcome.state,
      });
    } catch {
      // the switch already happened; a missing record must not turn it into a failure
    }
    if (outcome.state === "handoff") refresh = false; // nothing changed yet; the user finishes in CodexBar
  } finally {
    lock.release();
  }

  if (!refresh) return toResult(outcome);
  let refreshed: RefreshOutcome | null;
  try {
    refreshed = await refreshProvider(deps.dir, provider, deps.fetchers[provider], {
      waitMs: POST_SWITCH_REFRESH_WAIT_MS,
    });
  } catch {
    refreshed = null;
  }
  // "busy": a refresh that started after our commit holds the lock and will publish post-switch data.
  const refreshFailed = refreshed === null || refreshed.kind === "failed";

  // An unclear outcome is upgraded only on positive evidence: a fresh observation shows the target active.
  // Never when the switcher reported a warning: a refresh of the live login cannot disprove it (e.g. the
  // displaced account's saved copy changed), so the outcome and its warning stand.
  if (outcome.state === "unknown" && !outcome.warning && refreshed?.kind === "committed") {
    const target = readSnapshot(deps.dir).providers[provider].accounts.find((a) => a.key === req.targetKey);
    if (target?.active === true) {
      outcome = {
        state: "succeeded",
        message: `${name} now uses ${sanitize(req.targetLabel)} (confirmed by a refresh).`,
      };
      try {
        await upsertOperation(deps.dir, {
          ...record,
          state: "succeeded",
          finishedAt: new Date(clock(deps)).toISOString(),
          message: outcome.message,
          outcome: "succeeded",
        });
      } catch {
        // the snapshot already shows the result
      }
    }
  }
  if (refreshFailed && outcome.state !== "failed") {
    return toResult(outcome, `${sentence(outcome.message)} Usage refresh failed; showing previous readings.`);
  }
  return toResult(outcome);
}

/**
 * After performSwitch returned (or threw), make sure the request's record carries a final result, so a list that
 * follows the request by id never waits on a record that was never written (e.g. the record write failed) or never
 * finalized. A final record is left alone: a repeated request id keeps the outcome of its first run.
 */
export async function ensureFinalRecord(dir: string, req: SwitchRequest, result: SwitchResult): Promise<void> {
  const previous = readOperations(dir).find((r) => r.requestId === req.requestId);
  if (previous && previous.state !== "running") return;
  const now = new Date().toISOString();
  await upsertOperation(dir, {
    ...(previous ?? {}),
    requestId: req.requestId,
    provider: req.provider,
    targetKey: req.targetKey,
    targetLabel: sanitize(req.targetLabel),
    state: recordState(result.state),
    startedAt: previous?.startedAt ?? now,
    finishedAt: now,
    message: sanitize(withWarning(result.message, result.warning), OUTCOME_TEXT_MAX * 2),
    outcome: result.state,
  });
}

function sentence(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function defaultMessage(state: SwitchResult["state"], name: string, label: string): string {
  switch (state) {
    case "succeeded":
      return `${name} switched to ${label}.`;
    case "noop":
      return `${label} is already the active ${name} account.`;
    case "handoff":
      return `Finish switching ${name} to ${label} in CodexBar.`;
    case "failed":
      return `${name} switch to ${label} failed.`;
    default:
      return `${name} switch outcome unknown.`;
  }
}

// ---------------------------------------------------------------------------
// View-model helpers shared by the list and the menu bar (pure, so they are tested here)

/**
 * Visibly distinct display labels, in the "Label (extra)" form suggestions use. A duplicate group
 * takes the first of workspace, email, plan that is present and distinct for every member; otherwise
 * each member gets its workspace/email/plan where available, plus an ordinal while still ambiguous.
 */
export function displayLabels(accounts: Account[]): Map<string, string> {
  const out = new Map<string, string>();
  const byLabel = new Map<string, Account[]>();
  for (const a of accounts) {
    const k = a.label.toLowerCase();
    byLabel.set(k, [...(byLabel.get(k) ?? []), a]);
  }
  const usable = (a: Account, v: string | null): v is string =>
    typeof v === "string" && v.trim() !== "" && v.toLowerCase() !== a.label.toLowerCase();
  const extras: ((a: Account) => string | null)[] = [(a) => a.workspace, (a) => a.email, (a) => a.plan];
  for (const group of byLabel.values()) {
    if (group.length === 1) {
      out.set(group[0].key, group[0].label);
      continue;
    }
    const distinctBy = extras.find((get) => {
      const values = group.map((a) => get(a));
      return (
        group.every((a, i) => usable(a, values[i])) &&
        new Set(values.map((v) => (v ?? "").toLowerCase())).size === group.length
      );
    });
    if (distinctBy) {
      for (const a of group) out.set(a.key, `${a.label} (${distinctBy(a)})`);
      continue;
    }
    const candidates = group.map((a) => {
      const extra = extras.map((get) => get(a)).find((v): v is string => usable(a, v));
      return extra ? `${a.label} (${extra})` : a.label;
    });
    const counts = new Map<string, number>();
    for (const c of candidates) counts.set(c.toLowerCase(), (counts.get(c.toLowerCase()) ?? 0) + 1);
    const seen = new Map<string, number>();
    group.forEach((a, i) => {
      const c = candidates[i];
      const lower = c.toLowerCase();
      if ((counts.get(lower) ?? 0) > 1) {
        const n = (seen.get(lower) ?? 0) + 1;
        seen.set(lower, n);
        out.set(a.key, `${c} #${n}`);
      } else {
        out.set(a.key, c);
      }
    });
  }
  return out;
}

export type Level = "good" | "low" | "critical" | "unknown";

/** Color bucket for a remaining percentage: >= 50 good, >= threshold low, below critical. */
export function remainingLevel(value: number | null, threshold: number): Level {
  if (typeof value !== "number" || !Number.isFinite(value)) return "unknown";
  if (value >= 50) return "good";
  if (value >= threshold) return "low";
  return "critical";
}

/** Human name for a ProviderFetch.source. */
export function sourceName(source: string | null): string | null {
  if (!source) return null;
  if (source === "cswap") return "claude-swap";
  if (source === "codexbar") return "CodexBar";
  if (source === "codexbar-ambient") return "CodexBar, current login";
  return source;
}
