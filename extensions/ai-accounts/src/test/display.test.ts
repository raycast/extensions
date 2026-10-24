import assert from "node:assert/strict";
import { test } from "node:test";
import {
  activeRowId,
  canRepairLogin,
  displayHeadroom,
  menuSegment,
  POST_SWITCH_SETTLE_MS,
  switchableSuggestions,
  switchWatchDone,
  unresolvedOperation,
  windowName,
  windowsSummary,
} from "../lib/display";
import {
  Account,
  emptySnapshot,
  OperationRecord,
  Snapshot,
  Suggestion,
  SuggestionPrefs,
  UsageWindow,
} from "../lib/model";
import { headroom } from "../lib/suggest";

const NOW = Date.parse("2026-09-29T21:00:00Z");
const iso = (offsetMin: number) => new Date(NOW + offsetMin * 60_000).toISOString();

const prefs: SuggestionPrefs = {
  threshold: 20,
  margin: 15,
  includeScopedWindows: false,
  expiringQuotaAdvice: false,
  exclude: [],
  decisionMaxAgeMinutes: 5,
};

function win(kind: UsageWindow["kind"], usedPct: number | null, resetInMin: number, observedMinAgo = 1): UsageWindow {
  return {
    id: kind === "scoped" ? "scoped:Fable" : kind,
    kind,
    label: kind === "session" ? "5h" : kind === "weekly" ? "Weekly" : "Fable",
    usedPct,
    resetsAt: iso(resetInMin),
    observedAt: iso(-observedMinAgo),
  };
}

function account(windows: UsageWindow[], extra: Partial<Account> = {}): Account {
  return {
    provider: "claude",
    key: "claude:a@example.com|",
    label: "a@example.com",
    email: "a@example.com",
    plan: null,
    workspace: null,
    active: true,
    status: "ok",
    windows,
    ...extra,
  };
}

const detailed = { value: "detailed" as const, percentMode: "remaining" as const, prefs, maxAgeMinutes: 15 };

test("detailed: named 5h and weekly remaining plus 5h reset countdown", () => {
  const a = account([win("session", 53, 200), win("weekly", 11, 1200)]);
  assert.equal(menuSegment(a, detailed, NOW), "5h 47% W 89% 3h20m");
});

test("detailed labels both windows in used mode", () => {
  const a = account([win("session", 53, 200), win("weekly", 11, 1200)]);
  assert.equal(menuSegment(a, { ...detailed, percentMode: "used" }, NOW), "5h 53% W 11% 3h20m");
});

test("exact 0 and 100 render", () => {
  const a = account([win("session", 100, 30), win("weekly", 0, 1200)]);
  assert.equal(menuSegment(a, detailed, NOW), "5h 0% W 100% 30m");
});

test("weekly-only accounts (Codex) show one value", () => {
  const a = account([win("weekly", 63, 5000)], { provider: "codex" });
  assert.equal(menuSegment(a, detailed, NOW), "W 37%");
  assert.equal(menuSegment(a, { ...detailed, percentMode: "used" }, NOW), "W 63%");
});

test("stale or past-reset readings show ? and no countdown", () => {
  const stale = account([win("session", 10, 100, 60), win("weekly", 10, 1000)]);
  assert.equal(menuSegment(stale, detailed, NOW), "5h ? W 90% 1h40m");
  assert.equal(menuSegment(stale, { ...detailed, percentMode: "used" }, NOW), "5h ? W 10% 1h40m");
  const pastReset = account([win("session", 90, -5), win("weekly", 10, 1000)]);
  assert.equal(menuSegment(pastReset, detailed, NOW), "5h ? W 90%");
  assert.equal(menuSegment(pastReset, { ...detailed, percentMode: "used" }, NOW), "5h ? W 10%");
});

test("weekly readings stay named when stale or past reset in both percent modes", () => {
  for (const percentMode of ["remaining", "used"] as const) {
    for (const weekly of [win("weekly", 65, 5000, 60), win("weekly", 65, -1)]) {
      const a = account([weekly], { provider: "codex" });
      assert.equal(menuSegment(a, { ...detailed, percentMode }, NOW), "W ?");
      assert.equal(menuSegment(a, { ...detailed, percentMode, value: "weekly" }, NOW), "W ?");
      const claude = account([win("session", 1, 209), weekly]);
      const sessionValue = percentMode === "remaining" ? 99 : 1;
      assert.equal(menuSegment(claude, { ...detailed, percentMode }, NOW), `5h ${sessionValue}% W ? 3h29m`);
    }
  }
});

test("session-only and empty accounts retain explicit window labels", () => {
  const sessionOnly = account([win("session", 1, 209)]);
  assert.equal(menuSegment(sessionOnly, detailed, NOW), "5h 99% 3h29m");
  assert.equal(menuSegment(sessionOnly, { ...detailed, percentMode: "used" }, NOW), "5h 1% 3h29m");
  assert.equal(menuSegment(account([]), detailed, NOW), "W ?");
});

test("non-ok and last-good accounts never show current numbers", () => {
  const a = account([win("session", 10, 100), win("weekly", 10, 1000)], { status: "relogin" });
  assert.equal(menuSegment(a, detailed, NOW), "5h ? W ? 1h40m");
  const b = account([win("session", 10, 100), win("weekly", 10, 1000)], { lastGood: true });
  assert.equal(menuSegment(b, detailed, NOW), "5h ? W ? 1h40m");
});

test("headroom mode uses the lowest window", () => {
  const a = account([win("session", 53, 200), win("weekly", 11, 1200)]);
  assert.equal(menuSegment(a, { ...detailed, value: "headroom" }, NOW), "47%");
  assert.equal(menuSegment(a, { ...detailed, value: "headroom", percentMode: "used" }, NOW), "53%");
});

test("weekly mode ignores the 5h window", () => {
  const a = account([win("session", 53, 200), win("weekly", 11, 1200)]);
  assert.equal(menuSegment(a, { ...detailed, value: "weekly" }, NOW), "W 89%");
  assert.equal(menuSegment(a, { ...detailed, value: "weekly", percentMode: "used" }, NOW), "W 11%");
});

test("windowsSummary lists scoped weekly limits by default in both percent modes", () => {
  const a = account([win("session", 53, 200), win("weekly", 11, 1200), win("scoped", 0, 1200)]);
  const opts = { percentMode: "remaining" as const, maxAgeMinutes: 15 };
  assert.equal(windowsSummary(a, opts, NOW), "5h 47% · Wk 89% · Fable 100%");
  assert.equal(windowsSummary(a, { ...opts, percentMode: "used" }, NOW), "5h 53% · Wk 11% · Fable 0%");
});

test("visible scoped limits only affect headroom when the preference is on", () => {
  const a = account([win("session", 53, 200), win("weekly", 11, 1200), win("scoped", 98, 1200)]);
  assert.equal(windowsSummary(a, { percentMode: "remaining", maxAgeMinutes: 15 }, NOW), "5h 47% · Wk 89% · Fable 2%");
  assert.equal(displayHeadroom(a, prefs, NOW).value, 47);
  assert.equal(displayHeadroom(a, { ...prefs, includeScopedWindows: true }, NOW).value, 2);
});

test("window names identify the 5-hour, weekly, and model weekly limits", () => {
  assert.equal(windowName(win("session", 1, 209)), "5-hour");
  assert.equal(windowName(win("weekly", 27, 1200)), "Weekly");
  assert.equal(windowName(win("scoped", 0, 1200)), "Fable weekly");
});

// ---------------------------------------------------------------------------
// A backend-vouched decision horizon never loosens display staleness

const vouched = (w: UsageWindow, minutes = 60): UsageWindow => ({ ...w, decisionMaxAgeMinutes: minutes });

test("display helpers keep the 15-min limit even when the backend vouches for older readings", () => {
  const a = account([vouched(win("session", 53, 200, 20)), vouched(win("weekly", 11, 1200, 20))]);
  assert.equal(headroom(a, prefs, NOW).value, 47, "decision-grade for suggestions");
  assert.equal(displayHeadroom(a, prefs, NOW).value, null, "not shown as current");
  assert.equal(displayHeadroom(a, prefs, NOW, 30).value, 47, "explicit display limit");
  assert.equal(menuSegment(a, { ...detailed, value: "headroom" }, NOW), "?");
  assert.equal(menuSegment(a, detailed, NOW), "5h ? W ? 3h20m");
  const opts = { percentMode: "remaining" as const, maxAgeMinutes: 15 };
  assert.equal(windowsSummary(a, opts, NOW), "5h ? · Wk ?");
  const fresh = account([vouched(win("session", 53, 200, 10)), vouched(win("weekly", 11, 1200, 10))]);
  assert.equal(menuSegment(fresh, { ...detailed, value: "headroom" }, NOW), "47%");
});

// ---------------------------------------------------------------------------
// Switch records shown in the list

function op(requestId: string, state: OperationRecord["state"], startedMin: number, provider = "claude" as const) {
  const r: OperationRecord = {
    requestId,
    provider,
    targetKey: `claude:${requestId}@example.com|`,
    targetLabel: `${requestId}@example.com`,
    state,
    startedAt: iso(startedMin),
    finishedAt: state === "running" ? null : iso(startedMin + 1),
    message: `${state} message for ${requestId}`,
  };
  return r;
}

test("unresolvedOperation: newest running/unknown switch until a later one succeeds", () => {
  assert.equal(unresolvedOperation([], "claude"), null);
  assert.equal(unresolvedOperation([op("a", "unknown", -10)], "claude")?.requestId, "a");
  assert.equal(unresolvedOperation([op("a", "running", -1)], "claude")?.requestId, "a");
  assert.equal(unresolvedOperation([op("a", "unknown", -10)], "codex"), null, "other provider");
  // Newest first, as the store keeps them.
  assert.equal(unresolvedOperation([op("b", "succeeded", -5), op("a", "unknown", -10)], "claude"), null);
  assert.equal(
    unresolvedOperation([op("b", "failed", -5), op("a", "unknown", -10)], "claude")?.requestId,
    "a",
    "a later failure does not settle an unknown outcome",
  );
  assert.equal(
    unresolvedOperation([op("c", "unknown", -2), op("b", "succeeded", -5), op("a", "unknown", -10)], "claude")
      ?.requestId,
    "c",
  );
  // A late orphan reconciliation moves an older record to the front; start time still decides.
  assert.equal(unresolvedOperation([op("a", "unknown", -10), op("b", "succeeded", -5)], "claude"), null);
  const codex: OperationRecord = { ...op("x", "unknown", -3), provider: "codex" };
  assert.equal(unresolvedOperation([codex, op("b", "succeeded", -5)], "codex")?.requestId, "x");
});

// ---------------------------------------------------------------------------
// Initial selection and one-click switches

function snapWith(accounts: Account[]): Snapshot {
  const s = emptySnapshot();
  for (const a of accounts) s.providers[a.provider].accounts.push(a);
  return s;
}

test("activeRowId opens the list on the active Claude row, else the active Codex row", () => {
  const c1 = account([], { key: "claude:one|", active: false });
  const c2 = account([], { key: "claude:two|", active: true });
  const x1 = account([], { provider: "codex", key: "codex:x|", active: true });
  assert.equal(activeRowId(snapWith([c1, c2, x1])), "claude:two|");
  assert.equal(activeRowId(snapWith([c1, { ...c2, active: "unknown" }, x1])), "codex:x|");
  assert.equal(activeRowId(snapWith([c1])), undefined);
});

test("switchableSuggestions drops info items, missing targets and blocked targets", () => {
  const blocked = account([], { provider: "codex", key: "codex:b|", active: false, switchBlocked: "not saved" });
  const ok = account([], { provider: "codex", key: "codex:c|", active: false });
  const snap = snapWith([blocked, ok]);
  const s = (id: string, targetKey?: string): Suggestion => ({
    provider: "codex",
    kind: targetKey ? "switch" : "info",
    id,
    title: id,
    detail: "",
    ...(targetKey ? { targetKey } : {}),
  });
  assert.deepEqual(
    switchableSuggestions([s("to-b", "codex:b|"), s("to-c", "codex:c|"), s("gone", "codex:z|"), s("info")], snap).map(
      (x) => x.id,
    ),
    ["to-c"],
  );
});

// ---------------------------------------------------------------------------
// Integration: the list follows a switch until its post-switch refresh lands or nothing will land

test("unresolvedOperation: a later hand-off does not settle an earlier unknown switch", () => {
  const handoff: OperationRecord = { ...op("h", "succeeded", -2), outcome: "handoff" };
  assert.equal(unresolvedOperation([handoff, op("a", "unknown", -10)], "claude")?.requestId, "a");
  const noop: OperationRecord = { ...op("n", "succeeded", -2), outcome: "noop" };
  assert.equal(unresolvedOperation([noop, op("a", "unknown", -10)], "claude"), null);
});

test("switchWatchDone: running, refresh landed, hand-off, lock still held, and the settle grace", () => {
  const finished = op("s", "succeeded", -2); // started NOW-2min, finished NOW-1min
  const finishedMs = Date.parse(finished.finishedAt!);
  assert.equal(switchWatchDone(undefined, null, false, NOW), false, "no record yet");
  assert.equal(switchWatchDone(op("r", "running", -1), iso(0), false, NOW), false, "still running");
  assert.equal(switchWatchDone(finished, iso(-1), true, NOW), true, "a refresh started after the switch landed");
  assert.equal(switchWatchDone(finished, iso(-3), true, NOW), false, "the post-switch refresh holds the lock");
  assert.equal(switchWatchDone(finished, null, false, finishedMs + 1_000), false, "the refresh may not have started");
  assert.equal(
    switchWatchDone(finished, iso(-3), false, finishedMs + POST_SWITCH_SETTLE_MS),
    true,
    "nothing holds the lock after the grace: nothing will land (busy, superseded, refused)",
  );
  assert.equal(switchWatchDone({ ...finished, outcome: "handoff" }, null, true, NOW), true, "hand-off: no refresh");
  const failed = op("f", "failed", -2);
  assert.equal(switchWatchDone(failed, null, false, NOW), true);
});

test("canRepairLogin: only the active claude-swap row whose live login is another account's", () => {
  const cswap = { kind: "cswap" as const, slot: 1 };
  assert.equal(canRepairLogin(account([], { loginRepair: true, switchTarget: cswap })), true);
  assert.equal(canRepairLogin(account([], { switchTarget: cswap })), false);
  assert.equal(canRepairLogin(account([], { loginRepair: true, switchTarget: cswap, active: false })), false);
  assert.equal(canRepairLogin(account([], { loginRepair: true })), false, "no slot to switch to");
  assert.equal(
    canRepairLogin(account([], { loginRepair: true, switchTarget: cswap, switchBlocked: "Re-login needed" })),
    false,
  );
  assert.equal(
    canRepairLogin(account([], { loginRepair: true, provider: "codex", switchTarget: { kind: "codex-live" } })),
    false,
  );
});
