import { after, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  displayLabels,
  ensureFinalRecord,
  FAILED_RETRY_MS,
  FlowDeps,
  isSwitchRequest,
  performSwitch,
  providerDue,
  refreshStale,
  remainingLevel,
  Switcher,
} from "../lib/flow";
import { Account, emptyProviderState, Provider, ProviderFetch, Snapshot, SwitchRequest } from "../lib/model";
import {
  acquireLock,
  readOperations,
  readSnapshot,
  reconcileRunningOperations,
  refreshProvider,
  StoredOperationRecord,
  StoredProviderState,
  upsertOperation,
} from "../lib/store";

const tmpDirs: string[] = [];
after(() => {
  for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true });
});

function tmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-accounts-flow-"));
  tmpDirs.push(dir);
  return dir;
}

function acct(provider: Provider, email: string, active: boolean, extra: Partial<Account> = {}): Account {
  return {
    provider,
    key: `${provider}:${email}|`,
    label: email,
    email,
    plan: "max",
    workspace: null,
    active,
    status: "ok",
    windows: [
      { id: "session", kind: "session", label: "5h", usedPct: 0, resetsAt: null, observedAt: null },
      { id: "weekly", kind: "weekly", label: "Weekly", usedPct: 100, resetsAt: null, observedAt: null },
    ],
    ...extra,
  };
}

function fetched(provider: Provider, accounts: Account[]): ProviderFetch {
  return { provider, source: provider === "claude" ? "cswap" : "codexbar", accounts, notices: [] };
}

function request(target: Account, requestId = "req-1"): SwitchRequest {
  return {
    requestId,
    provider: target.provider,
    targetKey: target.key,
    expectedEmail: target.email,
    targetLabel: target.label,
    via: "list",
  };
}

interface Harness {
  deps: FlowDeps;
  switchCalls: SwitchRequest[];
}

function harness(
  dir: string,
  opts: {
    claudeFetch?: () => Promise<ProviderFetch>;
    codexFetch?: () => Promise<ProviderFetch>;
    claudeSwitch?: Switcher;
    codexSwitch?: Switcher;
    nowMs?: () => number;
    switchLockWaitMs?: number;
  },
): Harness {
  const switchCalls: SwitchRequest[] = [];
  const unexpected: Switcher = async () => {
    throw new Error("unexpected switch");
  };
  const wrap =
    (s: Switcher): Switcher =>
    (req, hooks) => {
      switchCalls.push(req);
      return s(req, hooks);
    };
  return {
    switchCalls,
    deps: {
      dir,
      fetchers: {
        claude: opts.claudeFetch ?? (async () => fetched("claude", [])),
        codex: opts.codexFetch ?? (async () => fetched("codex", [])),
      },
      switchers: { claude: wrap(opts.claudeSwitch ?? unexpected), codex: wrap(opts.codexSwitch ?? unexpected) },
      nowMs: opts.nowMs,
      switchLockWaitMs: opts.switchLockWaitMs,
    },
  };
}

function activeByKey(snap: Snapshot, provider: Provider): Record<string, boolean | "unknown"> {
  return Object.fromEntries(snap.providers[provider].accounts.map((a) => [a.key, a.active]));
}

test("successful switch commits the new active account and bumps the identity generation", async () => {
  const dir = tmpDir();
  const a = acct("claude", "a@example.com", true);
  const b = acct("claude", "b@example.com", false);
  let calls = 0;
  let seenAtRefresh: Snapshot | null = null;
  let lockBodyDuringSwitch: Record<string, unknown> | null = null;
  // The switch child ran and exited before the switch returned (a child still running at release keeps the lock).
  const exited = await deadPid();
  const { deps, switchCalls } = harness(dir, {
    claudeFetch: async () => {
      calls += 1;
      if (calls === 1) return fetched("claude", [a, b]);
      seenAtRefresh = readSnapshot(dir);
      return fetched("claude", [
        { ...a, active: false },
        { ...b, active: true },
      ]);
    },
    claudeSwitch: async (_req, hooks) => {
      hooks.onSpawn?.(exited);
      lockBodyDuringSwitch = JSON.parse(fs.readFileSync(path.join(dir, "provider-claude.lock"), "utf8"));
      return { state: "succeeded", message: "Claude switched to b@example.com.", activeKey: b.key };
    },
  });
  await refreshStale(deps, { maxAgeMs: 60_000 });
  const before = readSnapshot(dir).providers.claude;
  assert.equal(before.identityGeneration, 0);

  const result = await performSwitch(deps, request(b));
  assert.deepEqual(result, { state: "succeeded", message: "Claude switched to b@example.com." });
  assert.equal(switchCalls.length, 1);
  assert.equal(lockBodyDuringSwitch!.childPid, exited);

  // commitSwitch ran before the post-switch refresh
  const mid = seenAtRefresh as Snapshot | null;
  assert.ok(mid);
  assert.equal(mid.providers.claude.identityGeneration, 1);
  assert.deepEqual(activeByKey(mid, "claude"), { [a.key]: false, [b.key]: true });

  const after = readSnapshot(dir);
  assert.equal(after.providers.claude.identityGeneration, 1);
  assert.deepEqual(activeByKey(after, "claude"), { [a.key]: false, [b.key]: true });
  const op = readOperations(dir).find((r) => r.requestId === "req-1");
  assert.equal(op?.state, "succeeded");
  assert.ok(op?.finishedAt);
  assert.equal(fs.existsSync(path.join(dir, "provider-claude.lock")), false);
});

test("a refresh that started before a switch and finishes after it is superseded", async () => {
  const dir = tmpDir();
  const a = acct("claude", "a@example.com", true);
  const b = acct("claude", "b@example.com", false);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  let calls = 0;
  const { deps } = harness(dir, {
    claudeFetch: async () => {
      calls += 1;
      if (calls === 1) return fetched("claude", [a, b]);
      if (calls === 2) {
        await gate; // the old refresh, still seeing A as active
        return fetched("claude", [a, b]);
      }
      return fetched("claude", [
        { ...a, active: false },
        { ...b, active: true },
      ]);
    },
    claudeSwitch: async () => ({ state: "succeeded", message: "Switched.", activeKey: b.key }),
  });
  await refreshStale(deps, { maxAgeMs: 60_000 });

  const slow = refreshStale(deps, { maxAgeMs: 60_000, force: true });
  const lockFile = path.join(dir, "provider-claude.lock");
  for (let i = 0; i < 50 && !fs.existsSync(lockFile); i++) await new Promise((r) => setTimeout(r, 10));
  assert.ok(fs.existsSync(lockFile));
  // Simulate the old refresh's heartbeat going silent past the lease (a stalled worker) so the switch reclaims it.
  const body = JSON.parse(fs.readFileSync(lockFile, "utf8"));
  body.createdAt -= 200_000;
  body.heartbeatAt -= 200_000;
  fs.writeFileSync(lockFile, JSON.stringify(body));

  const result = await performSwitch(deps, request(b));
  assert.equal(result.state, "succeeded");
  release();
  const outcomes = await slow;
  assert.deepEqual(outcomes.claude, { kind: "superseded" });

  const snap = readSnapshot(dir);
  assert.deepEqual(activeByKey(snap, "claude"), { [a.key]: false, [b.key]: true });
});

test("busy provider lock fails the switch without calling the switcher and records the refusal", async () => {
  const dir = tmpDir();
  const target = acct("codex", "b@example.com", false);
  const { deps, switchCalls } = harness(dir, {
    codexSwitch: async () => ({ state: "succeeded", message: "x" }),
    switchLockWaitMs: 200,
  });
  const held = await acquireLock(dir, "provider-codex", { purpose: "refresh" });
  assert.ok(held);
  const message = "Another refresh or switch is still running for Codex; try again shortly.";
  try {
    const result = await performSwitch(deps, request(target));
    assert.deepEqual(result, { state: "failed", message });
    assert.equal(switchCalls.length, 0);
    // The list watching this request id sees a finished record instead of waiting for one that never comes.
    const ops = readOperations(dir);
    assert.equal(ops.length, 1);
    assert.equal(ops[0].requestId, "req-1");
    assert.equal(ops[0].state, "failed");
    assert.equal(ops[0].message, message);
    assert.ok(ops[0].finishedAt);
    // the same request id is never run later
    held.release();
    const again = await performSwitch(deps, request(target));
    assert.equal(again.state, "failed");
    assert.match(again.message, /already handled \(failed\)/);
    assert.equal(switchCalls.length, 0);
  } finally {
    held.release();
  }
});

test("unknown outcome marks the active account unknown and never retries", async () => {
  const dir = tmpDir();
  const a = acct("claude", "a@example.com", true);
  const b = acct("claude", "b@example.com", false);
  let calls = 0;
  let seenAtRefresh: Snapshot | null = null;
  const { deps, switchCalls } = harness(dir, {
    claudeFetch: async () => {
      calls += 1;
      if (calls === 1) return fetched("claude", [a, b]);
      seenAtRefresh = readSnapshot(dir);
      throw new Error("network down");
    },
    claudeSwitch: async () => ({ state: "unknown", message: "cswap stopped responding." }),
  });
  await refreshStale(deps, { maxAgeMs: 60_000 });
  const result = await performSwitch(deps, request(b));
  assert.equal(result.state, "unknown");
  assert.equal(result.message, "cswap stopped responding. Usage refresh failed; showing previous readings.");
  assert.equal(switchCalls.length, 1);
  const mid = seenAtRefresh as Snapshot | null;
  assert.ok(mid);
  assert.deepEqual(activeByKey(mid, "claude"), { [a.key]: "unknown", [b.key]: "unknown" });
  const snap = readSnapshot(dir);
  assert.deepEqual(activeByKey(snap, "claude"), { [a.key]: "unknown", [b.key]: "unknown" });
  assert.equal(snap.providers.claude.identityGeneration, 1);
  assert.equal(readOperations(dir)[0].state, "unknown");
});

test("unknown outcome is upgraded only when a fresh refresh shows the target active", async () => {
  const dir = tmpDir();
  const a = acct("claude", "a@example.com", true);
  const b = acct("claude", "b@example.com", false);
  let calls = 0;
  let switched = true;
  const { deps } = harness(dir, {
    claudeFetch: async () => {
      calls += 1;
      if (calls === 1 || !switched) return fetched("claude", [a, b]);
      return fetched("claude", [
        { ...a, active: false },
        { ...b, active: true },
      ]);
    },
    claudeSwitch: async () => ({ state: "unknown", message: "claude-swap printed no result" }),
  });
  await refreshStale(deps, { maxAgeMs: 60_000 });
  const confirmed = await performSwitch(deps, request(b, "u1"));
  assert.deepEqual(confirmed, {
    state: "succeeded",
    message: "Claude now uses b@example.com (confirmed by a refresh).",
  });
  assert.equal(readOperations(dir).find((r) => r.requestId === "u1")?.state, "succeeded");

  // the refresh shows the old account still active: stays unknown, never "failed"
  switched = false;
  const unclear = await performSwitch(deps, request(b, "u2"));
  assert.deepEqual(unclear, { state: "unknown", message: "claude-swap printed no result" });
  assert.equal(readOperations(dir).find((r) => r.requestId === "u2")?.state, "unknown");
});

test("post-switch refresh failure message adds sentence punctuation when missing", async () => {
  const dir = tmpDir();
  const b = acct("claude", "b@example.com", false);
  const { deps } = harness(dir, {
    claudeFetch: async () => {
      throw new Error("offline");
    },
    claudeSwitch: async () => ({ state: "noop", message: "Claude is already using b@example.com", activeKey: b.key }),
  });
  const result = await performSwitch(deps, request(b));
  assert.deepEqual(result, {
    state: "noop",
    message: "Claude is already using b@example.com. Usage refresh failed; showing previous readings.",
  });
});

test("switcher that throws is recorded as unknown, not failed", async () => {
  const dir = tmpDir();
  const b = acct("claude", "b@example.com", false);
  const { deps } = harness(dir, {
    claudeFetch: async () => fetched("claude", [b]),
    claudeSwitch: async () => {
      throw new Error("worker exploded");
    },
  });
  const result = await performSwitch(deps, request(b));
  assert.equal(result.state, "unknown");
  assert.match(result.message, /worker exploded/);
  assert.equal(readOperations(dir)[0].state, "unknown");
});

test("a running operation left by a dead worker is reconciled to unknown", async () => {
  const dir = tmpDir();
  const a = acct("claude", "a@example.com", true);
  const b = acct("claude", "b@example.com", false);
  const { deps } = harness(dir, {
    claudeFetch: async () => fetched("claude", [a, b]),
    claudeSwitch: async () => ({ state: "succeeded", message: "ok", activeKey: b.key }),
  });
  await refreshStale(deps, { maxAgeMs: 60_000 });
  await upsertOperation(dir, {
    requestId: "orphan",
    provider: "claude",
    targetKey: a.key,
    targetLabel: a.label,
    state: "running",
    startedAt: new Date(Date.now() + 1_000).toISOString(),
    finishedAt: null,
    message: null,
  });
  // a running codex operation is not ours to reconcile
  await upsertOperation(dir, {
    requestId: "codex-running",
    provider: "codex",
    targetKey: "codex:x@example.com|",
    targetLabel: "x",
    state: "running",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    message: null,
  });
  const result = await performSwitch(deps, request(b, "req-2"));
  assert.equal(result.state, "succeeded");
  const ops = readOperations(dir);
  const orphan = ops.find((r) => r.requestId === "orphan");
  assert.equal(orphan?.state, "unknown");
  assert.ok(orphan?.finishedAt);
  assert.equal(ops.find((r) => r.requestId === "codex-running")?.state, "running");
  assert.equal(ops.find((r) => r.requestId === "req-2")?.state, "succeeded");
  // orphan invalidated identity (no observation since it started), then the switch committed
  assert.equal(readSnapshot(dir).providers.claude.identityGeneration, 2);
});

test("post-switch refresh failure keeps the switch successful and says so", async () => {
  const dir = tmpDir();
  const a = acct("claude", "a@example.com", true);
  const b = acct("claude", "b@example.com", false);
  let calls = 0;
  const { deps } = harness(dir, {
    claudeFetch: async () => {
      calls += 1;
      if (calls === 1) return fetched("claude", [a, b]);
      throw new Error("usage endpoint 429");
    },
    claudeSwitch: async () => ({ state: "succeeded", message: "Claude switched to b@example.com.", activeKey: b.key }),
  });
  await refreshStale(deps, { maxAgeMs: 60_000 });
  const result = await performSwitch(deps, request(b));
  assert.deepEqual(result, {
    state: "succeeded",
    message: "Claude switched to b@example.com. Usage refresh failed; showing previous readings.",
  });
  const snap = readSnapshot(dir);
  assert.deepEqual(activeByKey(snap, "claude"), { [a.key]: false, [b.key]: true });
  assert.equal(snap.providers.claude.lastError, "usage endpoint 429");
  assert.equal(readOperations(dir)[0].state, "succeeded");
});

test("noop commits the target as active; handoff changes nothing and skips the refresh", async () => {
  const dir = tmpDir();
  const a = acct("codex", "a@example.com", true);
  const b = acct("codex", "b@example.com", false);
  let calls = 0;
  let mode: "noop" | "handoff" = "handoff";
  const { deps } = harness(dir, {
    codexFetch: async () => {
      calls += 1;
      return fetched("codex", [a, b]);
    },
    codexSwitch: async () =>
      mode === "handoff" ? { state: "handoff", message: "Pick b in CodexBar" } : { state: "noop", message: "" },
  });
  await refreshStale(deps, { maxAgeMs: 60_000 });
  const handoff = await performSwitch(deps, request(b, "h1"));
  assert.deepEqual(handoff, { state: "handoff", message: "Pick b in CodexBar" });
  assert.equal(calls, 1);
  assert.equal(readSnapshot(dir).providers.codex.identityGeneration, 0);
  assert.equal(readOperations(dir)[0].state, "succeeded");
  assert.equal(readOperations(dir)[0].message, "Pick b in CodexBar");
  assert.equal(readOperations(dir)[0].outcome, "handoff");

  mode = "noop";
  const noop = await performSwitch(deps, request(a, "n1"));
  assert.equal(noop.state, "noop");
  assert.equal(noop.message, "a@example.com is already the active Codex account.");
  assert.equal(calls, 2);
  assert.equal(readSnapshot(dir).providers.codex.identityGeneration, 1);
  assert.equal(readOperations(dir)[0].outcome, "noop");
});

test("invalid or repeated requests never reach the switcher", async () => {
  const dir = tmpDir();
  const b = acct("claude", "b@example.com", false);
  const { deps, switchCalls } = harness(dir, {
    claudeFetch: async () => fetched("claude", [b]),
    claudeSwitch: async () => ({ state: "failed", message: "slot changed" }),
  });
  const bad = [
    { ...request(b), provider: "gemini" },
    { ...request(b), requestId: "" },
    { ...request(b), targetKey: "codex:b@example.com|" },
    { ...request(b), via: "cli" },
    { ...request(b), expectedEmail: 3 },
    { ...request(b), targetLabel: "x".repeat(513) },
    null,
  ];
  for (const r of bad) {
    assert.equal(isSwitchRequest(r), false);
    const result = await performSwitch(deps, r as unknown as SwitchRequest);
    assert.equal(result.state, "failed");
  }
  assert.equal(switchCalls.length, 0);

  assert.equal(isSwitchRequest({ ...request(b), targetLabel: "x".repeat(512) }), true);

  const first = await performSwitch(deps, request(b, "dup"));
  assert.deepEqual(first, { state: "failed", message: "slot changed" });
  const second = await performSwitch(deps, request(b, "dup"));
  assert.equal(second.state, "failed");
  assert.match(second.message, /already handled/);
  assert.equal(switchCalls.length, 1);
});

test("refreshStale decides per provider: a fresh Codex commit does not block a Claude retry", async () => {
  const dir = tmpDir();
  let offset = 0;
  let claudeFails = true;
  let claudeCalls = 0;
  let codexCalls = 0;
  const { deps } = harness(dir, {
    nowMs: () => Date.now() + offset,
    claudeFetch: async () => {
      claudeCalls += 1;
      if (claudeFails) throw new Error("cswap not found");
      return fetched("claude", [acct("claude", "a@example.com", true)]);
    },
    codexFetch: async () => {
      codexCalls += 1;
      return fetched("codex", [acct("codex", "c@example.com", true)]);
    },
  });
  const first = await refreshStale(deps, { maxAgeMs: 120_000 });
  assert.equal(first.claude !== "fresh" && first.claude.kind, "failed");
  assert.equal(first.codex !== "fresh" && first.codex.kind, "committed");

  // within the failure backoff and the freshness window: nothing runs
  const second = await refreshStale(deps, { maxAgeMs: 120_000 });
  assert.deepEqual(second, { claude: "fresh", codex: "fresh" });
  assert.equal(claudeCalls, 1);

  // 61 s later: Claude's retry is due, Codex is still fresh
  offset = 61_000;
  claudeFails = false;
  const third = await refreshStale(deps, { maxAgeMs: 120_000 });
  assert.equal(third.claude !== "fresh" && third.claude.kind, "committed");
  assert.equal(third.codex, "fresh");
  assert.equal(claudeCalls, 2);
  assert.equal(codexCalls, 1);

  // force ignores both freshness and backoff
  const forced = await refreshStale(deps, { maxAgeMs: 120_000, force: true });
  assert.equal(forced.codex !== "fresh" && forced.codex.kind, "committed");
  assert.equal(codexCalls, 2);
});

test("refreshStale reports a busy provider without blocking", async () => {
  const dir = tmpDir();
  const { deps } = harness(dir, {});
  const held = await acquireLock(dir, "provider-claude", { purpose: "switch" });
  assert.ok(held);
  try {
    const seen: string[] = [];
    const out = await refreshStale(deps, { maxAgeMs: 0, onSettled: (p) => seen.push(p) });
    assert.deepEqual(out.claude, { kind: "busy" });
    assert.equal(out.codex !== "fresh" && out.codex.kind, "committed");
    assert.deepEqual([...seen].sort(), ["claude", "codex"]);
  } finally {
    held.release();
  }
});

test("providerDue measures the failure backoff from when the failure was recorded", () => {
  const t0 = Date.parse("2026-09-29T12:00:00Z");
  const state = {
    ...emptyProviderState("codex"),
    lastError: "codexbar timed out",
    // the attempt started at t0 and hung for its 45 s timeout plus the kill grace
    lastAttemptAt: new Date(t0).toISOString(),
    lastFailedAt: new Date(t0 + 47_000).toISOString(),
  };
  // 62 s after the start is only 15 s after the failure: still backing off
  assert.equal(providerDue(state, t0 + 62_000, 0), false);
  assert.equal(providerDue(state, t0 + 47_000 + 59_999, 0), false);
  assert.equal(providerDue(state, t0 + 47_000 + 60_000, 0), true);
  // snapshots written before lastFailedAt existed fall back to the attempt time
  const legacy = { ...state, lastFailedAt: undefined };
  assert.equal(providerDue(legacy, t0 + 62_000, 0), true);
});

test("a failed refresh records lastFailedAt after the fetch settles; a success clears it", async () => {
  const dir = tmpDir();
  let fail = true;
  const { deps } = harness(dir, {
    codexFetch: async () => {
      await new Promise((r) => setTimeout(r, 60));
      if (fail) throw new Error("codexbar timed out");
      return fetched("codex", [acct("codex", "c@example.com", true)]);
    },
  });
  const first = await refreshStale(deps, { maxAgeMs: 0 });
  assert.equal(first.codex !== "fresh" && first.codex.kind, "failed");
  const failedState = readSnapshot(dir).providers.codex as StoredProviderState;
  const attempted = Date.parse(failedState.lastAttemptAt ?? "");
  const failedAt = Date.parse(failedState.lastFailedAt ?? "");
  assert.ok(failedAt - attempted >= 50, `lastFailedAt ${failedAt} should follow lastAttemptAt ${attempted}`);
  assert.equal(providerDue(failedState, failedAt + FAILED_RETRY_MS - 1, 0), false);
  assert.equal(providerDue(failedState, failedAt + FAILED_RETRY_MS, 0), true);

  fail = false;
  const second = await refreshStale(deps, { maxAgeMs: 0, force: true });
  assert.equal(second.codex !== "fresh" && second.codex.kind, "committed");
  const okState = readSnapshot(dir).providers.codex as StoredProviderState;
  assert.equal(okState.lastFailedAt, null);
  assert.equal(okState.lastError, null);
});

test("providerDue handles missing timestamps and never-committed providers", () => {
  const now = Date.parse("2026-09-29T12:00:00Z");
  const state = emptyProviderState("claude");
  assert.equal(providerDue(state, now, 60_000), true);
  state.committedAt = "2026-09-29T11:59:30Z";
  assert.equal(providerDue(state, now, 60_000), false);
  assert.equal(providerDue(state, now, 0), true);
  state.lastError = "boom";
  state.lastAttemptAt = "2026-09-29T11:59:59Z";
  assert.equal(providerDue(state, now, 0), false);
  state.lastAttemptAt = "2026-09-29T11:58:59Z";
  assert.equal(providerDue(state, now, 0), true);
});

test("displayLabels makes duplicate labels visibly distinct", () => {
  const a = acct("codex", "same@example.com", true, { label: "Personal", workspace: "Team A" });
  const b = acct("codex", "same2@example.com", false, { label: "Personal", workspace: "Team B" });
  const c = acct("codex", "x@example.com", false, { label: "Solo" });
  const d = acct("codex", "d@example.com", false, { label: "Twin", workspace: null, email: null, plan: null });
  const e = acct("codex", "e@example.com", false, { label: "Twin", workspace: null, email: null, plan: null });
  // same label and workspace: the email is the first attribute that separates them
  const f = acct("codex", "f@example.com", false, { label: "Work", workspace: "Acme" });
  const g = acct("codex", "g@example.com", false, { label: "Work", workspace: "Acme" });
  const labels = displayLabels([a, b, c, d, e, f, g]);
  assert.equal(labels.get(a.key), "Personal (Team A)");
  assert.equal(labels.get(b.key), "Personal (Team B)");
  assert.equal(labels.get(c.key), "Solo");
  assert.equal(labels.get(d.key), "Twin #1");
  assert.equal(labels.get(e.key), "Twin #2");
  assert.equal(labels.get(f.key), "Work (f@example.com)");
  assert.equal(labels.get(g.key), "Work (g@example.com)");
  assert.equal(new Set(labels.values()).size, 7);
});

test("remainingLevel handles exact 0, 100, thresholds and unknown", () => {
  assert.equal(remainingLevel(0, 20), "critical");
  assert.equal(remainingLevel(100, 20), "good");
  assert.equal(remainingLevel(50, 20), "good");
  assert.equal(remainingLevel(49.9, 20), "low");
  assert.equal(remainingLevel(20, 20), "low");
  assert.equal(remainingLevel(19.9, 20), "critical");
  assert.equal(remainingLevel(null, 20), "unknown");
  assert.equal(remainingLevel(Number.NaN, 20), "unknown");
});

// ---------------------------------------------------------------------------
// Locks held by dead workers, live switches, and warnings

function deadPid(): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["-e", ""], { stdio: "ignore" });
    child.once("error", reject);
    child.once("exit", () => resolve(child.pid!));
  });
}

function writeLock(dir: string, name: string, body: Record<string, unknown>): void {
  fs.writeFileSync(path.join(dir, `${name}.lock`), JSON.stringify(body));
}

test("a refresh lock left by a terminated worker is reclaimed by a switch instead of failing it", async () => {
  const dir = tmpDir();
  const a = acct("claude", "a@example.com", true);
  const b = acct("claude", "b@example.com", false);
  const { deps, switchCalls } = harness(dir, {
    claudeFetch: async () => fetched("claude", [a, b]),
    claudeSwitch: async () => ({ state: "succeeded", message: "Claude switched to b@example.com.", activeKey: b.key }),
    switchLockWaitMs: 300,
  });
  await refreshStale(deps, { maxAgeMs: 60_000 });
  // The menu bar worker was unloaded 11 s into a refresh: no release, no child pid, heartbeat silent.
  // (The old age-only rule kept such a lock for 120 s, longer than a switch waits.)
  const orphanAt = Date.now() - 11_000;
  writeLock(dir, "provider-claude", {
    token: "dead-worker",
    purpose: "refresh",
    createdAt: orphanAt,
    heartbeatAt: orphanAt,
  });
  const result = await performSwitch(deps, request(b));
  assert.equal(result.state, "succeeded");
  assert.equal(switchCalls.length, 1);
  assert.equal(readOperations(dir)[0].state, "succeeded");

  // a list or menu refresh (waitMs 0) is not reported busy behind such a lock either
  writeLock(dir, "provider-claude", {
    token: "dead-worker-2",
    purpose: "refresh",
    createdAt: orphanAt,
    heartbeatAt: orphanAt,
  });
  const refreshed = await refreshStale(deps, { maxAgeMs: 0, force: true });
  assert.equal(refreshed.claude !== "fresh" && refreshed.claude.kind, "committed");
});

test("a live switch keeps its lock after its child exits: no takeover, no orphan reconcile", async () => {
  const dir = tmpDir();
  const a = acct("claude", "a@example.com", true);
  const b = acct("claude", "b@example.com", false);
  const c = acct("claude", "c@example.com", false);
  const exited = await deadPid();
  let running = 0;
  let overlapped = false;
  const events: string[] = [];
  let concurrentRefresh: unknown = null;
  let second: Promise<unknown> | null = null;
  let liveKey = a.key;
  const { deps } = harness(dir, {
    claudeFetch: async () =>
      fetched(
        "claude",
        [a, b, c].map((x) => ({ ...x, active: x.key === liveKey })),
      ),
    claudeSwitch: async (req, hooks) => {
      running += 1;
      if (running > 1) overlapped = true;
      events.push(`start ${req.requestId}`);
      try {
        if (req.requestId === "req-1") {
          // The cswap --switch-to child ran and exited; verification (cswap --status) is still going.
          hooks.onSpawn?.(exited);
          const lockFile = path.join(dir, "provider-claude.lock");
          const body = JSON.parse(fs.readFileSync(lockFile, "utf8"));
          assert.equal(body.childPid, exited);
          body.createdAt -= 60_000; // the switch began long ago; its heartbeat is current
          fs.writeFileSync(lockFile, JSON.stringify(body));
          concurrentRefresh = await refreshProvider(dir, "claude", deps.fetchers.claude, { waitMs: 0 });
          second = performSwitch(deps, request(c, "req-2"));
          await new Promise((r) => setTimeout(r, 500)); // several of the second switch's lock polls
          assert.equal(readOperations(dir).find((r) => r.requestId === "req-1")?.state, "running");
          liveKey = b.key;
          return { state: "succeeded", message: "Claude switched to b@example.com.", activeKey: b.key };
        }
        liveKey = c.key;
        return { state: "succeeded", message: "Claude switched to c@example.com.", activeKey: c.key };
      } finally {
        events.push(`end ${req.requestId}`);
        running -= 1;
      }
    },
    switchLockWaitMs: 10_000,
  });
  await refreshStale(deps, { maxAgeMs: 60_000 });
  const first = await performSwitch(deps, request(b, "req-1"));
  assert.equal(first.state, "succeeded");
  assert.deepEqual(concurrentRefresh, { kind: "busy" });
  assert.ok(second);
  const secondResult = (await second) as { state: string };
  assert.equal(secondResult.state, "succeeded");
  assert.equal(overlapped, false);
  assert.deepEqual(events, ["start req-1", "end req-1", "start req-2", "end req-2"]);
  const ops = readOperations(dir);
  assert.equal(ops.find((r) => r.requestId === "req-1")?.state, "succeeded");
  assert.equal(ops.find((r) => r.requestId === "req-2")?.state, "succeeded");
  // two commits, no orphan invalidation in between
  const snap = readSnapshot(dir);
  assert.equal(snap.providers.claude.identityGeneration, 2);
  assert.deepEqual(activeByKey(snap, "claude"), { [a.key]: false, [b.key]: false, [c.key]: true });
});

test("reconcile leaves a running record alone while its switch holds the lock, and settles it in one section", async () => {
  const dir = tmpDir();
  const a = acct("claude", "a@example.com", true);
  const b = acct("claude", "b@example.com", false);
  const { deps } = harness(dir, {
    claudeFetch: async () => fetched("claude", [a, b]),
    claudeSwitch: async () => ({ state: "succeeded", message: "ok", activeKey: b.key }),
  });
  await refreshStale(deps, { maxAgeMs: 60_000 });
  const live = await acquireLock(dir, "provider-claude", { purpose: "switch" });
  assert.ok(live);
  const running = (requestId: string, extra: Partial<StoredOperationRecord>): StoredOperationRecord => ({
    requestId,
    provider: "claude",
    targetKey: b.key,
    targetLabel: b.label,
    state: "running",
    startedAt: new Date(Date.now() + 1_000).toISOString(),
    finishedAt: null,
    message: null,
    ...extra,
  });
  try {
    await upsertOperation(dir, running("alive", { lockToken: live.token, generation: 0 }));
    const kept = await reconcileRunningOperations(dir, "claude", new Date().toISOString(), "gone");
    assert.deepEqual(kept, { reconciled: 0, invalidated: false });
    assert.equal(readOperations(dir).find((r) => r.requestId === "alive")?.state, "running");
  } finally {
    live.release();
  }
  // Its switch finished (succeeded) before a reconcile ran: a finished record is never rewritten.
  await upsertOperation(dir, {
    ...running("alive", { lockToken: "gone-token", generation: 0 }),
    state: "succeeded",
    finishedAt: new Date().toISOString(),
    message: "done",
  });
  // Orphan whose own commit landed (generation moved on): settled as unknown without invalidating the marker.
  await upsertOperation(dir, running("committed-orphan", { lockToken: "gone-token-2", generation: 0 }));
  const snapBefore = readSnapshot(dir);
  snapBefore.providers.claude.identityGeneration = 1;
  fs.writeFileSync(path.join(dir, "snapshot.json"), JSON.stringify(snapBefore));
  const settled = await reconcileRunningOperations(dir, "claude", new Date().toISOString(), "gone");
  assert.deepEqual(settled, { reconciled: 1, invalidated: false });
  const ops = readOperations(dir);
  assert.equal(ops.find((r) => r.requestId === "alive")?.state, "succeeded");
  assert.equal(ops.find((r) => r.requestId === "alive")?.message, "done");
  assert.equal(ops.find((r) => r.requestId === "committed-orphan")?.state, "unknown");
  assert.equal(readSnapshot(dir).providers.claude.identityGeneration, 1);
  assert.deepEqual(activeByKey(readSnapshot(dir), "claude"), { [a.key]: true, [b.key]: false });
});

test("an outcome with a warning is never upgraded by the refresh, and the warning is kept everywhere", async () => {
  const dir = tmpDir();
  const a = acct("codex", "alice@example.com", true);
  const b = acct("codex", "bob@example.com", false);
  const warning =
    "CodexBar's saved copy of alice@example.com changed after it was saved; check CodexBar's System Account menu.";
  let calls = 0;
  const { deps } = harness(dir, {
    codexFetch: async () => {
      calls += 1;
      if (calls === 1) return fetched("codex", [a, b]);
      // the live login does hold bob, so the refresh shows bob active
      return fetched("codex", [
        { ...a, active: false },
        { ...b, active: true },
      ]);
    },
    codexSwitch: async () => ({
      state: "unknown",
      message: "Codex's auth.json holds bob@example.com as expected",
      warning,
    }),
  });
  await refreshStale(deps, { maxAgeMs: 60_000 });
  const result = await performSwitch(deps, request(b, "w1"));
  assert.deepEqual(result, {
    state: "unknown",
    message: `Codex's auth.json holds bob@example.com as expected. ${warning}`,
    warning,
  });
  const op = readOperations(dir).find((r) => r.requestId === "w1");
  assert.equal(op?.state, "unknown");
  assert.equal(op?.message, `Codex's auth.json holds bob@example.com as expected. ${warning}`);
});

test("a succeeded outcome with a warning keeps it in the result and the record, without repeating it", async () => {
  const dir = tmpDir();
  const b = acct("codex", "bob@example.com", false);
  const warning = "The Codex daemon was not restarted; start it with codex app-server daemon start.";
  let message = "Codex switched to bob@example.com.";
  const { deps } = harness(dir, {
    codexFetch: async () => fetched("codex", [{ ...b, active: true }]),
    codexSwitch: async () => ({ state: "succeeded", message, warning, activeKey: b.key }),
  });
  const first = await performSwitch(deps, request(b, "s1"));
  assert.deepEqual(first, { state: "succeeded", message: `Codex switched to bob@example.com. ${warning}`, warning });
  assert.equal(readOperations(dir).find((r) => r.requestId === "s1")?.message, first.message);

  message = `Codex switched to bob@example.com. ${warning}`; // the switcher already put it in the message
  const second = await performSwitch(deps, request(b, "s2"));
  assert.equal(second.message, message);
  assert.equal(second.warning, warning);
});

test("a long switch message keeps its recovery instructions (no cut at the default 240 characters)", async () => {
  const dir = tmpDir();
  const b = acct("codex", "bob@example.com", false);
  const message =
    "Codex's auth.json holds bob@example.com as expected, and CodexBar's saved copy of alice@example.com changed " +
    "after it was saved. Nothing was rolled back; the daemon was restarted with the new login. Check CodexBar's " +
    "System Account menu before switching again.";
  assert.ok(message.length > 240);
  const { deps } = harness(dir, {
    codexFetch: async () => fetched("codex", [{ ...b, active: true }]),
    codexSwitch: async () => ({
      state: "unknown",
      message,
      warning: "Check CodexBar's System Account menu before switching again.",
    }),
  });
  const result = await performSwitch(deps, request(b, "long"));
  assert.equal(result.state, "unknown");
  assert.equal(result.message, message);
  assert.equal(readOperations(dir).find((r) => r.requestId === "long")?.message, message);
});

// Integration: the switch worker finalizes the record the list follows.

test("ensureFinalRecord writes a missing record, finalizes a running one, and leaves a final one alone", async () => {
  const dir = tmpDir();
  const b = acct("claude", "b@example.com", false);

  // The switch could not write its record (e.g. the state lock stayed busy).
  await ensureFinalRecord(dir, request(b, "missing"), { state: "failed", message: "Could not record the switch." });
  const written = readOperations(dir).find((r) => r.requestId === "missing");
  assert.equal(written?.state, "failed");
  assert.equal(written?.outcome, "failed");
  assert.ok(written?.finishedAt);

  // The switch threw after recording "running"; the worker reports unknown with the warning kept.
  await upsertOperation(dir, {
    requestId: "running",
    provider: "claude",
    targetKey: b.key,
    targetLabel: b.label,
    state: "running",
    startedAt: "2026-09-29T20:00:00.000Z",
    finishedAt: null,
    message: null,
  });
  await ensureFinalRecord(dir, request(b, "running"), {
    state: "unknown",
    message: "Switch outcome unknown: boom",
    warning: "Check the saved login.",
  });
  const finalized = readOperations(dir).find((r) => r.requestId === "running");
  assert.equal(finalized?.state, "unknown");
  assert.equal(finalized?.startedAt, "2026-09-29T20:00:00.000Z");
  assert.equal(finalized?.message, "Switch outcome unknown: boom. Check the saved login.");

  // A repeated request id keeps the outcome of its first run.
  await ensureFinalRecord(dir, request(b, "running"), { state: "failed", message: "already handled" });
  assert.equal(readOperations(dir).find((r) => r.requestId === "running")?.state, "unknown");
});

test("refreshStale with providers only refreshes those providers", async () => {
  const { refreshStale } = await import("../lib/flow");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-accounts-flow-providers-"));
  try {
    const called: string[] = [];
    const fetcher = (provider: "claude" | "codex") => async () => {
      called.push(provider);
      return { provider, source: "test", accounts: [], notices: [] };
    };
    const deps = {
      dir,
      fetchers: { claude: fetcher("claude"), codex: fetcher("codex") },
      switchers: {
        claude: async () => ({ state: "failed" as const, message: "unused" }),
        codex: async () => ({ state: "failed" as const, message: "unused" }),
      },
    };
    const result = await refreshStale(deps, { maxAgeMs: 0, force: true, providers: ["claude"] });
    assert.deepEqual(called, ["claude"]);
    assert.equal(result.codex, "fresh");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
