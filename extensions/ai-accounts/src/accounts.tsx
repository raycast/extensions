import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Image,
  Keyboard,
  LaunchProps,
  List,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { sanitize } from "./lib/exec";
import { displayLabels, PROVIDER_NAMES, refreshStale, RefreshResult, sourceName } from "./lib/flow";
import {
  DISPLAY_MAX_AGE_MINUTES,
  formatAge,
  formatCountdown,
  formatLocalTime,
  formatPct,
  remainingPct,
  windowAgeMinutes,
  windowPastReset,
} from "./lib/format";
import {
  Account,
  OperationRecord,
  Pace,
  Provider,
  PROVIDERS,
  Snapshot,
  Suggestion,
  SwitchRequest,
  UsageWindow,
} from "./lib/model";
import { providerLockHeld, readOperations, readSnapshot, readSuggestionState, writeSuggestionState } from "./lib/store";
import { headroom, isSwitchBlockedInfo, suggest } from "./lib/suggest";
import {
  activeRowId,
  canRepairLogin,
  displayHeadroom,
  PercentMode,
  sessionWindow,
  switchWatchDone,
  toShown,
  unresolvedOperation,
  weeklyWindow,
  windowName,
} from "./lib/display";
import {
  buildDeps,
  codexPreflightProblem,
  getConfig,
  levelColor,
  openCodexBar,
  dismissRow,
  openAddClaudeAccountInTerminal,
  readDismissedRows,
  openCswapDashboardInTerminal,
  refreshMenuBar,
  requestSwitch,
  stateDir,
} from "./raycast/runtime";

const LIST_MAX_AGE_MS = 60_000;
const WATCH_INTERVAL_MS = 1_500;
const WATCH_TIMEOUT_MS = 20_000;
/** A watch that outlives WATCH_TIMEOUT_MS (a switch) re-reads less often. */
const SLOW_WATCH_INTERVAL_MS = 4_000;
/**
 * A switch is followed until its record settles and its post-switch refresh lands: up to a minute of lock wait,
 * a Codex daemon stop that waits out a running turn (shutdownGraceSeconds, up to 5 min), and the refresh.
 */
const SWITCH_WATCH_TIMEOUT_MS = 6 * 60_000;
const UNKNOWN_TEXT = "Switch outcome unknown — check the list before trying again";
/** LocalStorage key (per viewer) holding the request ids of switch notices the user hid. */
const HIDDEN_OPERATIONS_KEY = "hiddenOperationNotices";
/** Where a switch happens when one-key switching is blocked for a row. */
const HANDOFF_NAMES: Record<Provider, string> = { claude: "claude-swap", codex: "CodexBar" };

// ---------------------------------------------------------------------------
// Pure-ish helpers

function isStale(account: Account, nowMs: number): boolean {
  if (account.lastGood) return true;
  return account.windows.some((w) => {
    if (w.usedPct === null) return false;
    const age = windowAgeMinutes(w, nowMs);
    return age === null || age > DISPLAY_MAX_AGE_MINUTES;
  });
}

function windowStale(account: Account, w: UsageWindow, nowMs: number): boolean {
  if (account.lastGood) return true;
  const age = windowAgeMinutes(w, nowMs);
  return age === null || age > DISPLAY_MAX_AGE_MINUTES;
}

function shortLabel(w: UsageWindow): string {
  return w.kind === "weekly" ? "Wk" : w.label;
}

function resetText(w: UsageWindow, nowMs: number): string {
  if (!w.resetsAt) return "reset time unknown";
  if (windowPastReset(w, nowMs)) return `reset ${formatLocalTime(w.resetsAt)}, awaiting a new reading`;
  return `resets ${formatLocalTime(w.resetsAt)} (in ${formatCountdown(w.resetsAt, nowMs)})`;
}

function windowTooltip(w: UsageWindow, nowMs: number): string {
  return `${windowName(w)} ${resetText(w, nowMs)} · observed ${formatAge(w.observedAt, nowMs)}`;
}

function windowValueText(w: UsageWindow, nowMs: number, mode: PercentMode): string {
  return windowPastReset(w, nowMs) ? "↻" : formatPct(toShown(remainingPct(w), mode));
}

function paceText(pace: Pace | undefined): string | null {
  if (!pace) return null;
  const parts: string[] = [];
  if (pace.summary) parts.push(pace.summary);
  else if (pace.willLastToReset === false) parts.push("will not last to reset");
  else if (pace.willLastToReset === true) parts.push("on track to last until reset");
  if (pace.projectedExhaustionAt) parts.push(`runs out around ${formatLocalTime(pace.projectedExhaustionAt)}`);
  return parts.length ? `${parts.join(" · ")} (approximate)` : null;
}

const STATUS_TAGS: Record<Account["status"], { value: string; color: Color } | null> = {
  ok: null,
  error: { value: "Error", color: Color.Red },
  relogin: { value: "Re-login", color: Color.Red },
  unavailable: { value: "No Data", color: Color.SecondaryText },
  disabled: { value: "Disabled", color: Color.SecondaryText },
};

const STATUS_TEXT: Record<Account["status"], string> = {
  ok: "OK",
  error: "Error",
  relogin: "Needs a new login",
  unavailable: "No usage data",
  disabled: "Disabled in claude-swap",
};

function suggestionIcon(s: Suggestion): Image.ImageLike {
  switch (s.kind) {
    case "exhausted":
      return { source: Icon.ExclamationMark, tintColor: Color.Red };
    case "switch":
      return { source: Icon.Switch, tintColor: Color.Blue };
    case "pace":
      return { source: Icon.Gauge, tintColor: Color.Orange };
    case "expiring":
      return { source: Icon.Hourglass, tintColor: Color.Purple };
    default:
      return { source: Icon.Info, tintColor: Color.SecondaryText };
  }
}

function cswapSlot(account: Account): number | null {
  return account.switchTarget?.kind === "cswap" ? account.switchTarget.slot : null;
}

function snapshotKey(snap: Snapshot): string {
  return PROVIDERS.map((p) => {
    const s = snap.providers[p];
    return `${s.revision}|${s.identityGeneration}|${s.lastAttemptAt ?? ""}|${s.lastError ?? ""}`;
  }).join("#");
}

/** Operation records change without a snapshot change (a refused or failed switch), and the list shows them. */
function operationsKey(records: OperationRecord[]): string {
  return records.map((r) => `${r.requestId}|${r.state}|${r.finishedAt ?? ""}`).join("#");
}

function outcomeKind(result: RefreshResult): string {
  return result === "fresh" ? "fresh" : result.kind;
}

// ---------------------------------------------------------------------------

/** launchContext.action "add-claude": the menu bar asked to add a Claude account (runs here, where it can finish). */
export default function Command(props: LaunchProps<{ launchContext?: { action?: string } }>) {
  const cfg = useMemo(() => getConfig(), []);
  const dir = useMemo(() => stateDir(), []);
  const deps = useMemo(() => buildDeps(cfg), [cfg]);
  const [snapshot, setSnapshot] = useState<Snapshot>(() => readSnapshot(dir));
  const [refreshing, setRefreshing] = useState(0);
  const [watching, setWatching] = useState(0);
  const [showDetail, setShowDetail] = useState(false);
  // The first render uses the cached snapshot; suggestion bookkeeping is persisted only after the initial refresh.
  const [settled, setSettled] = useState(false);
  const [hiddenOps, setHiddenOps] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(() => readDismissedRows());
  const mounted = useRef(true);
  const timers = useRef(new Set<NodeJS.Timeout>());
  const lastKey = useRef("");

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      for (const t of timers.current) clearTimeout(t);
      timers.current.clear();
    };
  }, []);

  function reload(): Snapshot {
    const snap = readSnapshot(dir);
    const key = `${snapshotKey(snap)}@${operationsKey(readOperations(dir))}`;
    if (mounted.current && key !== lastKey.current) {
      lastKey.current = key;
      setSnapshot(snap);
    }
    return snap;
  }

  /**
   * Re-read the snapshot until `done` says so or the timeout passes (default 20 s): every 1.5 s, then every 4 s
   * once past 20 s, when `onSlow` runs once. Bounded, never a standing poll.
   */
  function watch(
    done: (snap: Snapshot) => boolean,
    onEnd?: (timedOut: boolean) => void,
    opts: { timeoutMs?: number; onSlow?: () => void } = {},
  ): void {
    const started = Date.now();
    const timeoutMs = opts.timeoutMs ?? WATCH_TIMEOUT_MS;
    let slow = false;
    setWatching((n) => n + 1);
    const schedule = (ms: number) => {
      const t = setTimeout(() => {
        timers.current.delete(t);
        tick();
      }, ms);
      timers.current.add(t);
    };
    const tick = () => {
      if (!mounted.current) return;
      const snap = reload();
      const finished = done(snap);
      const elapsed = Date.now() - started;
      if (finished || elapsed >= timeoutMs) {
        setWatching((n) => n - 1);
        onEnd?.(!finished);
        return;
      }
      if (!slow && elapsed >= WATCH_TIMEOUT_MS) {
        slow = true;
        opts.onSlow?.();
      }
      schedule(slow ? SLOW_WATCH_INTERVAL_MS : WATCH_INTERVAL_MS);
    };
    schedule(WATCH_INTERVAL_MS);
  }

  async function refresh(force: boolean, providers?: readonly Provider[]): Promise<void> {
    setRefreshing((n) => n + 1);
    const before = readSnapshot(dir);
    try {
      const results = await refreshStale(deps, {
        maxAgeMs: LIST_MAX_AGE_MS,
        force,
        providers,
        onSettled: () => reload(),
      });
      reload();
      const kinds = PROVIDERS.map((p) => [p, outcomeKind(results[p])] as const);
      if (kinds.some(([, k]) => k === "committed")) void refreshMenuBar();
      const busy = kinds.filter(([, k]) => k === "busy").map(([p]) => p);
      if (busy.length > 0) {
        // Another command holds the provider lock; pick up its result when it commits.
        watch((snap) =>
          busy.every((p) => {
            const was = before.providers[p];
            const now = snap.providers[p];
            return now.revision !== was.revision || now.lastAttemptAt !== was.lastAttemptAt;
          }),
        );
      }
      if (force) {
        const failed = kinds.filter(([, k]) => k === "failed").map(([p]) => PROVIDER_NAMES[p]);
        if (failed.length > 0) {
          await showToast({ style: Toast.Style.Failure, title: `Refresh failed: ${failed.join(", ")}` });
        }
      }
    } catch (error) {
      if (mounted.current) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Refresh failed",
          message: sanitize(error instanceof Error ? error.message : error),
        });
      }
    } finally {
      if (mounted.current) setRefreshing((n) => n - 1);
    }
  }

  useEffect(() => {
    void refresh(false).finally(() => {
      if (mounted.current) setSettled(true);
    });
    if (props.launchContext?.action === "add-claude") void addClaudeAccount();
    // The add-account terminal reopens the list this way once sign-in finished: show the new account now.
    if (props.launchContext?.action === "refresh-claude") void refresh(true, ["claude"]);
    LocalStorage.getItem<string>(HIDDEN_OPERATIONS_KEY)
      .then((raw) => {
        const ids: unknown = raw ? JSON.parse(raw) : [];
        if (mounted.current && Array.isArray(ids)) setHiddenOps(ids.filter((x): x is string => typeof x === "string"));
      })
      .catch(() => undefined);
  }, []);

  function hideOperation(op: OperationRecord): void {
    // Keep the list short: only ids still present in the operations file matter.
    const known = new Set(readOperations(dir).map((r) => r.requestId));
    const next = [...hiddenOps.filter((id) => known.has(id)), op.requestId];
    setHiddenOps(next);
    LocalStorage.setItem(HIDDEN_OPERATIONS_KEY, JSON.stringify(next)).catch(() => undefined);
  }

  /** One-key switching is blocked for this row: open the app where the switch can be made instead. */
  async function handOff(account: Account): Promise<void> {
    const opened = account.provider === "codex" ? await openBar() : await openDashboard();
    if (!opened) return;
    await showToast({
      style: Toast.Style.Success,
      title: `Switch in ${HANDOFF_NAMES[account.provider]}`,
      message: account.switchBlocked,
    });
  }

  async function startSwitch(account: Account, label: string, title = "Switching…"): Promise<void> {
    if (account.switchBlocked) {
      await handOff(account);
      return;
    }
    if (account.provider === "codex" && cfg.codexSwitchMode === "direct") {
      const problem = codexPreflightProblem(account, cfg);
      if (problem) {
        await showToast({ style: Toast.Style.Failure, title: "Cannot switch Codex", message: problem });
        return;
      }
    }
    const toast = await showToast({ style: Toast.Style.Animated, title, message: label });
    let req: SwitchRequest;
    try {
      // "list": the list reports the outcome itself (the worker shows no HUD, which would close this window).
      req = await requestSwitch(account, "list", label);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not start the switch";
      toast.message = sanitize(error instanceof Error ? error.message : error);
      return;
    }
    // Records written before outcomes were stored: codexbar mode meant a hand-off.
    const legacyHandoff = account.provider === "codex" && cfg.codexSwitchMode === "codexbar";
    let reported: string | null = null;
    watch(
      (snap) => {
        const op = readOperations(dir).find((r) => r.requestId === req.requestId);
        if (!op || op.state === "running") return false;
        const handoff = op.outcome === "handoff" || (op.outcome === undefined && legacyHandoff);
        // Re-report if the record changes (an unclear outcome can be confirmed by the post-switch refresh).
        if (reported !== op.state) {
          reported = op.state;
          if (op.state === "succeeded") {
            // noop and hand-off outcomes are recorded as succeeded; the outcome and message say which.
            toast.style = Toast.Style.Success;
            toast.title = handoff ? "Continue in CodexBar" : "Switch finished";
            toast.message = op.message ?? label;
          } else if (op.state === "failed") {
            toast.style = Toast.Style.Failure;
            toast.title = "Switch failed";
            toast.message = op.message ?? undefined;
          } else {
            toast.style = Toast.Style.Failure;
            toast.title = UNKNOWN_TEXT;
            toast.message = op.message ?? undefined;
          }
        }
        // Done once the post-switch refresh has landed, or once nothing will land (see switchWatchDone).
        if (handoff) return true;
        return switchWatchDone(
          op,
          snap.providers[account.provider].lastAttemptAt,
          providerLockHeld(dir, account.provider),
          Date.now(),
        );
      },
      (timedOut) => {
        if (timedOut && reported === null) {
          toast.style = Toast.Style.Failure;
          toast.title = "Switch still running";
          toast.message = "It has not finished after several minutes; reopen AI Accounts later to see the result.";
        }
      },
      {
        timeoutMs: SWITCH_WATCH_TIMEOUT_MS,
        onSlow: () => {
          if (reported !== null) return;
          toast.style = Toast.Style.Animated;
          toast.title = "Switch still running";
          toast.message = "The list updates when it finishes.";
        },
      },
    );
  }

  async function actOnSuggestion(s: Suggestion): Promise<void> {
    // Recompute right before acting: time, prefs or the active account may have changed since render.
    const snap = readSnapshot(dir);
    const current = suggest(snap, cfg.suggestion, Date.now(), readSuggestionState(dir)).suggestions.find(
      (x) => x.id === s.id && x.targetKey === s.targetKey,
    );
    const accounts = snap.providers[s.provider].accounts;
    const target = current ? accounts.find((a) => a.key === current.targetKey) : undefined;
    if (!current || !target) {
      reload();
      await showToast({
        style: Toast.Style.Failure,
        title: "Suggestion changed",
        message: "Review the updated list before switching.",
      });
      return;
    }
    await startSwitch(target, displayLabels(accounts).get(target.key) ?? target.label);
  }

  async function openDashboard(): Promise<boolean> {
    try {
      await openCswapDashboardInTerminal(cfg.cswapPath);
      return true;
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not open a terminal",
        message: sanitize(error instanceof Error ? error.message : error),
      });
      return false;
    }
  }

  /**
   * Open the sign-in tab for another Claude account, then refresh every 10 s (bounded, 4 min) until claude-swap
   * reports an account it did not have before, so the new row appears without reopening the list.
   */
  async function addClaudeAccount(): Promise<void> {
    const before = readSnapshot(dir).providers.claude;
    if (before.source !== "cswap") {
      await showToast({
        style: Toast.Style.Failure,
        title: "claude-swap is not available",
        message: "Install it (uv tool install claude-swap) or fix its path in the preferences",
      });
      return;
    }
    const current = before.accounts.find((a) => a.active === true);
    if (current?.loginRepair) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Repair the current Claude login first",
        message: "Its saved copy belongs to another account; adding now could overwrite it",
      });
      return;
    }
    // The new account is the one that becomes active and differs from today's login (the terminal saves the
    // current login first, which may add it as a slot too, so "any new slot" is not enough).
    const startEmail = current?.email?.trim().toLowerCase() ?? null;
    try {
      await openAddClaudeAccountInTerminal(cfg.cswapPath);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not open a terminal",
        message: sanitize(error instanceof Error ? error.message : error),
      });
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Sign in to the new account in the terminal",
      message: "It appears here once it is added",
    });
    const started = Date.now();
    const tick = async () => {
      if (!mounted.current) return;
      // Only Claude can change here; claude-swap serves --list from its own cache, so this costs no API budget.
      await refresh(true, ["claude"]);
      const added = readSnapshot(dir).providers.claude.accounts.find(
        (a) =>
          a.switchTarget?.kind === "cswap" &&
          a.active === true &&
          (a.email?.trim().toLowerCase() ?? null) !== startEmail,
      );
      if (added) {
        toast.style = Toast.Style.Success;
        toast.title = "Claude account added";
        toast.message = added.email ?? added.label;
        return;
      }
      if (Date.now() - started >= 4 * 60_000) {
        toast.style = Toast.Style.Failure;
        toast.title = "No new Claude account yet";
        toast.message = "Finish signing in, then refresh (⌘R)";
        return;
      }
      const t = setTimeout(() => void tick(), 10_000);
      timers.current.add(t);
    };
    const t = setTimeout(() => void tick(), 10_000);
    timers.current.add(t);
  }

  async function openBar(): Promise<boolean> {
    try {
      await openCodexBar();
      return true;
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not open CodexBar",
        message: sanitize(error instanceof Error ? error.message : error),
      });
      return false;
    }
  }

  // Suggestions are derived at render time from the snapshot, never cached.
  const nowMs = Date.now();
  const { suggestions, nextState } = suggest(snapshot, cfg.suggestion, nowMs, readSuggestionState(dir));
  const nextStateKey = JSON.stringify(nextState);
  useEffect(() => {
    // A cached snapshot can be minutes old; persisting its outcome would clear suggestions the refresh restores.
    if (!settled) return;
    writeSuggestionState(dir, nextState).catch(() => undefined);
  }, [nextStateKey, settled]);
  const operations = readOperations(dir);

  const actionable = suggestions.filter((s) => s.targetKey);
  const info = suggestions.filter((s) => !s.targetKey);
  const labels: Record<Provider, Map<string, string>> = {
    claude: displayLabels(snapshot.providers.claude.accounts),
    codex: displayLabels(snapshot.providers.codex.accounts),
  };
  const isLoading = refreshing > 0 || watching > 0;

  // Adding needs claude-swap: the terminal flow saves the current login there before signing in.
  const canAddClaude = snapshot.providers.claude.source === "cswap";
  const commonActions = (
    <>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => void refresh(true)}
      />
      <Action
        title="Toggle Details"
        icon={Icon.Sidebar}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onAction={() => setShowDetail((v) => !v)}
      />
    </>
  );
  const toolActions = (
    <>
      <Action
        title="Open CodexBar"
        icon={Icon.AppWindow}
        shortcut={Keyboard.Shortcut.Common.Open}
        onAction={() => void openBar()}
      />
      {canAddClaude ? (
        <Action
          title="Add Claude Account…"
          icon={Icon.PlusCircle}
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={() => void addClaudeAccount()}
        />
      ) : null}
      <Action
        title="Open claude-swap Dashboard in Terminal"
        icon={Icon.Terminal}
        shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
        onAction={() => void openDashboard()}
      />
    </>
  );

  function switchAction(account: Account, label: string): ReactElement | null {
    if (account.needsAdd) {
      return <Action title="Add This Account…" icon={Icon.PlusCircle} onAction={() => void addClaudeAccount()} />;
    }
    if (account.active === true) return null;
    if (account.switchBlocked) {
      // Known to be refused: go straight to the app that can switch, without launching a switch.
      // handOff also shows why one-key switching is blocked (e.g. re-login needed).
      return account.provider === "codex" ? (
        <Action title="Open CodexBar to Switch" icon={Icon.AppWindow} onAction={() => void handOff(account)} />
      ) : (
        <Action title="Open claude-swap to Switch" icon={Icon.Terminal} onAction={() => void handOff(account)} />
      );
    }
    const run = () => void startSwitch(account, label);
    if (account.provider === "codex") {
      if (cfg.codexSwitchMode === "codexbar") {
        return <Action title="Open CodexBar to Switch" icon={Icon.Switch} onAction={run} />;
      }
      if (account.switchTarget?.kind === "codex-managed") {
        return <Action title="Switch to This Account" icon={Icon.Switch} onAction={run} />;
      }
      return <Action title="Open CodexBar to Switch" icon={Icon.Switch} onAction={() => void openBar()} />;
    }
    if (account.switchTarget?.kind === "cswap") {
      return <Action title="Switch to This Account" icon={Icon.Switch} onAction={run} />;
    }
    return null;
  }

  /** Active claude-swap row whose live login belongs to another account: a switch to its own slot repairs it. */
  function repairAction(account: Account, label: string): ReactElement | null {
    if (!canRepairLogin(account)) return null;
    return (
      <Action
        title="Repair Claude Login"
        icon={Icon.Hammer}
        onAction={() => void startSwitch(account, label, "Repairing Claude login…")}
      />
    );
  }

  /** ⌘⇧S on any row of a provider acts on that provider's actionable suggestion (revalidated before acting). */
  function suggestedAction(provider: Provider): ReactElement | null {
    const s = actionable.find((x) => x.provider === provider);
    const target = s?.targetKey ? snapshot.providers[provider].accounts.find((a) => a.key === s.targetKey) : undefined;
    if (!s || !target) return null;
    const targetLabel = labels[provider].get(target.key) ?? target.label;
    const title =
      provider === "codex" && cfg.codexSwitchMode === "codexbar"
        ? `Open CodexBar for Suggested (${targetLabel})`
        : `Switch to Suggested (${targetLabel})`;
    return (
      <Action
        title={title}
        icon={Icon.Switch}
        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
        onAction={() => void actOnSuggestion(s)}
      />
    );
  }

  function suggestionItem(s: Suggestion): ReactElement {
    const accounts = snapshot.providers[s.provider].accounts;
    const target = s.targetKey ? accounts.find((a) => a.key === s.targetKey) : undefined;
    const targetLabel = target ? (labels[s.provider].get(target.key) ?? target.label) : null;
    const M = List.Item.Detail.Metadata;
    return (
      <List.Item
        key={`suggestion:${s.id}`}
        id={`suggestion:${s.id}`}
        icon={suggestionIcon(s)}
        title={s.title}
        subtitle={s.detail}
        accessories={[
          ...(s.waitHint ? [{ text: s.waitHint }] : []),
          { tag: { value: PROVIDER_NAMES[s.provider], color: Color.SecondaryText } },
        ]}
        detail={
          <List.Item.Detail
            metadata={
              <M>
                <M.Label title="Suggestion" text={s.title} />
                <M.Label title="Why" text={s.detail} />
                {s.waitHint ? <M.Label title="Alternative" text={s.waitHint} /> : null}
                {targetLabel ? <M.Label title="Switch to" text={targetLabel} /> : null}
                <M.Label title="Provider" text={PROVIDER_NAMES[s.provider]} />
              </M>
            }
          />
        }
        actions={
          <ActionPanel>
            {target && targetLabel ? (
              <Action
                title={
                  s.provider === "codex" && cfg.codexSwitchMode === "codexbar"
                    ? `Open CodexBar to Switch to ${targetLabel}`
                    : `Switch to ${targetLabel}`
                }
                icon={Icon.Switch}
                onAction={() => void actOnSuggestion(s)}
              />
            ) : null}
            {isSwitchBlockedInfo(s) ? (
              s.provider === "codex" ? (
                <Action title="Open CodexBar to Switch" icon={Icon.AppWindow} onAction={() => void openBar()} />
              ) : (
                <Action title="Open claude-swap to Switch" icon={Icon.Terminal} onAction={() => void openDashboard()} />
              )
            ) : null}
            {commonActions}
            <ActionPanel.Section>{toolActions}</ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  /** A switch whose outcome is still unknown (or still running) stays visible until a later switch succeeds. */
  function operationItem(provider: Provider, op: OperationRecord): ReactElement {
    const M = List.Item.Detail.Metadata;
    const running = op.state === "running";
    const title = running ? `Switching to ${op.targetLabel}…` : `Switch to ${op.targetLabel}: outcome unknown`;
    const message = op.message ?? (running ? "The switch has not finished yet." : UNKNOWN_TEXT);
    const when = running
      ? `started ${formatAge(op.startedAt, nowMs)}`
      : formatAge(op.finishedAt ?? op.startedAt, nowMs);
    return (
      <List.Item
        key={`${provider}:operation`}
        id={`${provider}:operation`}
        icon={{ source: running ? Icon.Clock : Icon.Warning, tintColor: running ? Color.Blue : Color.Orange }}
        title={title}
        subtitle={message}
        accessories={[{ text: when, tooltip: message }]}
        detail={
          <List.Item.Detail
            markdown={message}
            metadata={
              <M>
                <M.Label title="Switch to" text={op.targetLabel} />
                <M.Label title="Outcome" text={running ? "Running" : "Unknown"} />
                <M.Label title="Started" text={formatAge(op.startedAt, nowMs)} />
                {op.finishedAt ? <M.Label title="Finished" text={formatAge(op.finishedAt, nowMs)} /> : null}
                <M.Label title="Provider" text={PROVIDER_NAMES[provider]} />
              </M>
            }
          />
        }
        actions={
          <ActionPanel>
            {commonActions}
            <Action.CopyToClipboard title="Copy Message" content={message} />
            {/* A "running" record whose worker died stays until the next switch reconciles it; let it be hidden. */}
            <Action title="Hide This Notice" icon={Icon.EyeDisabled} onAction={() => hideOperation(op)} />
            <ActionPanel.Section>{toolActions}</ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  function accountDetail(account: Account, label: string): ReactElement {
    const M = List.Item.Detail.Metadata;
    const provider = snapshot.providers[account.provider];
    const shown = displayHeadroom(account, cfg.suggestion, nowMs);
    const decision = headroom(account, cfg.suggestion, nowMs);
    const color = levelColor(shown.value, cfg.suggestion.threshold);
    const rows: ReactElement[] = [];
    rows.push(<M.Label key="account" title="Account" text={account.email ?? label} />);
    if (account.alias) rows.push(<M.Label key="alias" title="Alias" text={account.alias} />);
    rows.push(<M.Label key="plan" title="Plan" text={account.plan ?? "—"} />);
    if (account.workspace) rows.push(<M.Label key="workspace" title="Workspace" text={account.workspace} />);
    const activeText = account.active === true ? "Yes" : account.active === false ? "No" : "Unknown";
    rows.push(<M.Label key="active" title="Current login" text={activeText} />);
    rows.push(
      <M.Label
        key="status"
        title="Status"
        text={
          account.statusDetail ? `${STATUS_TEXT[account.status]}: ${account.statusDetail}` : STATUS_TEXT[account.status]
        }
      />,
    );
    rows.push(
      <M.Label
        key="headroom"
        title="Headroom"
        text={{
          value: shown.binding ? `${formatPct(shown.value)} (${windowName(shown.binding)})` : formatPct(shown.value),
          color,
        }}
      />,
    );
    if (decision.value === null && decision.reason) {
      rows.push(<M.Label key="decision" title="Not used for suggestions" text={decision.reason} />);
    }
    if (account.switchBlocked && account.active !== true) {
      rows.push(
        <M.Label key="blocked" title={`Switch in ${HANDOFF_NAMES[account.provider]}`} text={account.switchBlocked} />,
      );
    }
    if (account.lastGood) {
      rows.push(<M.Label key="lastgood" title="Readings" text="Last known values from before the error" />);
    }
    for (const w of account.windows) {
      const remaining = remainingPct(w);
      const stale = windowStale(account, w, nowMs);
      rows.push(<M.Separator key={`${w.id}:sep`} />);
      rows.push(
        <M.Label
          key={`${w.id}:remaining`}
          title={`${windowName(w)} ${cfg.percentMode === "used" ? "used" : "remaining"}`}
          text={{
            value: windowPastReset(w, nowMs) ? "awaiting refresh" : formatPct(toShown(remaining, cfg.percentMode)),
            color: stale ? Color.SecondaryText : levelColor(remaining, cfg.suggestion.threshold),
          }}
        />,
      );
      rows.push(<M.Label key={`${w.id}:reset`} title={`${windowName(w)} reset`} text={resetText(w, nowMs)} />);
      rows.push(
        <M.Label
          key={`${w.id}:observed`}
          title="Observed"
          text={stale ? `${formatAge(w.observedAt, nowMs)} (stale)` : formatAge(w.observedAt, nowMs)}
        />,
      );
      const pace = paceText(w.pace);
      if (pace) rows.push(<M.Label key={`${w.id}:pace`} title="Pace" text={pace} />);
    }
    rows.push(<M.Separator key="tail:sep" />);
    if (account.resetCredits) {
      rows.push(
        <M.Label
          key="credits"
          title="Reset credits"
          text={`${account.resetCredits.available} available · observed ${formatAge(account.resetCredits.observedAt, nowMs)}`}
        />,
      );
    }
    const slot = cswapSlot(account);
    if (slot !== null) rows.push(<M.Label key="slot" title="claude-swap slot" text={String(slot)} />);
    rows.push(<M.Label key="source" title="Source" text={sourceName(provider.source) ?? "—"} />);
    rows.push(<M.Label key="updated" title="Updated" text={formatAge(provider.committedAt, nowMs)} />);
    return <List.Item.Detail metadata={<M>{rows}</M>} />;
  }

  /** Always-present row so adding another Claude account is one Enter away. */
  function addClaudeItem(): ReactElement {
    return (
      <List.Item
        key="claude:add-account"
        id="claude:add-account"
        icon={{ source: Icon.PlusCircle, tintColor: Color.SecondaryText }}
        title="Add Claude Account…"
        subtitle="Sign in once in the terminal; it is tracked and switchable after that"
        actions={
          <ActionPanel>
            <Action title="Add Claude Account…" icon={Icon.PlusCircle} onAction={() => void addClaudeAccount()} />
            {commonActions}
          </ActionPanel>
        }
      />
    );
  }

  function accountItem(account: Account): ReactElement {
    const label = labels[account.provider].get(account.key) ?? account.label;
    const shown = displayHeadroom(account, cfg.suggestion, nowMs);
    const color = levelColor(shown.value, cfg.suggestion.threshold);
    const fraction = shown.value === null ? 0 : shown.value / 100;
    const accessories: List.Item.Accessory[] = [];
    if (account.active === true) accessories.push({ tag: { value: "Active", color: Color.Green } });
    if (account.needsAdd) {
      accessories.push({ tag: { value: "Not added", color: Color.Orange }, tooltip: account.statusDetail });
    }
    if (account.inClaudeApp) {
      accessories.push({
        tag: { value: "Claude app", color: Color.Purple },
        tooltip: "The Claude desktop app is signed in to this account (it keeps its own login)",
      });
    }
    const suggestion = actionable.find((x) => x.targetKey === account.key);
    if (suggestion) {
      accessories.push({
        tag: { value: "Suggested", color: Color.Blue },
        tooltip: [suggestion.title, suggestion.detail, suggestion.waitHint].filter(Boolean).join(" — "),
      });
    }
    if (account.switchBlocked && account.active !== true) {
      accessories.push({
        tag: { value: HANDOFF_NAMES[account.provider], color: Color.SecondaryText },
        tooltip: `Switch in ${HANDOFF_NAMES[account.provider]}: ${account.switchBlocked}`,
      });
    }
    const statusTag = account.needsAdd ? null : STATUS_TAGS[account.status];
    if (statusTag) accessories.push({ tag: statusTag, tooltip: account.statusDetail });
    if (isStale(account, nowMs)) accessories.push({ tag: { value: "Stale", color: Color.Orange } });
    // A not-yet-added login has no usage to show.
    const accessoryWindows = account.needsAdd ? [] : account.windows;
    for (const w of accessoryWindows) {
      const remaining = remainingPct(w);
      accessories.push({
        text: {
          value: `${shortLabel(w)} ${windowValueText(w, nowMs, cfg.percentMode)}`,
          color: windowStale(account, w, nowMs) ? Color.SecondaryText : levelColor(remaining, cfg.suggestion.threshold),
        },
        tooltip: windowTooltip(w, nowMs),
      });
    }
    const weekly = weeklyWindow(account);
    const countdownWindow = sessionWindow(account) ?? weekly ?? shown.binding;
    if (countdownWindow?.resetsAt && !windowPastReset(countdownWindow, nowMs)) {
      accessories.push({
        icon: Icon.Clock,
        text: formatCountdown(countdownWindow.resetsAt, nowMs),
        tooltip: `${windowName(countdownWindow)} ${resetText(countdownWindow, nowMs)}`,
      });
    }
    if (
      account.provider === "claude" &&
      weekly?.resetsAt &&
      weekly !== countdownWindow &&
      !windowPastReset(weekly, nowMs)
    ) {
      accessories.push({
        icon: Icon.Calendar,
        text: `Wk ${formatCountdown(weekly.resetsAt, nowMs)}`,
        tooltip: `${windowName(weekly)} ${resetText(weekly, nowMs)}`,
      });
    }
    const subtitle = [account.plan, account.workspace].filter((x): x is string => !!x).join(" · ");
    const slot = cswapSlot(account);
    return (
      <List.Item
        key={account.key}
        id={account.key}
        icon={
          account.needsAdd
            ? { source: Icon.PlusCircle, tintColor: Color.Orange }
            : account.active === true
              ? { source: Icon.CheckCircle, tintColor: color }
              : getProgressIcon(fraction, color)
        }
        title={label}
        subtitle={subtitle || undefined}
        keywords={[account.email, account.alias, account.plan, account.workspace].filter((x): x is string => !!x)}
        accessories={accessories}
        detail={accountDetail(account, label)}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              {switchAction(account, label)}
              {account.needsAdd ? (
                <Action
                  title="Hide This Account"
                  icon={Icon.EyeDisabled}
                  onAction={() => {
                    dismissRow(account.key);
                    setDismissed(readDismissedRows());
                  }}
                />
              ) : null}
              {commonActions}
              {repairAction(account, label)}
              {suggestedAction(account.provider)}
            </ActionPanel.Section>
            <ActionPanel.Section>
              {account.email ? (
                <Action.CopyToClipboard
                  title="Copy Email"
                  content={account.email}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                />
              ) : null}
              {slot !== null ? (
                <Action.CopyToClipboard
                  title={`Copy "cswap run ${slot} --share-history" Command`}
                  content={`cswap run ${slot} --share-history`}
                />
              ) : null}
              {toolActions}
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  function providerSection(provider: Provider): ReactElement {
    const state = snapshot.providers[provider];
    const source = sourceName(state.source);
    const items: ReactElement[] = [];
    const warn = (key: string, title: string, subtitle: string | undefined, tint: Color, tooltip?: string) =>
      items.push(
        <List.Item
          key={`${provider}:${key}`}
          id={`${provider}:${key}`}
          icon={{ source: Icon.Warning, tintColor: tint }}
          title={title}
          subtitle={subtitle}
          accessories={tooltip ? [{ text: tooltip }] : undefined}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title={title} text={subtitle ?? ""} />
                  {tooltip ? <List.Item.Detail.Metadata.Label title="When" text={tooltip} /> : null}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              {commonActions}
              <ActionPanel.Section>{toolActions}</ActionPanel.Section>
            </ActionPanel>
          }
        />,
      );
    // Accounts come first so the list opens on something you can press Enter on;
    // an unsettled switch, notes, notices and errors follow them.
    for (const account of state.accounts) {
      if (account.needsAdd && dismissed.includes(account.key)) continue;
      items.push(accountItem(account));
    }
    if (provider === "claude" && canAddClaude) items.push(addClaudeItem());
    const op = unresolvedOperation(operations, provider);
    if (op && !hiddenOps.includes(op.requestId)) items.push(operationItem(provider, op));
    info.filter((x) => x.provider === provider).forEach((x) => items.push(suggestionItem(x)));
    if (state.lastError) {
      warn("error", "Refresh failed", state.lastError, Color.Red, `tried ${formatAge(state.lastAttemptAt, nowMs)}`);
    }
    state.notices.forEach((n, i) => warn(`notice:${i}`, n, undefined, Color.Yellow));
    if (state.accounts.length > 0 && state.accounts.every((a) => a.active === "unknown")) {
      warn("active-unknown", "Current login unknown", "Refresh to check which account is active", Color.Yellow);
    }
    if (state.accounts.length === 0 && !state.lastError) {
      items.push(
        <List.Item
          key={`${provider}:empty`}
          id={`${provider}:empty`}
          icon={Icon.Circle}
          title={isLoading || state.committedAt === null ? "Loading…" : "No accounts found"}
          actions={<ActionPanel>{commonActions}</ActionPanel>}
        />,
      );
    }
    // Rows that only offer "Add This Account" are not tracked accounts yet.
    const count = state.accounts.filter((a) => !a.needsAdd).length;
    const pendingAdds = state.accounts.filter((a) => a.needsAdd && !dismissed.includes(a.key)).length;
    const legend = cfg.percentMode === "used" ? "% used" : "% left";
    return (
      <List.Section
        key={provider}
        title={source ? `${PROVIDER_NAMES[provider]} · ${source}` : PROVIDER_NAMES[provider]}
        subtitle={
          state.committedAt
            ? `${count} account${count === 1 ? "" : "s"}${pendingAdds ? ` + ${pendingAdds} to add` : ""} · ${legend} · updated ${formatAge(state.committedAt, nowMs)}`
            : undefined
        }
      >
        {items}
      </List.Section>
    );
  }

  // Open on the active account, so a reflexive Enter refreshes instead of switching. After a switch the
  // active key changes and the selection follows it to the row the user just chose.
  const selectedId = activeRowId(snapshot);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      searchBarPlaceholder="Filter accounts"
      selectedItemId={selectedId}
    >
      {PROVIDERS.map(providerSection)}
    </List>
  );
}
