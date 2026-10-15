import { createHash } from "crypto";
import type { Failure, ProviderState } from "./format";
import { ProviderError, ProviderId, ProviderUsage, Settings } from "./types";

// The state transitions behind the usage view. Each one takes the current states and cache and returns the new ones,
// so the view only stores the result and the tests can check every case without Raycast.

export type Cached = Partial<Record<ProviderId, ProviderUsage>>;
export type States = Record<ProviderId, ProviderState>;

export interface Transition {
  states: States;
  cached: Cached;
}

// A short fingerprint of the credential settings each provider reads, per provider. Saved results and cooldowns are only
// kept while the fingerprint still matches, so a changed key or token never shows the previous account's numbers. It is
// a hash, so the credentials themselves are never stored.
export type Fingerprints = Partial<Record<ProviderId, string>>;

// The settings each provider reads its login from. Changing any of them makes that provider's saved results stale.
// claudeKeychain is left out: a refresh turns it off when macOS refuses the read, and that must not drop Claude's
// cooldown, since the account is the same.
const CREDENTIAL_SETTINGS: Record<ProviderId, readonly (keyof Settings)[]> = {
  claude: ["claudeConfigDir", "claudeSessionKey"],
  codex: ["codexHome"],
  cursor: ["cursorCookie"],
  gemini: [],
  copilot: ["githubToken", "githubOAuthToken"],
  openrouter: ["openrouterApiKey"],
  zai: ["zaiApiKey", "zaiRegion"],
  kimi: ["kimiApiKey"],
  deepseek: ["deepseekApiKey"],
  moonshot: ["moonshotApiKey", "moonshotRegion"],
};

export function credentialFingerprints(settings: Settings, ids: readonly ProviderId[]): Fingerprints {
  const fingerprints: Fingerprints = {};
  for (const id of ids) {
    const values = CREDENTIAL_SETTINGS[id].map((key) => settings[key] ?? null);
    fingerprints[id] = createHash("sha256").update(JSON.stringify(values)).digest("hex").slice(0, 16);
  }
  return fingerprints;
}

// Drops the saved result and cooldown of each provider whose credentials differ from the ones they were saved with. A
// provider with no saved fingerprint differs as well, so results saved before fingerprints were kept are not trusted.
export function dropChanged(
  transition: Transition,
  saved: Fingerprints,
  current: Fingerprints,
  ids: readonly ProviderId[],
): Transition {
  const states = { ...transition.states };
  const cached = { ...transition.cached };
  for (const id of ids) {
    if (saved[id] === current[id]) {
      continue;
    }
    states[id] = { loading: false };
    delete cached[id];
  }
  return { states, cached };
}

// Saved results from the cache of an earlier session are used as long as they're this recent. Opening the command again
// within this window shows them without a request, so rate-limited endpoints (Claude answers 429 quickly) aren't hit on
// every open. A result exactly this old counts as stale and is fetched again.
export const FRESH_MS = 2 * 60_000;

// A forced refresh of every provider (Refresh) skips results younger than this, so pressing Refresh repeatedly
// doesn't hit rate-limited endpoints.
export const MIN_FORCED_MS = 30_000;

// True while a provider has asked to be left alone after a 429, until its `retryAt` passes.
function isCoolingFailure(failure: Failure | undefined, now: number): failure is Failure {
  return failure?.retryAt !== undefined && failure.retryAt > now;
}

export function isCoolingDown(state: ProviderState, now: number): boolean {
  return isCoolingFailure(state.cooldown, now);
}

// A provider with no saved result is still loading, so the spinner shows while it is fetched. Providers with a saved
// result show it at once, and become loading only when they are refreshed. A provider still cooling down from an
// earlier session is not loading, since it won't be fetched until the cooldown ends. It shows its saved result, or its
// failure when there is none.
export function initialStates(
  ids: readonly ProviderId[],
  cached: Cached,
  cooldowns: Partial<Record<ProviderId, Failure>> = {},
  now: number = Date.now(),
): States {
  const states = {} as States;
  for (const id of ids) {
    const cooldown = cooldowns[id];
    if (isCoolingFailure(cooldown, now)) {
      states[id] = {
        loading: false,
        usage: cached[id],
        cooldown,
        failure: cached[id] === undefined ? cooldown : undefined,
      };
    } else {
      states[id] = { loading: cached[id] === undefined, usage: cached[id] };
    }
  }
  return states;
}

// The failures that are still cooling down, so the view can save them and the next open waits too.
export function cooldownsOf(states: States, now: number): Partial<Record<ProviderId, Failure>> {
  const cooldowns: Partial<Record<ProviderId, Failure>> = {};
  for (const [id, state] of Object.entries(states) as [ProviderId, ProviderState][]) {
    if (isCoolingFailure(state.cooldown, now)) {
      cooldowns[id] = state.cooldown;
    }
  }
  return cooldowns;
}

// When each cooling provider's cooldown ends, in epoch milliseconds. The view schedules its deferred fetch for these.
export function cooldownEnds(states: States, now: number): Partial<Record<ProviderId, number>> {
  const ends: Partial<Record<ProviderId, number>> = {};
  for (const [id, state] of Object.entries(states) as [ProviderId, ProviderState][]) {
    if (isCoolingDown(state, now) && state.cooldown?.retryAt !== undefined) {
      ends[id] = state.cooldown.retryAt;
    }
  }
  return ends;
}

// Which providers to fetch.
// - `only` (Connect, Disconnect, sign in or out) fetches exactly those providers, ignoring freshness and cooldowns.
//   Their credentials just changed, so the result must show at once.
// - A provider in cooldown after a 429 is never fetched, forced or not, until its retryAt passes.
// - A forced refresh (Refresh) fetches providers with no saved result, or whose result is MIN_FORCED_MS old or older.
// - Otherwise a provider is fetched when it has no saved result, or when its result is FRESH_MS old or older. Providers
//   with no saved result are always fetched, since that is how "not connected" is found, and that costs no network.
export function providersToRefresh(
  states: States,
  ids: readonly ProviderId[],
  now: number,
  options: { force: boolean; only?: readonly ProviderId[] },
): ProviderId[] {
  if (options.only) {
    const only = options.only;
    return ids.filter((id) => only.includes(id));
  }
  return ids.filter((id) => {
    const state = states[id];
    if (isCoolingDown(state, now)) {
      return false;
    }
    const usage = state.usage;
    if (usage === undefined) {
      return true;
    }
    return now - usage.fetchedAt >= (options.force ? MIN_FORCED_MS : FRESH_MS);
  });
}

// Marks the given providers loading. Saved results stay on screen until their provider answers.
export function startRefresh(states: States, ids: readonly ProviderId[]): States {
  const next = { ...states };
  for (const id of ids) {
    next[id] = { ...next[id], loading: true };
  }
  return next;
}

// A partial result can carry the wait from a 429 on one of its requests. That wait is kept as a cooldown, so the next
// refresh doesn't ask the rate-limited endpoint again before it passes.
export function applySuccess(states: States, cached: Cached, id: ProviderId, usage: ProviderUsage): Transition {
  const cooldown: Failure | undefined =
    usage.retryAt === undefined ? undefined : { kind: "http", message: "Rate limited", retryAt: usage.retryAt };
  return {
    states: { ...states, [id]: { loading: false, usage, cooldown } },
    cached: { ...cached, [id]: usage },
  };
}

// A "not-connected" failure means the credentials were removed, so the saved numbers are dropped from the state and the
// cache. A 429 keeps the saved numbers on screen with no failure shown, and only records the cooldown, so the user
// never sees a rate-limit error while older results exist. With no saved numbers the 429 is shown as the failure. Other
// failures keep the saved numbers and show the failure next to them.
export function applyFailure(states: States, cached: Cached, id: ProviderId, failure: Failure): Transition {
  if (failure.kind === "not-connected") {
    const remaining = { ...cached };
    delete remaining[id];
    return {
      states: { ...states, [id]: { loading: false, failure } },
      cached: remaining,
    };
  }
  if (failure.retryAt !== undefined) {
    const usage = states[id].usage;
    return {
      states: {
        ...states,
        [id]: { loading: false, usage, cooldown: failure, failure: usage === undefined ? failure : undefined },
      },
      cached,
    };
  }
  return {
    states: { ...states, [id]: { loading: false, usage: states[id].usage, failure } },
    cached,
  };
}

// Providers with no credentials are listed apart from the usage, so the list starts with the ones that work.
export function isNotConnected(state: ProviderState): boolean {
  return state.usage === undefined && state.failure?.kind === "not-connected";
}

export function sections(
  states: States,
  ids: readonly ProviderId[],
  showNotConnected: boolean,
): { usage: ProviderId[]; notConnected: ProviderId[] } {
  return {
    usage: ids.filter((id) => !isNotConnected(states[id])),
    notConnected: showNotConnected ? ids.filter((id) => isNotConnected(states[id])) : [],
  };
}

export function toFailure(error: unknown): Failure {
  if (error instanceof ProviderError) {
    return { kind: error.kind, message: error.message, hint: error.hint, code: error.code, retryAt: error.retryAt };
  }
  return { kind: "http", message: error instanceof Error ? error.message : String(error) };
}
