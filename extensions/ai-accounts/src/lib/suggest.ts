import {
  currentWindowRemaining,
  DISPLAY_MAX_AGE_MINUTES,
  formatAge,
  formatCountdown,
  formatLocalTime,
  formatPct,
  parseIsoMs,
  remainingPct,
  windowAgeMinutes,
  windowPastReset,
} from "./format";
import {
  Account,
  PROVIDERS,
  Provider,
  Snapshot,
  Suggestion,
  SuggestionKind,
  SuggestionPrefs,
  SuggestionState,
  UsageWindow,
} from "./model";

// Pure suggestion engine. No clock reads: every time-dependent decision uses nowMs.
//
// Headroom is the minimum remaining percentage across the applicable windows, and it is
// KNOWN only when every applicable window is decision-grade. A single unknown, stale or
// past-reset window makes the whole account unknown: dropping it could hide the limit
// that blocks the work (session 90% fresh + weekly stale is unknown, not 90).

export interface Headroom {
  value: number | null;
  binding: UsageWindow | null;
  reason?: string;
  windows: UsageWindow[];
}

export interface HeadroomOptions {
  /**
   * Fixed freshness limit in minutes, for display. It replaces the decision limit entirely, so a
   * backend-vouched horizon (UsageWindow.decisionMaxAgeMinutes) never loosens display staleness.
   */
  maxAgeMinutes?: number;
}

/** Remaining at or below this counts as out of quota. */
const EXHAUSTED_AT = 0.5;
/** Upper bound on a backend-vouched decision horizon (cswap never trusts a reading for longer than an hour). */
const MAX_VOUCHED_AGE_MINUTES = 60;
/** A switch suggestion that is on stays on until active headroom reaches threshold + this. */
const HYSTERESIS_PP = 5;
/** A cleared suggestion id stays quiet this long (exhausted overrides). */
const COOLDOWN_MS = 5 * 60_000;
/** Offer "or wait" only when the binding session window resets within this. */
const WAIT_HINT_MS = 30 * 60_000;
const EXPIRING_WITHIN_MS = 24 * 60 * 60_000;
const EXPIRING_MIN_REMAINING = 30;
/** Weekday-only times are unambiguous only within a week. */
const PACE_TIME_MAX_MS = 7 * 24 * 60 * 60_000;

const PROVIDER_NAME: Record<Provider, string> = { claude: "Claude", codex: "Codex" };
/** Where a switch happens when one-key switching is blocked. */
const HANDOFF_NAME: Record<Provider, string> = { claude: "claude-swap", codex: "CodexBar" };
const ACTIONABLE: ReadonlySet<string> = new Set<SuggestionKind>(["exhausted", "switch", "pace", "expiring"]);
const SWITCH_BLOCKED_INFO = "switch-blocked";

/** true for the info item that stands in for a suggestion whose target cannot be switched to with one key. */
export function isSwitchBlockedInfo(s: Suggestion): boolean {
  return s.kind === "info" && s.id.startsWith(`${s.provider}:info:${SWITCH_BLOCKED_INFO}:`);
}

/**
 * Freshness limit for one window's decisions: the backend-vouched horizon when the adapter set one
 * (bounded by MAX_VOUCHED_AGE_MINUTES), otherwise the preference.
 */
export function decisionMaxAge(w: UsageWindow, prefs: SuggestionPrefs): number {
  const vouched = w.decisionMaxAgeMinutes;
  if (typeof vouched === "number" && Number.isFinite(vouched) && vouched >= 0) {
    return Math.min(vouched, MAX_VOUCHED_AGE_MINUTES);
  }
  return prefs.decisionMaxAgeMinutes;
}

/** Session and weekly windows always count; model-scoped windows only when the preference is on. */
export function applicableWindows(account: Account, prefs: SuggestionPrefs): UsageWindow[] {
  return (account.windows ?? []).filter(
    (w) => w.kind === "session" || w.kind === "weekly" || (w.kind === "scoped" && prefs.includeScopedWindows),
  );
}

export function headroom(
  account: Account,
  prefs: SuggestionPrefs,
  nowMs: number,
  opts: HeadroomOptions = {},
): Headroom {
  const windows = applicableWindows(account, prefs);
  const unknown = (reason: string): Headroom => ({ value: null, binding: null, reason, windows });
  if (account.status !== "ok") return unknown(`status: ${account.status}`);
  if (account.lastGood) return unknown("last-known data");
  if (windows.length === 0) return unknown("no quota data");

  let value: number | null = null;
  let binding: UsageWindow | null = null;
  for (const w of windows) {
    const remaining = remainingPct(w);
    if (remaining === null) return unknown("unknown window");
    // A reset that passed without a new observation never counts as refilled.
    if (windowPastReset(w, nowMs)) return unknown("awaiting refresh after reset");
    const age = windowAgeMinutes(w, nowMs);
    const limit = opts.maxAgeMinutes ?? decisionMaxAge(w, prefs);
    if (age === null || !(age <= limit)) return unknown("stale");
    if (value === null || remaining < value) {
      value = remaining;
      binding = w;
    }
  }
  return { value, binding, windows };
}

export function isDecisionGrade(account: Account, prefs: SuggestionPrefs, nowMs: number): boolean {
  return headroom(account, prefs, nowMs).value !== null;
}

// ---------------------------------------------------------------------------

interface Candidate {
  account: Account;
  name: string;
  value: number;
  weekly: UsageWindow | null;
  weeklyResetMs: number | null;
}

function weeklyWindow(account: Account): UsageWindow | null {
  return (account.windows ?? []).find((w) => w.kind === "weekly") ?? null;
}

function isExcluded(account: Account, exclude: readonly string[]): boolean {
  const blocked = new Set(exclude.map((s) => s.trim().toLowerCase()).filter(Boolean));
  if (blocked.size === 0) return false;
  return [account.email, account.label, account.alias].some(
    (v) => typeof v === "string" && blocked.has(v.trim().toLowerCase()),
  );
}

/** Label, disambiguated by workspace when another account of the provider shares it. */
function displayName(account: Account, peers: readonly Account[]): string {
  const label = account.label.toLowerCase();
  const duplicate = peers.some((p) => p.key !== account.key && p.label.toLowerCase() === label);
  return duplicate && account.workspace ? `${account.label} (${account.workspace})` : account.label;
}

/** Higher headroom, then earlier weekly reset (unknown last), then label, then key. */
function compareCandidates(a: Candidate, b: Candidate): number {
  if (a.value !== b.value) return b.value - a.value;
  if (a.weeklyResetMs !== b.weeklyResetMs) {
    if (a.weeklyResetMs === null) return 1;
    if (b.weeklyResetMs === null) return -1;
    return a.weeklyResetMs - b.weeklyResetMs;
  }
  if (a.name !== b.name) return a.name < b.name ? -1 : 1;
  return a.account.key < b.account.key ? -1 : a.account.key > b.account.key ? 1 : 0;
}

/**
 * Everything except the reading that makes an account a switch target: not the active account, ok and
 * current (not last-known-good), switchable, not excluded, and (unless asked) not blocked from one-key switching.
 */
function isTargetable(a: Account, active: Account, prefs: SuggestionPrefs, includeBlocked: boolean): boolean {
  if (a.key === active.key || a.active === true) return false;
  if (a.status !== "ok" || a.lastGood || !a.switchTarget) return false;
  if (a.switchBlocked && !includeBlocked) return false;
  return !isExcluded(a, prefs.exclude);
}

function candidatesFor(
  accounts: readonly Account[],
  active: Account,
  prefs: SuggestionPrefs,
  nowMs: number,
  includeBlocked: boolean,
): Candidate[] {
  const out: Candidate[] = [];
  for (const a of accounts) {
    if (!isTargetable(a, active, prefs, includeBlocked)) continue;
    const hr = headroom(a, prefs, nowMs);
    // A candidate must itself be out of the exhausted band, or the switch would land on an empty account.
    if (hr.value === null || !(hr.value > EXHAUSTED_AT)) continue;
    const weekly = weeklyWindow(a);
    out.push({
      account: a,
      name: displayName(a, accounts),
      value: hr.value,
      weekly,
      weeklyResetMs: weekly ? parseIsoMs(weekly.resetsAt) : null,
    });
  }
  return out.sort(compareCandidates);
}

/** "or wait …" only when waiting for the session window alone would lift the bottleneck. */
function waitHintFor(hr: Headroom, prefs: SuggestionPrefs, nowMs: number): string | undefined {
  const b = hr.binding;
  if (!b || b.kind !== "session") return undefined;
  const reset = parseIsoMs(b.resetsAt);
  if (reset === null || reset <= nowMs || reset - nowMs > WAIT_HINT_MS) return undefined;
  const othersOk = hr.windows.every((w) => {
    if (w === b) return true;
    const r = remainingPct(w);
    return r !== null && r >= prefs.threshold;
  });
  if (!othersOk) return undefined;
  return `or wait ${formatCountdown(b.resetsAt, nowMs)} for the ${b.label} limit to reset`;
}

function actionable(
  provider: Provider,
  kind: SuggestionKind,
  target: Candidate,
  from: Account,
  title: string,
  detail: string,
  waitHint?: string,
): Suggestion {
  const s: Suggestion = {
    provider,
    kind,
    id: `${provider}:${kind}:${target.account.key}`,
    title,
    detail,
    targetKey: target.account.key,
    fromKey: from.key,
  };
  if (waitHint) s.waitHint = waitHint;
  return s;
}

/** The single highest-priority actionable suggestion for a provider, before cooldown. */
function primarySuggestion(
  provider: Provider,
  accounts: readonly Account[],
  active: Account,
  prefs: SuggestionPrefs,
  nowMs: number,
  previouslyOn: ReadonlySet<string>,
  includeBlocked = false,
): Suggestion | null {
  const ah = headroom(active, prefs, nowMs);
  // Unknown active usage never drives a suggestion.
  if (ah.value === null || ah.binding === null) return null;
  const activeValue = ah.value;
  const binding = ah.binding;
  const P = PROVIDER_NAME[provider];
  const activeName = displayName(active, accounts);
  const candidates = candidatesFor(accounts, active, prefs, nowMs, includeBlocked);

  // 1. Exhausted: any alternative that is not itself exhausted helps, even below the threshold.
  if (activeValue <= EXHAUSTED_AT) {
    const target = candidates[0];
    if (!target) return null;
    const why = binding.resetsAt
      ? `${binding.label} resets in ${formatCountdown(binding.resetsAt, nowMs)}`
      : `${binding.label} limit reached`;
    const limited = target.value < prefs.threshold ? " (limited capacity)" : "";
    return actionable(
      provider,
      "exhausted",
      target,
      active,
      `Switch ${P} → ${target.name}`,
      `${activeName} is out (${why}); ${target.name} has ${formatPct(target.value)} left${limited}`,
      waitHintFor(ah, prefs, nowMs),
    );
  }

  // 2. Switch: below threshold (or inside the hysteresis band while already on) and a
  //    candidate that is clearly better.
  if (activeValue < prefs.threshold + HYSTERESIS_PP) {
    const floor = Math.max(prefs.threshold, activeValue + prefs.margin);
    const eligible = candidates.filter((c) => c.value >= floor);
    const pool =
      activeValue < prefs.threshold
        ? eligible
        : eligible.filter((c) => previouslyOn.has(`${provider}:switch:${c.account.key}`));
    const target = pool[0];
    if (target) {
      return actionable(
        provider,
        "switch",
        target,
        active,
        `Switch ${P} → ${target.name}`,
        `${activeName} has ${formatPct(activeValue)} left (${binding.label}); ${target.name} has ${formatPct(target.value)}`,
        waitHintFor(ah, prefs, nowMs),
      );
    }
  }

  // 3. Pace (advisory): the backend says the active account will not last to its weekly reset.
  if (activeValue >= prefs.threshold) {
    const weekly = weeklyWindow(active);
    const best = candidates[0];
    if (weekly?.pace?.willLastToReset === false && best && best.value >= activeValue + prefs.margin) {
      const at = parseIsoMs(weekly.pace.projectedExhaustionAt ?? null);
      const when =
        at !== null && at > nowMs && at - nowMs <= PACE_TIME_MAX_MS
          ? ` (~${formatLocalTime(weekly.pace.projectedExhaustionAt ?? null)})`
          : "";
      return actionable(
        provider,
        "pace",
        best,
        active,
        `Consider ${best.name}`,
        `Advisory: at current pace ${activeName} runs out before its weekly reset${when}; ${best.name} has ${formatPct(best.value)} left`,
      );
    }
  }

  // 4. Expiring (opt-in): spend the candidate whose weekly quota resets soonest.
  if (prefs.expiringQuotaAdvice) {
    const activeReset = parseIsoMs(weeklyWindow(active)?.resetsAt ?? null);
    if (activeReset !== null) {
      const pool = candidates.filter((c) => {
        if (!c.weekly || c.weeklyResetMs === null) return false;
        const left = c.weeklyResetMs - nowMs;
        const weeklyRemaining = remainingPct(c.weekly);
        return (
          left > 0 &&
          left <= EXPIRING_WITHIN_MS &&
          weeklyRemaining !== null &&
          weeklyRemaining >= EXPIRING_MIN_REMAINING &&
          c.value >= prefs.threshold &&
          c.weeklyResetMs < activeReset
        );
      });
      pool.sort((a, b) => (a.weeklyResetMs as number) - (b.weeklyResetMs as number) || compareCandidates(a, b));
      const target = pool[0];
      if (target && target.weekly) {
        return actionable(
          provider,
          "expiring",
          target,
          active,
          `Use ${target.name} first`,
          `${formatPct(remainingPct(target.weekly))} of its weekly quota resets in ${formatCountdown(target.weekly.resetsAt, nowMs)}`,
        );
      }
    }
  }
  return null;
}

function infoSuggestions(
  provider: Provider,
  accounts: readonly Account[],
  activeCount: number,
  prefs: SuggestionPrefs,
  nowMs: number,
): Suggestion[] {
  const out: Suggestion[] = [];
  const P = PROVIDER_NAME[provider];
  if (activeCount !== 1) {
    out.push({
      provider,
      kind: "info",
      id: `${provider}:info:active-unknown`,
      title: `Could not tell which ${P} account is active`,
      detail:
        activeCount > 1
          ? "More than one account reports active; switch suggestions are paused."
          : "Switch suggestions are paused until the active account is identified.",
    });
  }
  if (provider === "codex") {
    for (const a of accounts) {
      const n = a.resetCredits?.available;
      if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) continue;
      const hr = headroom(a, prefs, nowMs);
      const weekly = weeklyWindow(a);
      // Credits are scarce: advise spending one only on a reading that can be shown as current
      // (not an error row's last-known value, not a quota that has already reset, not hours old).
      const weeklyOut = weekly !== null && currentWindowRemaining(a, weekly, nowMs, DISPLAY_MAX_AGE_MINUTES) === 0;
      if (!((hr.value !== null && hr.value <= EXHAUSTED_AT) || weeklyOut)) continue;
      out.push({
        provider,
        kind: "info",
        id: `${provider}:info:credits:${a.key}`,
        title: `${displayName(a, accounts)} has ${n} reset credit${n === 1 ? "" : "s"} — use them in the ChatGPT/Codex app`,
        detail: `Credits are not applied automatically (observed ${formatAge(a.resetCredits?.observedAt ?? null, nowMs)})`,
      });
    }
  }
  return out;
}

/**
 * Info item for a suggestion that exists only because its target is blocked from one-key switching:
 * it names the switch and says where to make it, and is never actionable.
 */
function switchBlockedInfo(
  provider: Provider,
  wouldBe: Suggestion,
  target: Account,
  accounts: readonly Account[],
): Suggestion {
  const H = HANDOFF_NAME[provider];
  const title =
    wouldBe.kind === "exhausted" || wouldBe.kind === "switch"
      ? `Switch ${PROVIDER_NAME[provider]} → ${displayName(target, accounts)} in ${H}`
      : `${wouldBe.title} (switch in ${H})`;
  return {
    provider,
    kind: "info",
    id: `${provider}:info:${SWITCH_BLOCKED_INFO}:${target.key}`,
    title,
    detail: `${wouldBe.detail}. One-key switching is unavailable: ${target.switchBlocked}`,
  };
}

function kindOfId(id: string): string {
  return id.split(":")[1] ?? "";
}

/** Account key an actionable id targets ("<provider>:<kind>:<key>"; keys contain ":"). */
function targetKeyOfId(id: string): string {
  return id.split(":").slice(2).join(":");
}

/**
 * At most one actionable suggestion per provider (exhausted → switch → pace → expiring),
 * plus separate info items. Returned order: all actionable items, then all info items.
 * The first rule that matches decides; if its id is cooling down (and it is not
 * "exhausted"), the provider gets no actionable suggestion this time rather than a
 * lower-priority substitute. Accounts blocked from one-key switching are never targeted;
 * when one would have been, an info item says where to switch instead.
 *
 * State: an id that was on is cleared (and starts its cooldown) only when its rule was
 * evaluated on decision-grade data and came out false. When the provider's active reading
 * is unknown, or the id's own target reading is transiently unknown (stale, past reset),
 * the id is carried forward unchanged.
 */
export function suggest(
  snapshot: Snapshot,
  prefs: SuggestionPrefs,
  nowMs: number,
  state: SuggestionState,
): { suggestions: Suggestion[]; nextState: SuggestionState } {
  const previouslyOn = new Set(Array.isArray(state?.active) ? state.active : []);
  const cleared: Record<string, string> =
    state?.clearedAt && typeof state.clearedAt === "object" ? state.clearedAt : {};
  const coolingDown = (s: Suggestion): boolean => {
    if (s.kind === "exhausted") return false;
    const at = parseIsoMs(cleared[s.id] ?? null);
    return at !== null && Math.abs(nowMs - at) < COOLDOWN_MS;
  };

  const primary: Suggestion[] = [];
  const info: Suggestion[] = [];
  /** Previously-on actionable ids whose rule could not be evaluated this time. */
  const carried = new Set<string>();
  for (const provider of PROVIDERS) {
    const accounts = snapshot.providers?.[provider]?.accounts ?? [];
    const wasOn = [...previouslyOn].filter((id) => id.startsWith(`${provider}:`) && ACTIONABLE.has(kindOfId(id)));
    const actives = accounts.filter((a) => a.active === true);
    const active = actives.length === 1 ? actives[0] : null;
    if (!active || headroom(active, prefs, nowMs).value === null) {
      // Not decision-grade (no accounts, active unknown or ambiguous, active reading unknown).
      for (const id of wasOn) carried.add(id);
    } else {
      const s = primarySuggestion(provider, accounts, active, prefs, nowMs, previouslyOn);
      if (s) {
        if (!coolingDown(s)) primary.push(s);
      } else {
        const wouldBe = primarySuggestion(provider, accounts, active, prefs, nowMs, previouslyOn, true);
        const target = wouldBe ? accounts.find((a) => a.key === wouldBe.targetKey) : undefined;
        if (wouldBe && target?.switchBlocked) info.push(switchBlockedInfo(provider, wouldBe, target, accounts));
      }
      for (const id of wasOn) {
        const target = accounts.find((a) => a.key === targetKeyOfId(id));
        if (target && isTargetable(target, active, prefs, false) && headroom(target, prefs, nowMs).value === null) {
          carried.add(id);
        }
      }
    }
    if (accounts.length > 0) info.push(...infoSuggestions(provider, accounts, actives.length, prefs, nowMs));
  }

  const suggestions = [...primary, ...info];
  const emitted = new Set(suggestions.map((s) => s.id));
  const clearedAt: Record<string, string> = {};
  for (const [id, at] of Object.entries(cleared)) {
    if (emitted.has(id)) continue;
    const ms = parseIsoMs(at);
    if (ms !== null && Math.abs(nowMs - ms) < COOLDOWN_MS) clearedAt[id] = at;
  }
  const nowIso = new Date(nowMs).toISOString();
  for (const id of previouslyOn) {
    if (!emitted.has(id) && !carried.has(id) && ACTIONABLE.has(kindOfId(id))) clearedAt[id] = nowIso;
  }
  const active = [...emitted, ...[...carried].filter((id) => !emitted.has(id))];
  return { suggestions, nextState: { active, clearedAt } };
}
