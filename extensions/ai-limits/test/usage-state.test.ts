import { describe, expect, it } from "vitest";
import type { ProviderState } from "../src/lib/format";
import {
  applyFailure,
  applySuccess,
  Cached,
  cooldownEnds,
  cooldownsOf,
  credentialFingerprints,
  dropChanged,
  FRESH_MS,
  isCoolingDown,
  initialStates,
  isNotConnected,
  MIN_FORCED_MS,
  providersToRefresh,
  sections,
  startRefresh,
  States,
  toFailure,
} from "../src/lib/usage-state";
import { ProviderError, ProviderUsage, Settings } from "../src/lib/types";

const IDS = ["claude", "codex", "copilot"] as const;
const NOW = Date.parse("2026-10-14T12:00:00Z");

function usage(id: "claude" | "codex" | "copilot", fetchedAt = NOW): ProviderUsage {
  return {
    provider: id,
    windows: [{ label: "Session", usedPercent: 40, resetsAt: null }],
    balances: [],
    notes: [],
    source: "test",
    fetchedAt,
  };
}

const notConnected = { kind: "not-connected" as const, message: "No credentials", hint: "Sign in" };

// A provider that answered 429 and asked to wait until `retryAt`, as applyFailure leaves it. The cooldown is kept
// apart, and the failure is shown only when there is no saved result.
function rateLimited(retryAt: number, saved?: ProviderUsage): ProviderState {
  const cooldown = { kind: "http" as const, message: "rate limited", retryAt };
  return { loading: false, usage: saved, cooldown, failure: saved === undefined ? cooldown : undefined };
}

describe("initialStates", () => {
  it("starts providers with no saved result loading", () => {
    const states = initialStates(IDS, {});
    expect(Object.values(states).every((state) => state.loading)).toBe(true);
  });

  it("shows saved data at once, and not as loading", () => {
    const cached: Cached = { claude: usage("claude") };
    const states = initialStates(IDS, cached);
    expect(states.claude).toEqual({ loading: false, usage: cached.claude });
    expect(states.codex).toEqual({ loading: true, usage: undefined });
  });

  it("restores a cooldown that is still active, with its saved data, and does not load the provider", () => {
    const cached: Cached = { claude: usage("claude", NOW - 10 * 60_000) };
    const cooldown = { kind: "http" as const, message: "rate limited", retryAt: NOW + 60_000 };
    const states = initialStates(IDS, cached, { claude: cooldown }, NOW);
    expect(states.claude).toEqual({ loading: false, usage: cached.claude, cooldown });
    expect(states.codex.loading).toBe(true);
  });

  it("shows no failure for an active cooldown when there is saved usage", () => {
    const cooldown = { kind: "http" as const, message: "rate limited", retryAt: NOW + 60_000 };
    const states = initialStates(IDS, { claude: usage("claude") }, { claude: cooldown }, NOW);
    expect(states.claude.failure).toBeUndefined();
  });

  it("shows the failure for an active cooldown when there is no saved usage", () => {
    const cooldown = { kind: "http" as const, message: "rate limited", retryAt: NOW + 60_000 };
    const states = initialStates(IDS, {}, { claude: cooldown }, NOW);
    expect(states.claude).toEqual({ loading: false, usage: undefined, cooldown, failure: cooldown });
  });

  it("ignores a cooldown that has ended", () => {
    const cooldown = { kind: "http" as const, message: "rate limited", retryAt: NOW - 1 };
    const states = initialStates(IDS, {}, { claude: cooldown }, NOW);
    expect(states.claude).toEqual({ loading: true, usage: undefined });
  });
});

describe("providersToRefresh", () => {
  const ALL = [...IDS];

  function statesWith(cached: Cached): States {
    return initialStates(IDS, cached);
  }

  it("skips a provider whose saved result is fresh", () => {
    const states = statesWith({ claude: usage("claude", NOW - 60_000) });
    expect(providersToRefresh(states, ALL, NOW, { force: false })).toEqual(["codex", "copilot"]);
  });

  it("refetches a provider whose saved result is stale", () => {
    const states = statesWith({ claude: usage("claude", NOW - 5 * 60_000) });
    expect(providersToRefresh(states, ALL, NOW, { force: false })).toEqual(ALL);
  });

  it("fetches a provider with no saved result, since that finds not-connected for free", () => {
    const states = statesWith({ claude: usage("claude", NOW) });
    expect(providersToRefresh(states, ALL, NOW, { force: false })).toEqual(["codex", "copilot"]);
  });

  it("treats a result exactly FRESH_MS old as stale", () => {
    const states = statesWith({ claude: usage("claude", NOW - FRESH_MS) });
    expect(providersToRefresh(states, ALL, NOW, { force: false })).toContain("claude");
  });

  it("treats a result just under FRESH_MS old as fresh", () => {
    const states = statesWith({ claude: usage("claude", NOW - FRESH_MS + 1) });
    expect(providersToRefresh(states, ALL, NOW, { force: false })).not.toContain("claude");
  });

  it("fetches every provider when forced, if their saved results are at least MIN_FORCED_MS old", () => {
    // Older than MIN_FORCED_MS but still fresh for an unforced refresh.
    const older = NOW - 60_000;
    const states = statesWith({ claude: usage("claude", older), codex: usage("codex", older) });
    expect(providersToRefresh(states, ALL, NOW, { force: true })).toEqual(ALL);
  });

  it("skips a forced refresh of a result younger than MIN_FORCED_MS", () => {
    const states = statesWith({ claude: usage("claude", NOW - MIN_FORCED_MS + 1), codex: usage("codex", NOW) });
    expect(providersToRefresh(states, ALL, NOW, { force: true })).toEqual(["copilot"]);
  });

  it("treats a forced result exactly MIN_FORCED_MS old as stale", () => {
    const states = statesWith({ claude: usage("claude", NOW - MIN_FORCED_MS) });
    expect(providersToRefresh(states, ALL, NOW, { force: true })).toContain("claude");
  });

  it("skips a provider in cooldown, forced or not, even with saved data that is stale", () => {
    const states: States = {
      ...statesWith({}),
      claude: rateLimited(NOW + 60_000, usage("claude", NOW - 10 * 60_000)),
    };
    expect(providersToRefresh(states, ALL, NOW, { force: false })).toEqual(["codex", "copilot"]);
    expect(providersToRefresh(states, ALL, NOW, { force: true })).toEqual(["codex", "copilot"]);
  });

  it("skips a provider whose cooldown is hidden behind its saved usage", () => {
    const states: States = { ...statesWith({}), claude: rateLimited(NOW + 60_000, usage("claude", NOW - 10 * 60_000)) };
    expect(states.claude.failure).toBeUndefined();
    expect(providersToRefresh(states, ALL, NOW, { force: true })).toEqual(["codex", "copilot"]);
  });

  it("skips a provider in cooldown that has no saved data", () => {
    const states: States = { ...statesWith({}), claude: rateLimited(NOW + 60_000) };
    expect(providersToRefresh(states, ALL, NOW, { force: true })).toEqual(["codex", "copilot"]);
  });

  it("fetches a provider whose cooldown has ended", () => {
    const states: States = {
      ...statesWith({}),
      claude: rateLimited(NOW - 1, usage("claude", NOW - 10 * 60_000)),
    };
    expect(providersToRefresh(states, ALL, NOW, { force: false })).toEqual(ALL);
    expect(providersToRefresh(states, ALL, NOW, { force: true })).toEqual(ALL);
  });

  it("fetches exactly the providers given in only, ignoring freshness and cooldowns", () => {
    const states: States = {
      ...statesWith({ codex: usage("codex", NOW), copilot: usage("copilot", NOW) }),
      claude: rateLimited(NOW + 60_000, usage("claude", NOW)),
    };
    expect(providersToRefresh(states, ALL, NOW, { force: true, only: ["claude", "codex"] })).toEqual([
      "claude",
      "codex",
    ]);
    expect(providersToRefresh(states, ALL, NOW, { force: false, only: ["copilot"] })).toEqual(["copilot"]);
  });

  it("fetches nothing for an empty only list", () => {
    const states = statesWith({});
    expect(providersToRefresh(states, ALL, NOW, { force: true, only: [] })).toEqual([]);
  });

  it("keeps the order of the ids it is given", () => {
    const states = statesWith({});
    expect(providersToRefresh(states, ["copilot", "claude"], NOW, { force: false })).toEqual(["copilot", "claude"]);
  });
});

describe("startRefresh", () => {
  it("marks only the given providers loading, and keeps their saved data", () => {
    const cached: Cached = { claude: usage("claude"), codex: usage("codex") };
    const states = initialStates(IDS, cached);
    const refreshing = startRefresh(states, ["claude"]);
    expect(refreshing.claude).toEqual({ loading: true, usage: cached.claude });
    expect(refreshing.codex).toEqual({ loading: false, usage: cached.codex });
    expect(refreshing.copilot.loading).toBe(true);
  });

  it("marks nothing loading for an empty list", () => {
    const states = initialStates(IDS, { claude: usage("claude"), codex: usage("codex"), copilot: usage("copilot") });
    expect(Object.values(startRefresh(states, [])).some((state) => state.loading)).toBe(false);
  });
});

describe("applyFailure with a 429", () => {
  const cooling = { kind: "http" as const, message: "rate limited", retryAt: NOW + 60_000 };

  it("keeps the saved usage on screen with no failure, records the cooldown, and leaves the cache unchanged", () => {
    const saved = usage("claude", NOW - 10 * 60_000);
    const cached: Cached = { claude: saved };
    const result = applyFailure(initialStates(IDS, cached), cached, "claude", cooling);
    expect(result.states.claude).toEqual({ loading: false, usage: saved, cooldown: cooling });
    expect(result.states.claude.failure).toBeUndefined();
    expect(result.cached).toBe(cached);
  });

  it("shows the failure and records the cooldown when there is no saved usage", () => {
    const result = applyFailure(initialStates(IDS, {}), {}, "claude", cooling);
    expect(result.states.claude).toEqual({ loading: false, usage: undefined, cooldown: cooling, failure: cooling });
  });

  it("clears the cooldown when a later refresh succeeds", () => {
    const saved = usage("claude", NOW - 10 * 60_000);
    const limited = applyFailure(initialStates(IDS, { claude: saved }), { claude: saved }, "claude", cooling);
    const result = applySuccess(limited.states, limited.cached, "claude", usage("claude", NOW));
    expect(result.states.claude.cooldown).toBeUndefined();
    expect(result.states.claude.failure).toBeUndefined();
  });

  it("keeps the cooldown through startRefresh", () => {
    const saved = usage("claude", NOW - 10 * 60_000);
    const limited = applyFailure(initialStates(IDS, { claude: saved }), { claude: saved }, "claude", cooling);
    expect(startRefresh(limited.states, ["claude"]).claude.cooldown).toEqual(cooling);
  });
});

describe("isCoolingDown", () => {
  it("reads the cooldown, not the failure", () => {
    const retry = { kind: "http" as const, message: "rate limited", retryAt: NOW + 60_000 };
    expect(isCoolingDown({ loading: false, cooldown: retry }, NOW)).toBe(true);
    expect(isCoolingDown({ loading: false, failure: retry }, NOW)).toBe(false);
  });
});

describe("cooldownEnds", () => {
  it("maps each provider still cooling down to the time its cooldown ends", () => {
    const states: States = {
      ...initialStates(IDS, {}),
      claude: rateLimited(NOW + 60_000),
      codex: rateLimited(NOW - 1),
    };
    expect(cooldownEnds(states, NOW)).toEqual({ claude: NOW + 60_000 });
  });
});

describe("cooldownsOf", () => {
  it("returns the failures still cooling down, and leaves out expired ones and other failures", () => {
    const cooling = { kind: "http" as const, message: "rate limited", retryAt: NOW + 60_000 };
    const states: States = {
      ...initialStates(IDS, {}),
      claude: { loading: false, cooldown: cooling },
      codex: rateLimited(NOW - 1),
      copilot: { loading: false, failure: notConnected },
    };
    expect(cooldownsOf(states, NOW)).toEqual({ claude: cooling });
  });

  it("returns nothing when no provider is cooling down", () => {
    expect(cooldownsOf(initialStates(IDS, {}), NOW)).toEqual({});
  });
});

describe("applySuccess", () => {
  it("replaces the data in the state and the cache", () => {
    const old = usage("claude", NOW - 60_000);
    const fresh = usage("claude", NOW);
    const states = initialStates(IDS, { claude: old });
    const cached: Cached = { claude: old };
    const result = applySuccess(states, cached, "claude", fresh);
    expect(result.states.claude).toEqual({ loading: false, usage: fresh });
    expect(result.cached.claude).toBe(fresh);
  });

  it("does not touch other providers", () => {
    const states = initialStates(IDS, {});
    const result = applySuccess(states, {}, "claude", usage("claude"));
    expect(result.states.codex.loading).toBe(true);
    expect(result.cached.codex).toBeUndefined();
  });

  it("clears an earlier failure", () => {
    const states = applyFailure(initialStates(IDS, {}), {}, "claude", { kind: "http", message: "down" }).states;
    const result = applySuccess(states, {}, "claude", usage("claude"));
    expect(result.states.claude.failure).toBeUndefined();
  });
});

describe("applySuccess with a wait from a partial result", () => {
  it("records the wait as a cooldown and keeps the data", () => {
    const partial = { ...usage("claude", NOW), retryAt: NOW + 600_000 };
    const result = applySuccess(initialStates(IDS, {}), {}, "claude", partial);
    expect(result.states.claude).toEqual({
      loading: false,
      usage: partial,
      cooldown: { kind: "http", message: "Rate limited", retryAt: NOW + 600_000 },
    });
    expect(result.states.claude.failure).toBeUndefined();
    expect(isCoolingDown(result.states.claude, NOW)).toBe(true);
    expect(providersToRefresh(result.states, IDS, NOW, { force: true })).not.toContain("claude");
  });
});

describe("credentialFingerprints", () => {
  const settings: Settings = { openrouterApiKey: "sk-or-v1-first" };

  it("is the same for the same credentials and different when one changes", () => {
    const ids = ["openrouter", "copilot"] as const;
    const first = credentialFingerprints(settings, ids);
    expect(credentialFingerprints({ openrouterApiKey: "sk-or-v1-first" }, ids)).toEqual(first);
    const changed = credentialFingerprints({ openrouterApiKey: "sk-or-v1-second" }, ids);
    expect(changed.copilot).toBe(first.copilot);
    expect(changed.openrouter).not.toBe(first.openrouter);
  });

  it("does not contain the credential itself", () => {
    const fingerprint = credentialFingerprints({ githubToken: "ghp_secret_value" }, ["copilot"]).copilot;
    expect(fingerprint).toMatch(/^[0-9a-f]{16}$/);
    expect(JSON.stringify(credentialFingerprints({ githubToken: "ghp_secret_value" }, ["copilot"]))).not.toContain(
      "ghp_secret_value",
    );
  });
});

describe("dropChanged", () => {
  it("drops the saved result and cooldown of a provider whose credentials changed, and keeps the others", () => {
    const saved = usage("claude", NOW - 10 * 60_000);
    const codexSaved = usage("codex", NOW - 10 * 60_000);
    const cooling = { kind: "http" as const, message: "rate limited", retryAt: NOW + 60_000 };
    const states: States = {
      ...initialStates(IDS, { claude: saved, codex: codexSaved }),
      claude: { loading: false, usage: saved, cooldown: cooling },
    };
    const current = { claude: "new", codex: "same" };
    const result = dropChanged(
      { states, cached: { claude: saved, codex: codexSaved } },
      { claude: "old", codex: "same" },
      current,
      IDS,
    );

    expect(result.states.claude).toEqual({ loading: false });
    expect(result.cached.claude).toBeUndefined();
    expect(result.states.codex.usage).toBe(codexSaved);
    expect(result.cached.codex).toBe(codexSaved);
  });

  it("treats a provider with no saved fingerprint as changed", () => {
    const saved = usage("claude", NOW);
    const result = dropChanged(
      { states: initialStates(IDS, { claude: saved }), cached: { claude: saved } },
      {},
      { claude: "x" },
      ["claude"],
    );
    expect(result.cached).toEqual({});
    expect(result.states.claude).toEqual({ loading: false });
  });
});

describe("applyFailure", () => {
  it("keeps saved data and shows an http failure next to it", () => {
    const saved = usage("claude");
    const states = initialStates(IDS, { claude: saved });
    const cached: Cached = { claude: saved };
    const failure = { kind: "http" as const, message: "Couldn't reach Claude" };
    const result = applyFailure(states, cached, "claude", failure);
    expect(result.states.claude).toEqual({ loading: false, usage: saved, failure });
    expect(result.cached.claude).toBe(saved);
  });

  it("keeps saved data for an auth failure", () => {
    const saved = usage("codex");
    const failure = { kind: "auth" as const, message: "rejected", hint: "Run codex login" };
    const result = applyFailure(initialStates(IDS, { codex: saved }), { codex: saved }, "codex", failure);
    expect(result.states.codex.usage).toBe(saved);
    expect(result.states.codex.failure).toEqual(failure);
    expect(result.cached.codex).toBe(saved);
  });

  it("drops saved data and the cache entry for a not-connected failure", () => {
    const saved = usage("copilot");
    const states = initialStates(IDS, { copilot: saved, claude: usage("claude") });
    const cached: Cached = { copilot: saved, claude: usage("claude") };
    const result = applyFailure(states, cached, "copilot", notConnected);
    expect(result.states.copilot).toEqual({ loading: false, failure: notConnected });
    expect(result.states.copilot.usage).toBeUndefined();
    expect(result.cached).not.toHaveProperty("copilot");
    expect(result.cached.claude).toBeDefined();
  });

  it("moves a dropped provider to Not Connected", () => {
    const saved = usage("copilot");
    const result = applyFailure(initialStates(IDS, { copilot: saved }), { copilot: saved }, "copilot", notConnected);
    expect(isNotConnected(result.states.copilot)).toBe(true);
    expect(sections(result.states, IDS, true).notConnected).toEqual(["copilot"]);
  });
});

describe("isNotConnected", () => {
  it("is false when there is saved data, even with a not-connected failure", () => {
    const state: ProviderState = { loading: false, usage: usage("claude"), failure: notConnected };
    expect(isNotConnected(state)).toBe(false);
  });
});

describe("sections", () => {
  const states: States = {
    claude: { loading: false, usage: usage("claude") },
    codex: { loading: false, failure: notConnected },
    copilot: { loading: false, failure: { kind: "auth", message: "rejected" } },
  } as States;

  it("puts providers with data or a non-not-connected error under Usage, in registry order", () => {
    expect(sections(states, IDS, true).usage).toEqual(["claude", "copilot"]);
  });

  it("puts not-connected providers under Not Connected", () => {
    expect(sections(states, IDS, true).notConnected).toEqual(["codex"]);
  });

  it("hides Not Connected entirely when showNotConnected is false", () => {
    expect(sections(states, IDS, false)).toEqual({ usage: ["claude", "copilot"], notConnected: [] });
  });

  it("keeps loading providers with no data under Usage", () => {
    const loading = initialStates(IDS, {});
    expect(sections(loading, IDS, true)).toEqual({ usage: [...IDS], notConnected: [] });
  });
});

describe("toFailure", () => {
  it("keeps the kind, message and hint of a ProviderError", () => {
    expect(toFailure(new ProviderError("auth", "rejected", "Sign in again"))).toEqual({
      kind: "auth",
      message: "rejected",
      hint: "Sign in again",
    });
  });

  it("carries the error code, so the view can act on a denied Keychain read", () => {
    const error = new ProviderError(
      "auth",
      "macOS denied access",
      "Choose Connect again",
      undefined,
      "keychain-denied",
    );

    expect(toFailure(error)).toEqual({
      kind: "auth",
      message: "macOS denied access",
      hint: "Choose Connect again",
      code: "keychain-denied",
    });
  });

  it("carries the retry time of a rate-limited ProviderError", () => {
    const error = new ProviderError("http", "Claude is rate limiting requests (HTTP 429)", "Wait", 429, undefined, NOW);

    expect(toFailure(error)).toMatchObject({ kind: "http", retryAt: NOW });
  });

  it("turns other errors into an http failure", () => {
    expect(toFailure(new Error("socket hang up"))).toEqual({ kind: "http", message: "socket hang up" });
    expect(toFailure("plain")).toEqual({ kind: "http", message: "plain" });
  });
});
