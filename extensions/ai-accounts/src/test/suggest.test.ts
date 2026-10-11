import { test } from "node:test";
import assert from "node:assert/strict";
import { formatLocalTime } from "../lib/format";
import {
  Account,
  AccountStatus,
  Pace,
  Provider,
  Snapshot,
  Suggestion,
  SuggestionPrefs,
  SuggestionState,
  SwitchTarget,
  UsageWindow,
  emptySnapshot,
  emptySuggestionState,
} from "../lib/model";
import {
  applicableWindows,
  decisionMaxAge,
  headroom,
  isDecisionGrade,
  isSwitchBlockedInfo,
  suggest,
} from "../lib/suggest";

// All accounts and times below are synthetic test inputs built by hand.
const NOW = Date.parse("2026-09-29T21:00:00Z");
const MIN = 60_000;
const at = (offsetMin: number, base = NOW): string => new Date(base + offsetMin * MIN).toISOString();

const PREFS: SuggestionPrefs = {
  threshold: 20,
  margin: 15,
  includeScopedWindows: false,
  expiringQuotaAdvice: false,
  exclude: [],
  decisionMaxAgeMinutes: 5,
};

interface WinOpts {
  resetIn?: number | null; // minutes from NOW; null = unknown
  observedAgo?: number | null; // minutes before NOW; null = missing
  pace?: Pace;
  label?: string;
  vouch?: number; // backend-vouched decision horizon (UsageWindow.decisionMaxAgeMinutes)
}

function mkWin(kind: UsageWindow["kind"], remaining: number | null, o: WinOpts = {}): UsageWindow {
  const defaults = {
    session: { id: "session", label: "5h", resetIn: 180 },
    weekly: { id: "weekly", label: "Weekly", resetIn: 3 * 24 * 60 },
  };
  const d = kind === "scoped" ? { id: "scoped:fable", label: "Fable", resetIn: 3 * 24 * 60 } : defaults[kind];
  const resetIn = o.resetIn === undefined ? d.resetIn : o.resetIn;
  const observedAgo = o.observedAgo === undefined ? 1 : o.observedAgo;
  const w: UsageWindow = {
    id: d.id,
    kind,
    label: o.label ?? d.label,
    usedPct: remaining === null ? null : 100 - remaining,
    resetsAt: resetIn === null ? null : at(resetIn),
    observedAt: observedAgo === null ? null : at(-observedAgo),
  };
  if (o.pace) w.pace = o.pace;
  if (o.vouch !== undefined) w.decisionMaxAgeMinutes = o.vouch;
  return w;
}
const session = (remaining: number | null, o?: WinOpts) => mkWin("session", remaining, o);
const weekly = (remaining: number | null, o?: WinOpts) => mkWin("weekly", remaining, o);
const scoped = (remaining: number | null, o?: WinOpts) => mkWin("scoped", remaining, o);

interface AcctOpts {
  provider?: Provider;
  active?: boolean | "unknown";
  status?: AccountStatus;
  lastGood?: boolean;
  target?: SwitchTarget | null;
  alias?: string;
  workspace?: string | null;
  credits?: number;
  label?: string;
  blocked?: string;
}

let slot = 0;
function acct(name: string, windows: UsageWindow[], o: AcctOpts = {}): Account {
  const provider = o.provider ?? "claude";
  const email = `${name.toLowerCase()}@example.com`;
  const workspace = o.workspace ?? null;
  const target: SwitchTarget | null =
    o.target === undefined
      ? provider === "claude"
        ? { kind: "cswap", slot: ++slot }
        : { kind: "codex-managed", managedId: name, homePath: `/nonexistent/${name}` }
      : o.target;
  const a: Account = {
    provider,
    key: `${provider}:${email}|${workspace ?? ""}`,
    label: o.label ?? name,
    email,
    plan: "max",
    workspace,
    active: o.active ?? false,
    status: o.status ?? "ok",
    windows,
  };
  if (o.alias) a.alias = o.alias;
  if (o.lastGood) a.lastGood = true;
  if (target) a.switchTarget = target;
  if (o.credits !== undefined) a.resetCredits = { available: o.credits, observedAt: at(-1) };
  if (o.blocked) a.switchBlocked = o.blocked;
  return a;
}

function snap(accounts: Account[]): Snapshot {
  const s = emptySnapshot();
  for (const a of accounts) s.providers[a.provider].accounts.push(a);
  return s;
}

function run(
  accounts: Account[],
  prefs: Partial<SuggestionPrefs> = {},
  state: SuggestionState = emptySuggestionState(),
  now = NOW,
) {
  return suggest(snap(accounts), { ...PREFS, ...prefs }, now, state);
}
const actionable = (list: Suggestion[]) => list.filter((s) => s.kind !== "info");
const infos = (list: Suggestion[]) => list.filter((s) => s.kind === "info");

// ---------------------------------------------------------------------------
// headroom

test("headroom is the minimum remaining over session and weekly, with its binding window", () => {
  const a = acct("A", [session(30), weekly(70)]);
  const hr = headroom(a, PREFS, NOW);
  assert.equal(hr.value, 30);
  assert.equal(hr.binding?.id, "session");
  assert.equal(hr.reason, undefined);
  assert.equal(hr.windows.length, 2);
  assert.equal(headroom(acct("B", [session(80), weekly(12)]), PREFS, NOW).binding?.id, "weekly");
});

test("scoped windows count only when includeScopedWindows is on", () => {
  const a = acct("A", [session(60), weekly(50), scoped(5)]);
  assert.deepEqual(
    applicableWindows(a, PREFS).map((w) => w.id),
    ["session", "weekly"],
  );
  assert.equal(headroom(a, PREFS, NOW).value, 50);
  const on = { ...PREFS, includeScopedWindows: true };
  assert.equal(applicableWindows(a, on).length, 3);
  assert.equal(headroom(a, on, NOW).value, 5);
  assert.equal(headroom(a, on, NOW).binding?.id, "scoped:fable");
});

test("headroom stays unknown unless every applicable window is decision-grade", () => {
  const cases: { name: string; account: Account; reason: string }[] = [
    {
      name: "session 90 fresh + weekly stale",
      account: acct("A", [session(90), weekly(90, { observedAgo: 10 })]),
      reason: "stale",
    },
    {
      name: "weekly past reset",
      account: acct("A", [session(90), weekly(90, { resetIn: -1 })]),
      reason: "awaiting refresh after reset",
    },
    {
      name: "reset exactly now",
      account: acct("A", [session(90, { resetIn: 0 }), weekly(90)]),
      reason: "awaiting refresh after reset",
    },
    { name: "weekly value unknown", account: acct("A", [session(90), weekly(null)]), reason: "unknown window" },
    {
      name: "observedAt missing",
      account: acct("A", [session(90, { observedAgo: null }), weekly(90)]),
      reason: "stale",
    },
    {
      name: "observedAt 10 min in the future",
      account: acct("A", [session(90, { observedAgo: -10 }), weekly(90)]),
      reason: "stale",
    },
    {
      name: "relogin",
      account: acct("A", [session(90), weekly(90)], { status: "relogin" }),
      reason: "status: relogin",
    },
    {
      name: "disabled",
      account: acct("A", [session(90), weekly(90)], { status: "disabled" }),
      reason: "status: disabled",
    },
    {
      name: "last-known-good",
      account: acct("A", [session(90), weekly(90)], { lastGood: true }),
      reason: "last-known data",
    },
    { name: "no windows", account: acct("A", []), reason: "no quota data" },
    { name: "only scoped windows, pref off", account: acct("A", [scoped(90)]), reason: "no quota data" },
  ];
  for (const c of cases) {
    const hr = headroom(c.account, PREFS, NOW);
    assert.equal(hr.value, null, c.name);
    assert.equal(hr.binding, null, c.name);
    assert.equal(hr.reason, c.reason, c.name);
    assert.equal(isDecisionGrade(c.account, PREFS, NOW), false, c.name);
  }
});

test("exact 0 and 100 are known values, not unknown", () => {
  const full = acct("A", [session(100), weekly(100)]);
  const empty = acct("B", [session(0), weekly(40)]);
  assert.equal(headroom(full, PREFS, NOW).value, 100);
  assert.equal(headroom(empty, PREFS, NOW).value, 0);
  assert.equal(isDecisionGrade(empty, PREFS, NOW), true);
});

test("observation age boundary uses decisionMaxAgeMinutes", () => {
  assert.equal(headroom(acct("A", [weekly(50, { observedAgo: 5 })]), PREFS, NOW).value, 50);
  assert.equal(headroom(acct("A", [weekly(50, { observedAgo: 5.01 })]), PREFS, NOW).value, null);
  assert.equal(headroom(acct("A", [weekly(50, { observedAgo: -3 })]), PREFS, NOW).value, 50, "small skew ok");
});

// ---------------------------------------------------------------------------
// exhausted

test("exhausted: switches to the best positive-headroom candidate", () => {
  const A = acct("A", [session(60), weekly(0)], { active: true });
  const B = acct("B", [session(80), weekly(50)]);
  const C = acct("C", [session(90), weekly(10)]);
  const { suggestions } = run([A, B, C]);
  assert.equal(suggestions.length, 1);
  const s = suggestions[0];
  assert.equal(s.kind, "exhausted");
  assert.equal(s.id, `claude:exhausted:${B.key}`);
  assert.equal(s.targetKey, B.key);
  assert.equal(s.fromKey, A.key);
  assert.equal(s.title, "Switch Claude → B");
  assert.equal(s.detail, "A is out (Weekly resets in 3d); B has 50% left");
});

test("exhausted: a below-threshold target is labeled limited capacity", () => {
  const A = acct("A", [session(0), weekly(40)], { active: true });
  const C = acct("C", [session(8), weekly(90)]);
  const [s] = run([A, C]).suggestions;
  assert.equal(s.kind, "exhausted");
  assert.equal(s.targetKey, C.key);
  assert.match(s.detail, /C has 8% left \(limited capacity\)$/);
});

test("exhausted boundary: 0.5 remaining is out, 0.6 is not", () => {
  const B = acct("B", [session(90), weekly(90)]);
  const out = run([acct("A", [weekly(0.5)], { active: true }), B]).suggestions[0];
  assert.equal(out.kind, "exhausted");
  const low = run([acct("A", [weekly(0.6)], { active: true }), B]).suggestions[0];
  assert.equal(low.kind, "switch");
});

test("exhausted: no candidate with positive headroom -> no actionable suggestion", () => {
  const A = acct("A", [weekly(0)], { active: true });
  const B = acct("B", [weekly(0)]);
  const C = acct("C", [weekly(50, { observedAgo: 30 })]);
  assert.deepEqual(run([A, B, C]).suggestions, []);
});

// ---------------------------------------------------------------------------
// switch + hysteresis + cooldown

test("switch fires below threshold only with a clearly better candidate", () => {
  const cases: { active: number; cand: number; fires: boolean }[] = [
    { active: 19, cand: 40, fires: true },
    { active: 19, cand: 34, fires: true }, // exactly active + margin
    { active: 19, cand: 33, fires: false },
    { active: 5, cand: 20, fires: true }, // max(threshold, 5 + 15) = 20
    { active: 5, cand: 19, fires: false },
    { active: 20, cand: 90, fires: false }, // not below threshold, nothing previously on
  ];
  for (const c of cases) {
    const A = acct("A", [session(90), weekly(c.active)], { active: true });
    const B = acct("B", [session(95), weekly(c.cand)]);
    const acts = actionable(run([A, B]).suggestions);
    assert.equal(acts.length === 1 && acts[0].kind === "switch", c.fires, JSON.stringify(c));
    if (c.fires) {
      assert.equal(acts[0].title, "Switch Claude → B");
      assert.equal(acts[0].detail, `A has ${c.active}% left (Weekly); B has ${c.cand}%`);
      assert.equal(acts[0].id, `claude:switch:${B.key}`);
    }
  }
});

test("switch hysteresis: 19 fires, 23 stays on only if already on, 26 clears", () => {
  const B = acct("B", [session(95), weekly(90)]);
  const withActive = (r: number) => acct("A", [session(95), weekly(r)], { active: true });
  const id = `claude:switch:${B.key}`;

  const r1 = run([withActive(19), B]);
  assert.deepEqual(r1.nextState.active, [id]);

  const r2 = run([withActive(23), B], {}, r1.nextState, NOW + MIN);
  assert.deepEqual(
    r2.suggestions.map((s) => s.id),
    [id],
  );

  const fresh23 = run([withActive(23), B]);
  assert.deepEqual(fresh23.suggestions, [], "23% does not trigger from scratch");

  const r3 = run([withActive(26), B], {}, r2.nextState, NOW + 2 * MIN);
  assert.deepEqual(r3.suggestions, []);
  assert.deepEqual(r3.nextState.active, []);
  assert.equal(r3.nextState.clearedAt[id], at(2));
});

test("cooldown: a cleared id stays quiet for 5 minutes; exhausted overrides", () => {
  const B = acct("B", [session(95), weekly(90)]);
  const A19 = acct("A", [session(95), weekly(19)], { active: true });
  const id = `claude:switch:${B.key}`;
  const state: SuggestionState = { active: [], clearedAt: { [id]: at(0) } };

  const soon = run([A19, B], {}, state, NOW + 2 * MIN);
  assert.deepEqual(soon.suggestions, []);
  assert.equal(soon.nextState.clearedAt[id], at(0), "cooldown entry kept while running");

  // Readings observed at NOW+5 so they are still fresh when evaluated at NOW+6.
  const B5 = acct("B", [session(95, { observedAgo: -5 }), weekly(90, { observedAgo: -5 })]);
  const A5 = acct("A", [session(95, { observedAgo: -5 }), weekly(19, { observedAgo: -5 })], { active: true });
  const later = run([A5, B5], {}, state, NOW + 6 * MIN);
  assert.deepEqual(
    later.suggestions.map((s) => s.id),
    [id],
  );
  assert.equal(later.nextState.clearedAt[id], undefined, "expired entry pruned");

  const A0 = acct("A", [session(95), weekly(0)], { active: true });
  const exId = `claude:exhausted:${B.key}`;
  const exhausted = run([A0, B], {}, { active: [], clearedAt: { [exId]: at(0) } }, NOW + MIN);
  assert.deepEqual(
    exhausted.suggestions.map((s) => s.id),
    [exId],
  );
});

test("cooldown on the top rule does not substitute a lower-priority suggestion", () => {
  const A = acct("A", [session(95), weekly(15, { resetIn: 5 * 24 * 60 })], { active: true });
  const B = acct("B", [session(95), weekly(60, { resetIn: 10 * 60 })]);
  const prefs = { expiringQuotaAdvice: true };
  const base = run([A, B], prefs);
  assert.equal(base.suggestions[0].kind, "switch");
  const state: SuggestionState = { active: [], clearedAt: { [base.suggestions[0].id]: at(0) } };
  assert.deepEqual(run([A, B], prefs, state, NOW + MIN).suggestions, []);
});

// ---------------------------------------------------------------------------
// waitHint

test("waitHint only when the session window binds, resets within 30 min, and other windows are fine", () => {
  const B = acct("B", [session(95), weekly(90)]);
  const cases: { name: string; windows: UsageWindow[]; prefs?: Partial<SuggestionPrefs>; hint?: string }[] = [
    {
      name: "session binds, resets in 20m",
      windows: [session(5, { resetIn: 20 }), weekly(60)],
      hint: "or wait 20m for the 5h limit to reset",
    },
    {
      name: "exhausted session, resets in 10m",
      windows: [session(0, { resetIn: 10 }), weekly(60)],
      hint: "or wait 10m for the 5h limit to reset",
    },
    { name: "session resets in 40m", windows: [session(5, { resetIn: 40 }), weekly(60)] },
    { name: "weekly also low", windows: [session(5, { resetIn: 20 }), weekly(15)] },
    { name: "weekly binds", windows: [session(50, { resetIn: 20 }), weekly(5)] },
    {
      name: "scoped low and counted",
      windows: [session(5, { resetIn: 20 }), weekly(60), scoped(10)],
      prefs: { includeScopedWindows: true },
    },
    {
      name: "scoped low but not counted",
      windows: [session(5, { resetIn: 20 }), weekly(60), scoped(10)],
      hint: "or wait 20m for the 5h limit to reset",
    },
  ];
  for (const c of cases) {
    const A = acct("A", c.windows, { active: true });
    const acts = actionable(run([A, B], c.prefs).suggestions);
    assert.equal(acts.length, 1, c.name);
    assert.equal(acts[0].waitHint, c.hint, c.name);
  }
});

// ---------------------------------------------------------------------------
// pace

test("pace: advisory when the backend says the active account will not last", () => {
  const projected = at(26 * 60);
  const A = acct(
    "A",
    [session(90), weekly(40, { pace: { willLastToReset: false, projectedExhaustionAt: projected } })],
    {
      active: true,
    },
  );
  const B = acct("B", [session(95), weekly(60)]);
  const [s] = run([A, B]).suggestions;
  assert.equal(s.kind, "pace");
  assert.equal(s.id, `claude:pace:${B.key}`);
  assert.equal(s.title, "Consider B");
  assert.equal(
    s.detail,
    `Advisory: at current pace A runs out before its weekly reset (~${formatLocalTime(projected)}); B has 60% left`,
  );
  assert.equal(s.waitHint, undefined);
});

test("pace: not firing cases and ETA handling", () => {
  const B60 = acct("B", [session(95), weekly(60)]);
  const mkA = (pace: Pace | undefined, r = 40) =>
    acct("A", [session(90), weekly(r, pace ? { pace } : {})], { active: true });
  assert.deepEqual(run([mkA({ willLastToReset: true }), B60]).suggestions, []);
  assert.deepEqual(run([mkA(undefined), B60]).suggestions, []);
  assert.deepEqual(run([mkA({ willLastToReset: false }), acct("B", [weekly(54)])]).suggestions, [], "below margin");

  const noTime = run([mkA({ willLastToReset: false }), B60]).suggestions[0];
  assert.equal(noTime.detail, "Advisory: at current pace A runs out before its weekly reset; B has 60% left");
  const relative = run([mkA({ willLastToReset: false, projectedExhaustionAt: "in 2d 2h" }), B60]).suggestions[0];
  assert.doesNotMatch(relative.detail, /\(~/);
  const naive = run([mkA({ willLastToReset: false, projectedExhaustionAt: "2026-10-01T10:00:00" }), B60])
    .suggestions[0];
  assert.doesNotMatch(naive.detail, /\(~/, "no-offset time is not absolute");
  const past = run([mkA({ willLastToReset: false, projectedExhaustionAt: at(-60) }), B60]).suggestions[0];
  assert.doesNotMatch(past.detail, /\(~/);
});

// ---------------------------------------------------------------------------
// expiring

test("expiring is opt-in", () => {
  const A = acct("A", [session(90), weekly(60, { resetIn: 5 * 24 * 60 })], { active: true });
  const B = acct("B", [session(90), weekly(50, { resetIn: 10 * 60 })]);
  assert.deepEqual(run([A, B]).suggestions, []);
  const [s] = run([A, B], { expiringQuotaAdvice: true }).suggestions;
  assert.equal(s.kind, "expiring");
  assert.equal(s.id, `claude:expiring:${B.key}`);
  assert.equal(s.title, "Use B first");
  assert.equal(s.detail, "50% of its weekly quota resets in 10h");
});

test("expiring picks the earliest eligible weekly reset, not the highest headroom", () => {
  const A = acct("A", [session(90), weekly(60, { resetIn: 5 * 24 * 60 })], { active: true });
  const cands = [
    acct("B", [session(90), weekly(50, { resetIn: 10 * 60 })]), // eligible, earliest eligible
    acct("C", [session(95), weekly(80, { resetIn: 20 * 60 })]), // eligible, higher headroom
    acct("D", [session(95), weekly(90, { resetIn: 30 * 60 })]), // resets after 24 h
    acct("E", [session(95), weekly(25, { resetIn: 60 })]), // weekly remaining < 30
    acct("F", [session(10), weekly(60, { resetIn: 2 * 60 })]), // session headroom below threshold
  ];
  const [s] = run([A, ...cands], { expiringQuotaAdvice: true }).suggestions;
  assert.equal(s.targetKey, cands[0].key);
});

test("expiring requires the candidate to reset before the active account", () => {
  const A = acct("A", [session(90), weekly(60, { resetIn: 5 * 60 })], { active: true });
  const B = acct("B", [session(90), weekly(50, { resetIn: 10 * 60 })]);
  assert.deepEqual(run([A, B], { expiringQuotaAdvice: true }).suggestions, []);
  const unknownActiveReset = acct("A", [session(90), weekly(60, { resetIn: null })], { active: true });
  assert.deepEqual(run([unknownActiveReset, B], { expiringQuotaAdvice: true }).suggestions, []);
});

// ---------------------------------------------------------------------------
// priority, active detection, candidate filters

test("priority: exhausted beats pace and expiring; at most one actionable per provider", () => {
  const A = acct("A", [session(90), weekly(0, { pace: { willLastToReset: false } })], { active: true });
  const B = acct("B", [session(90), weekly(50, { resetIn: 60 })]);
  const C = acct("C", [session(90), weekly(80)]);
  const X = acct("X", [weekly(10)], { provider: "codex", active: true });
  const Y = acct("Y", [weekly(70)], { provider: "codex" });
  const { suggestions } = run([A, B, C, X, Y], { expiringQuotaAdvice: true });
  assert.deepEqual(
    suggestions.map((s) => [s.provider, s.kind, s.targetKey]),
    [
      ["claude", "exhausted", C.key],
      ["codex", "switch", Y.key],
    ],
  );
  assert.equal(suggestions[1].title, "Switch Codex → Y");
});

test("no actionable suggestion when the active account is unknown or ambiguous", () => {
  const B = acct("B", [session(95), weekly(90)]);
  const cases: { name: string; accounts: Account[]; detail: RegExp }[] = [
    { name: "none active", accounts: [acct("A", [weekly(0)]), B], detail: /paused until/ },
    { name: "active unknown", accounts: [acct("A", [weekly(0)], { active: "unknown" }), B], detail: /paused until/ },
    {
      name: "two active",
      accounts: [acct("A", [weekly(0)], { active: true }), acct("B", [weekly(90)], { active: true })],
      detail: /More than one/,
    },
  ];
  for (const c of cases) {
    const { suggestions, nextState } = run(c.accounts);
    assert.equal(actionable(suggestions).length, 0, c.name);
    assert.equal(suggestions.length, 1, c.name);
    assert.equal(suggestions[0].kind, "info");
    assert.equal(suggestions[0].title, "Could not tell which Claude account is active");
    assert.match(suggestions[0].detail, c.detail);
    assert.equal(suggestions[0].targetKey, undefined);
    assert.deepEqual(nextState.active, ["claude:info:active-unknown"]);
  }
  assert.deepEqual(run([]).suggestions, [], "no accounts, nothing to say");
});

test("no suggestion when the active account's own reading is not decision-grade", () => {
  const B = acct("B", [session(95), weekly(90)]);
  const cases = [
    acct("A", [session(10), weekly(10, { observedAgo: 20 })], { active: true }),
    acct("A", [session(10), weekly(10)], { active: true, lastGood: true, status: "error" }),
    acct("A", [session(0), weekly(null)], { active: true }),
    acct("A", [session(0, { resetIn: -5 }), weekly(50)], { active: true }),
  ];
  for (const A of cases) assert.deepEqual(run([A, B]).suggestions, [], JSON.stringify(A.windows));
});

test("candidates exclude disabled, errored, last-good, stale, target-less and zero-headroom accounts", () => {
  const A = acct("A", [session(95), weekly(5)], { active: true });
  const good = acct("Z", [session(40), weekly(40)]);
  const blocked = [
    acct("B", [session(99), weekly(99)], { status: "disabled" }),
    acct("C", [session(99), weekly(99)], { status: "error" }),
    acct("D", [session(99), weekly(99)], { lastGood: true }),
    acct("E", [session(99), weekly(99, { observedAgo: 30 })]),
    acct("F", [session(99), weekly(99)], { target: null }),
    acct("G", [session(99), weekly(99, { resetIn: -1 })]),
  ];
  const [s] = run([A, ...blocked, good]).suggestions;
  assert.equal(s.targetKey, good.key);
  assert.deepEqual(run([A, ...blocked]).suggestions, []);
});

test("exclusion list matches email, label or alias, case-insensitively", () => {
  const A = acct("A", [session(95), weekly(5)], { active: true });
  const B = acct("B", [session(95), weekly(90)], { alias: "Work", label: "Work Max" });
  const C = acct("C", [session(95), weekly(60)]);
  for (const exclude of [["b@example.com"], ["work max"], ["work"], [" B@EXAMPLE.COM "]]) {
    const [s] = run([A, B, C], { exclude }).suggestions;
    assert.equal(s.targetKey, C.key, exclude.join());
  }
  assert.deepEqual(run([A, B, C], { exclude: ["b@example.com", "c@example.com"] }).suggestions, []);
  assert.equal(run([A, B, C], { exclude: ["someone@example.invalid"] }).suggestions[0].targetKey, B.key);
});

test("best candidate ordering: headroom, then earlier weekly reset, then label", () => {
  const A = acct("A", [session(95), weekly(5)], { active: true });
  const late = acct("B", [session(95), weekly(50, { resetIn: 4 * 24 * 60 })]);
  const early = acct("C", [session(95), weekly(50, { resetIn: 2 * 24 * 60 })]);
  assert.equal(run([A, late, early]).suggestions[0].targetKey, early.key);
  const higher = acct("D", [session(95), weekly(51, { resetIn: 6 * 24 * 60 })]);
  assert.equal(run([A, late, early, higher]).suggestions[0].targetKey, higher.key);
  const m = acct("M", [session(95), weekly(50)]);
  const k = acct("K", [session(95), weekly(50)]);
  assert.equal(run([A, m, k]).suggestions[0].targetKey, k.key);
});

test("duplicate labels are disambiguated by workspace", () => {
  const A = acct("A", [weekly(5)], { provider: "codex", active: true });
  const b1 = acct("B", [weekly(60)], { provider: "codex", workspace: "Personal", label: "bob" });
  const b2: Account = { ...acct("B2", [weekly(40)], { provider: "codex", workspace: "Team", label: "bob" }) };
  const [s] = run([A, b1, b2]).suggestions;
  assert.equal(s.title, "Switch Codex → bob (Personal)");
});

// ---------------------------------------------------------------------------
// info: reset credits

test("reset-credit info for exhausted Codex accounts only", () => {
  const A = acct("A", [weekly(0)], { provider: "codex", active: true, credits: 2 });
  const B = acct("B", [weekly(40)], { provider: "codex", credits: 2 });
  // C's reading is too old for decisions (10 min > 5) but still current enough to show (<= 15).
  const C = acct("C", [weekly(0, { observedAgo: 10 })], { provider: "codex", credits: 1 });
  const D = acct("D", [weekly(0)], { provider: "codex", credits: 0 });
  const K = acct("K", [session(0), weekly(0)], { provider: "claude", active: true, credits: 3 });
  const { suggestions } = run([A, B, C, D, K]);
  const inf = infos(suggestions);
  assert.deepEqual(
    inf.map((s) => s.title),
    [
      "A has 2 reset credits — use them in the ChatGPT/Codex app",
      "C has 1 reset credit — use them in the ChatGPT/Codex app",
    ],
  );
  for (const s of inf) {
    assert.equal(s.targetKey, undefined);
    assert.equal(s.provider, "codex");
  }
  // A is exhausted and B has positive headroom: actionable first, then info.
  assert.equal(suggestions[0].kind, "exhausted");
  assert.equal(suggestions[0].targetKey, B.key);
});

// ---------------------------------------------------------------------------
// state bookkeeping and purity

test("nextState lists emitted ids; info clears without cooldown; stale entries are pruned", () => {
  const A = acct("A", [weekly(0)], { provider: "codex", active: true, credits: 1 });
  const B = acct("B", [weekly(80)], { provider: "codex" });
  const r1 = run([A, B], {}, { active: [], clearedAt: { "claude:switch:old": at(-30), "codex:pace:x": "junk" } });
  assert.deepEqual(r1.nextState.active, [`codex:exhausted:${B.key}`, `codex:info:credits:${A.key}`]);
  assert.deepEqual(r1.nextState.clearedAt, {});

  const A2 = acct("A", [weekly(90)], { provider: "codex", active: true, credits: 1 });
  const r2 = run([A2, B], {}, r1.nextState, NOW + MIN);
  assert.deepEqual(r2.suggestions, []);
  assert.deepEqual(r2.nextState.clearedAt, { [`codex:exhausted:${B.key}`]: at(1) });
});

test("suggest is pure: same inputs give same outputs and inputs are not mutated", () => {
  const A = acct("A", [session(95), weekly(19)], { active: true });
  const B = acct("B", [session(95), weekly(90)]);
  const snapshot = snap([A, B]);
  const state: SuggestionState = { active: ["claude:pace:x"], clearedAt: { y: at(-1) } };
  const before = JSON.stringify({ snapshot, state });
  const r1 = suggest(snapshot, PREFS, NOW, state);
  const r2 = suggest(snapshot, PREFS, NOW, state);
  assert.deepEqual(r1, r2);
  assert.equal(JSON.stringify({ snapshot, state }), before);
});

// ---------------------------------------------------------------------------
// Scenario mirroring src/test/fixtures/codexbar-codex-all.json, built by hand (the Codex
// normalizer is another module). Values copied from the redacted fixture.

test("fixture scenario: three Codex accounts", () => {
  const observed = "2026-09-29T20:56:56Z";
  const now = Date.parse("2026-09-29T20:58:00Z");
  const w = (used: number, resetsAt: string, pace?: Pace): UsageWindow => ({
    id: "weekly",
    kind: "weekly",
    label: "Weekly",
    usedPct: used,
    resetsAt,
    observedAt: observed,
    windowMinutes: 10080,
    ...(pace ? { pace } : {}),
  });
  const alicePace: Pace = {
    expectedUsedPct: 45,
    willLastToReset: false,
    projectedExhaustionAt: "2026-10-01T23:35:55.000Z", // etaSeconds 182339 anchored at observedAt
    summary: "15% in deficit",
    stage: "farAhead",
  };
  const alice: Account = {
    provider: "codex",
    key: "codex:alice@example.com|",
    label: "alice@example.com",
    email: "alice@example.com",
    plan: "pro",
    workspace: null,
    active: true,
    status: "ok",
    windows: [w(60, "2026-10-03T16:58:28Z", alicePace)],
    resetCredits: { available: 2, observedAt: observed },
    switchTarget: { kind: "codex-live" },
  };
  const bob: Account = {
    provider: "codex",
    key: "codex:bob@example.com|Personal",
    label: "bob@example.com",
    email: "bob@example.com",
    plan: "pro",
    workspace: "Personal",
    active: false,
    status: "ok",
    windows: [w(41, "2026-10-05T06:58:11Z", { expectedUsedPct: 23, willLastToReset: false })],
    resetCredits: { available: 2, observedAt: observed },
    switchTarget: { kind: "codex-managed", managedId: "managed-bob", homePath: "/nonexistent/bob" },
  };
  const carol: Account = {
    provider: "codex",
    key: "codex:carol@school.example.edu|Example University Pro (Edu)",
    label: "carol@school.example.edu",
    email: "carol@school.example.edu",
    plan: "edu_pro",
    workspace: "Example University Pro (Edu)",
    active: false,
    status: "ok",
    windows: [w(100, "2026-09-30T19:53:39Z")],
    resetCredits: { available: 0, observedAt: observed },
    switchTarget: { kind: "codex-managed", managedId: "managed-carol", homePath: "/nonexistent/carol" },
  };

  assert.equal(headroom(alice, PREFS, now).value, 40);
  assert.equal(headroom(bob, PREFS, now).value, 59);
  assert.equal(headroom(carol, PREFS, now).value, 0);

  const s = suggest(snap([alice, bob, carol]), { ...PREFS, expiringQuotaAdvice: true }, now, emptySuggestionState());
  assert.deepEqual(
    s.suggestions.map((x) => [x.kind, x.targetKey]),
    [["pace", bob.key]],
  );
  assert.equal(s.suggestions[0].title, "Consider bob@example.com");
  assert.match(s.suggestions[0].detail, new RegExp(`\\(~${formatLocalTime("2026-10-01T23:35:55.000Z")}\\)`));

  // Same accounts eight minutes later: every reading is stale, so nothing is actionable.
  const stale = suggest(snap([alice, bob, carol]), PREFS, now + 8 * MIN, emptySuggestionState());
  assert.deepEqual(stale.suggestions, []);

  // Alice exhausted: switch to bob and surface her reset credits.
  const aliceOut: Account = { ...alice, windows: [w(100, "2026-10-03T16:58:28Z", alicePace)] };
  const out = suggest(snap([aliceOut, bob, carol]), PREFS, now, emptySuggestionState());
  assert.deepEqual(
    out.suggestions.map((x) => [x.kind, x.targetKey ?? null]),
    [
      ["exhausted", bob.key],
      ["info", null],
    ],
  );
  assert.equal(
    out.suggestions[0].detail,
    "alice@example.com is out (Weekly resets in 3d20h); bob@example.com has 59% left",
  );
  assert.equal(out.suggestions[1].title, "alice@example.com has 2 reset credits — use them in the ChatGPT/Codex app");
});

// ---------------------------------------------------------------------------
// Backend-vouched decision horizon (cswap keeps idle and exhausted readings decision-grade for ~10 min)

const vouched = (observedAgo: number, vouch = 12): WinOpts => ({ observedAgo, vouch });
const unvouch = (a: Account): Account => ({
  ...a,
  windows: a.windows.map((w) => {
    const copy = { ...w };
    delete copy.decisionMaxAgeMinutes;
    return copy;
  }),
});

test("vouched horizon: exhausted active with alternates read 6-11 min ago still gets a suggestion", () => {
  const A = acct("A", [session(0, vouched(7)), weekly(60, vouched(7))], { active: true });
  for (const age of [6, 7, 8, 9, 10, 11]) {
    const B = acct("B", [session(95, vouched(age)), weekly(90, vouched(age))]);
    const [s] = run([A, B]).suggestions;
    assert.equal(s?.kind, "exhausted", `B read ${age} min ago`);
    assert.equal(s.targetKey, B.key, `B read ${age} min ago`);
  }
  // The same readings without a vouched horizon are too old for decisions (the 5-min preference applies).
  const B8 = acct("B", [session(95, vouched(8)), weekly(90, vouched(8))]);
  assert.deepEqual(run([unvouch(A), unvouch(B8)]).suggestions, []);
});

test("vouched horizon: a fresher but weaker alternate does not displace the stronger one", () => {
  const A = acct("A", [session(0, vouched(7)), weekly(60, vouched(7))], { active: true });
  const C = acct("C", [session(3), weekly(80)]); // 3% left, read 1 min ago, no horizon
  for (const age of [1, 4, 6, 9, 11]) {
    const B = acct("B", [session(95, vouched(age)), weekly(90, vouched(age))]);
    assert.equal(run([A, B, C]).suggestions[0].targetKey, B.key, `B read ${age} min ago`);
  }
});

test("vouched horizon bounds: its own limit, a 60-min cap, invalid values fall back, reset still wins", () => {
  assert.equal(headroom(acct("A", [weekly(50, vouched(12))]), PREFS, NOW).value, 50);
  assert.equal(headroom(acct("A", [weekly(50, vouched(12.5))]), PREFS, NOW).reason, "stale");
  assert.equal(headroom(acct("A", [weekly(50, vouched(59, 600))]), PREFS, NOW).value, 50);
  assert.equal(headroom(acct("A", [weekly(50, vouched(61, 600))]), PREFS, NOW).reason, "stale", "capped at 60");
  assert.equal(decisionMaxAge(weekly(50, { vouch: Number.NaN }), PREFS), 5);
  assert.equal(decisionMaxAge(weekly(50, { vouch: -1 }), PREFS), 5);
  assert.equal(decisionMaxAge(weekly(50), PREFS), 5);
  assert.equal(decisionMaxAge(weekly(50, { vouch: 12 }), PREFS), 12);
  assert.equal(
    headroom(acct("A", [weekly(50, { resetIn: -1, observedAgo: 3, vouch: 12 })]), PREFS, NOW).reason,
    "awaiting refresh after reset",
  );
});

test("a fixed display limit ignores the vouched horizon", () => {
  const a = acct("A", [session(40, vouched(20, 60)), weekly(70, vouched(20, 60))]);
  assert.equal(headroom(a, PREFS, NOW).value, 40, "decision-grade by the backend's horizon");
  assert.equal(headroom(a, PREFS, NOW, { maxAgeMinutes: 15 }).value, null, "not current enough to show");
  assert.equal(headroom(a, PREFS, NOW, { maxAgeMinutes: 15 }).reason, "stale");
  const fresh = acct("B", [session(40, vouched(10, 60)), weekly(70, vouched(10, 60))]);
  assert.equal(headroom(fresh, PREFS, NOW, { maxAgeMinutes: 15 }).value, 40);
});

// ---------------------------------------------------------------------------
// Suggestion state survives inputs that could not be evaluated

test("a stale cached snapshot carries an on suggestion forward without a cooldown", () => {
  const B = acct("B", [session(95), weekly(90)]);
  const A = acct("A", [session(95), weekly(15)], { active: true });
  const id = `claude:switch:${B.key}`;
  const r1 = run([A, B]);
  assert.deepEqual(r1.nextState.active, [id]);

  // Six minutes later the list's first render uses the cached snapshot (readings now 7 min old).
  const r2 = run([A, B], {}, r1.nextState, NOW + 6 * MIN);
  assert.deepEqual(r2.suggestions, []);
  assert.deepEqual(r2.nextState.active, [id], "carried forward");
  assert.deepEqual(r2.nextState.clearedAt, {}, "no cooldown stamped");

  // The refresh lands with fresh readings: the suggestion is back at once.
  const A6 = acct("A", [session(95, { observedAgo: -5 }), weekly(15, { observedAgo: -5 })], { active: true });
  const B6 = acct("B", [session(95, { observedAgo: -5 }), weekly(90, { observedAgo: -5 })]);
  const r3 = run([A6, B6], {}, r2.nextState, NOW + 6 * MIN);
  assert.deepEqual(
    r3.suggestions.map((s) => s.id),
    [id],
  );
});

test("a stale blip inside the hysteresis band does not lose the suggestion", () => {
  const id = (b: Account) => `claude:switch:${b.key}`;
  const obs = (at: number) => ({ observedAgo: -at });
  const A = (r: number, t: number) => acct("A", [session(95, obs(t)), weekly(r, obs(t))], { active: true });
  const B = (t: number) => acct("B", [session(95, obs(t)), weekly(90, obs(t))]);
  const r1 = run([A(15, 0), B(0)]);
  const r2 = run([A(21, 1), B(1)], {}, r1.nextState, NOW + 1 * MIN);
  assert.deepEqual(
    r2.suggestions.map((s) => s.id),
    [id(B(1))],
    "21% stays on inside the band",
  );
  const blip = run([A(21, 1), B(1)], {}, r2.nextState, NOW + 8 * MIN); // readings 7 min old
  assert.deepEqual(blip.suggestions, []);
  const later = run([A(21, 20), B(20)], {}, blip.nextState, NOW + 20 * MIN);
  assert.deepEqual(
    later.suggestions.map((s) => s.id),
    [id(B(20))],
    "still on after the blip",
  );
});

test("unknown or ambiguous active, or no accounts, carries that provider's ids and stamps nothing", () => {
  const B = acct("B", [session(95), weekly(90)]);
  const claudeId = `claude:switch:${B.key}`;
  const codexId = "codex:exhausted:codex:y@example.com|";
  const state: SuggestionState = { active: [claudeId, codexId], clearedAt: {} };
  const cases: { name: string; accounts: Account[] }[] = [
    { name: "none active", accounts: [acct("A", [weekly(10)]), B] },
    {
      name: "two active",
      accounts: [acct("A", [weekly(10)], { active: true }), acct("B", [weekly(90)], { active: true })],
    },
    { name: "active unknown", accounts: [acct("A", [weekly(10)], { active: "unknown" }), B] },
    { name: "active reading past reset", accounts: [acct("A", [weekly(10, { resetIn: -1 })], { active: true }), B] },
  ];
  for (const c of cases) {
    const { nextState } = run(c.accounts, {}, state);
    assert.ok(nextState.active.includes(claudeId), c.name);
    assert.ok(nextState.active.includes(codexId), `${c.name}: no Codex accounts at all`);
    assert.deepEqual(nextState.clearedAt, {}, c.name);
  }
});

test("an id whose target reading is transiently unknown is carried; an untargetable target clears it", () => {
  const A = acct("A", [session(95), weekly(15)], { active: true });
  const Bstale = acct("B", [session(95), weekly(90, { observedAgo: 30 })]);
  const id = `claude:switch:${Bstale.key}`;
  const state: SuggestionState = { active: [id], clearedAt: {} };
  const r = run([A, Bstale], {}, state, NOW);
  assert.deepEqual(r.suggestions, []);
  assert.deepEqual(r.nextState.active, [id]);
  assert.deepEqual(r.nextState.clearedAt, {});

  const Bdisabled = acct("B", [session(95), weekly(90)], { status: "disabled" });
  const gone = run([A, Bdisabled], {}, state, NOW);
  assert.deepEqual(gone.nextState.active, []);
  assert.equal(gone.nextState.clearedAt[id], at(0), "evaluated false on decision-grade data: cooldown");
});

// ---------------------------------------------------------------------------
// Accounts blocked from one-key switching

test("a blocked account is never targeted; an info item says where to switch instead", () => {
  const reason = "Your current Codex account is not saved in CodexBar yet.";
  const live = { kind: "codex-live" } as const;
  const A = acct("A", [weekly(10)], { provider: "codex", active: true, target: live });
  const B = acct("B", [weekly(80)], { provider: "codex", blocked: reason });
  const { suggestions, nextState } = run([A, B]);
  assert.equal(actionable(suggestions).length, 0);
  assert.equal(suggestions.length, 1);
  const [s] = suggestions;
  assert.equal(s.kind, "info");
  assert.equal(s.targetKey, undefined);
  assert.equal(s.id, `codex:info:switch-blocked:${B.key}`);
  assert.equal(isSwitchBlockedInfo(s), true);
  assert.equal(s.title, "Switch Codex → B in CodexBar");
  assert.equal(s.detail, `A has 10% left (Weekly); B has 80%. One-key switching is unavailable: ${reason}`);
  assert.deepEqual(nextState.active, [s.id]);

  const out = run([acct("A", [weekly(0)], { provider: "codex", active: true, target: live }), B]).suggestions;
  assert.equal(out[0].title, "Switch Codex → B in CodexBar");
  assert.match(out[0].detail, /^A is out/);

  // An unblocked alternative is suggested normally, and no blocked note is added.
  const C = acct("C", [weekly(60)], { provider: "codex" });
  const withC = run([A, B, C]).suggestions;
  assert.deepEqual(
    withC.map((x) => [x.kind, x.targetKey]),
    [["switch", C.key]],
  );

  // Nothing would fire even with B unblocked: nothing to say.
  assert.deepEqual(
    run([acct("A", [weekly(90)], { provider: "codex", active: true, target: live }), B]).suggestions,
    [],
  );
});

test("blocked note wording for advisory kinds and for Claude", () => {
  const A = acct("A", [session(90), weekly(40, { pace: { willLastToReset: false } })], { active: true });
  const B = acct("B", [session(95), weekly(60)], { blocked: "slot needs a new login" });
  const [s] = run([A, B]).suggestions;
  assert.equal(s.kind, "info");
  assert.equal(s.title, "Consider B (switch in claude-swap)");
  assert.match(s.detail, /One-key switching is unavailable: slot needs a new login$/);

  const A2 = acct("A", [session(95), weekly(10)], { active: true });
  assert.equal(run([A2, B]).suggestions[0].title, "Switch Claude → B in claude-swap");

  const credits = run([acct("X", [weekly(0)], { provider: "codex", active: true, credits: 1 })]).suggestions;
  assert.equal(credits.length, 1);
  assert.equal(isSwitchBlockedInfo(credits[0]), false);
});

// ---------------------------------------------------------------------------
// Reset-credit advice needs a current reading

test("reset-credit advice is withheld for past-reset, hours-old and error readings", () => {
  const X = acct("X", [weekly(50)], { provider: "codex", active: true });
  const creditTitles = (accounts: Account[]) =>
    infos(run([X, ...accounts]).suggestions)
      .filter((s) => s.id.startsWith("codex:info:credits:"))
      .map((s) => s.title);
  const cases: { name: string; account: Account }[] = [
    {
      name: "reset passed 30 min ago, read 10 h ago",
      account: acct("P", [weekly(0, { resetIn: -30, observedAgo: 600 })], { provider: "codex", credits: 2 }),
    },
    {
      name: "read an hour ago",
      account: acct("Q", [weekly(0, { observedAgo: 60 })], { provider: "codex", credits: 2 }),
    },
    {
      name: "last-known-good error row",
      account: acct("R", [weekly(0)], { provider: "codex", credits: 2, status: "error", lastGood: true }),
    },
    { name: "error row", account: acct("S", [weekly(0)], { provider: "codex", credits: 2, status: "error" }) },
  ];
  for (const c of cases) assert.deepEqual(creditTitles([c.account]), [], c.name);

  const at15 = acct("T", [weekly(0, { observedAgo: 15 })], { provider: "codex", credits: 1 });
  assert.deepEqual(creditTitles([at15]), ["T has 1 reset credit — use them in the ChatGPT/Codex app"]);
  const past15 = acct("T", [weekly(0, { observedAgo: 15.5 })], { provider: "codex", credits: 1 });
  assert.deepEqual(creditTitles([past15]), []);
});

// ---------------------------------------------------------------------------
// Candidates must be out of the exhausted band

test("exhausted: a candidate at or below 0.5% left is not a target", () => {
  const A = acct("A", [weekly(0)], { active: true });
  assert.deepEqual(run([A, acct("B", [weekly(0.4)])]).suggestions, []);
  assert.deepEqual(run([A, acct("B", [weekly(0.5)])]).suggestions, []);
  const [s] = run([A, acct("B", [weekly(0.6)])]).suggestions;
  assert.equal(s.kind, "exhausted");
  assert.match(s.detail, /B has 1% left \(limited capacity\)$/);
  // Two nearly empty accounts never point at each other.
  assert.deepEqual(run([acct("A", [weekly(0.3)], { active: true }), acct("B", [weekly(0.4)])]).suggestions, []);
  assert.deepEqual(run([acct("A", [weekly(0.4)], { active: true }), acct("B", [weekly(0.3)])]).suggestions, []);
});
