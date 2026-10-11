import { after, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  claudeKey,
  fetchClaude,
  withClaudeAppAccount,
  normalizeCodexbarClaudeAmbient,
  normalizeCswapList,
  switchClaude,
} from "../lib/claude";
import { Account, SwitchRequest, UsageWindow } from "../lib/model";
import { ClaudeLoginPaths, readClaudeAppAccountUuid, readCswapAccountUuids } from "../lib/claudeLogins";

const FIXTURES = path.join(__dirname, "fixtures");

function fixture(name: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES, name), "utf8"));
}

function win(account: Account, id: string): UsageWindow {
  const w = account.windows.find((x) => x.id === id);
  assert.ok(w, `window ${id} missing on ${account.label}`);
  return w;
}

function byEmail(accounts: Account[], email: string): Account {
  const a = accounts.find((x) => x.email?.toLowerCase() === email);
  assert.ok(a, `account ${email} missing`);
  return a;
}

// ---------------------------------------------------------------------------
// Fake CLIs: one node script that answers from <dir>/<kind>.spec.json and logs argv to calls.log.

const FAKE_SOURCE = `#!${process.execPath}
"use strict";
const fs = require("fs");
const path = require("path");
const dir = __dirname;
const args = process.argv.slice(2);
fs.appendFileSync(path.join(dir, "calls.log"), JSON.stringify(args) + "\\n");
const kind =
  args[0] === "--list" ? "list" :
  args[0] === "--status" ? "status" :
  args[0] === "--switch-to" ? "switch" :
  args.includes("oauth") ? "oauth" :
  args.includes("cli") ? "cli" :
  args.includes("auto") ? "auto" : "other";
const file = path.join(dir, kind + ".spec.json");
if (!fs.existsSync(file)) {
  process.stderr.write("fake: no spec for " + kind + "\\n");
  process.exitCode = 2;
} else {
  const spec = JSON.parse(fs.readFileSync(file, "utf8"));
  const respond = () => {
    if (spec.then) {
      for (const [k, v] of Object.entries(spec.then)) fs.writeFileSync(path.join(dir, k + ".spec.json"), JSON.stringify(v));
    }
    if (spec.signal) {
      process.kill(process.pid, spec.signal);
    } else {
      process.stdout.write(spec.stdout ?? "");
      process.exitCode = spec.exit ?? 0;
      // Written only when the run completes: a SIGTERM/SIGKILL during sleepMs leaves no marker.
      fs.appendFileSync(path.join(dir, "done.log"), JSON.stringify(args) + "\\n");
    }
  };
  if (spec.sleepMs) setTimeout(respond, spec.sleepMs);
  else respond();
}
`;

interface Spec {
  stdout?: string;
  exit?: number;
  signal?: string;
  /** Answer only after this delay (a slow cswap that holds its locks). */
  sleepMs?: number;
  then?: Record<string, Spec>;
}

const tempDirs: string[] = [];

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-accounts-claude-"));
  tempDirs.push(dir);
  return dir;
}

after(() => {
  for (const dir of tempDirs) fs.rmSync(dir, { recursive: true, force: true });
});

function installFake(dir: string, name: string): string {
  const file = path.join(dir, name);
  fs.writeFileSync(file, FAKE_SOURCE, { mode: 0o755 });
  return file;
}

function setSpec(dir: string, kind: string, spec: Spec): void {
  fs.writeFileSync(path.join(dir, `${kind}.spec.json`), JSON.stringify(spec));
}

function calls(dir: string, log = "calls.log"): string[][] {
  const file = path.join(dir, log);
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as string[]);
}

/** Invocations of the fake that ran to completion (never signalled). */
const completed = (dir: string): string[][] => calls(dir, "done.log");

async function waitFor(check: () => boolean, timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) assert.fail("condition not met in time");
    await new Promise((r) => setTimeout(r, 25));
  }
}

const json = (v: unknown): string => JSON.stringify(v, null, 2) + "\n";

// Synthesized two-slot claude-swap state (fake identities).
const ORG_A = "00000000-0000-4000-8000-0000000000aa";
const ORG_B = "00000000-0000-4000-8000-0000000000bb";

function listPayload(activeSlot: number): unknown {
  const row = (n: number, email: string, org: string, alias?: string) => ({
    number: n,
    email,
    organizationName: `${email}'s Organization`,
    organizationUuid: org,
    isOrganization: true,
    active: n === activeSlot,
    usageStatus: "ok",
    usage: { fiveHour: { pct: 10.0, resetsAt: "2026-09-30T01:00:00+00:00" }, sevenDay: { pct: 20.0 } },
    usageFetchedAt: "2026-09-29T21:00:00Z",
    usageAgeSeconds: 3.0,
    ...(alias ? { alias } : {}),
  });
  return {
    schemaVersion: 1,
    activeAccountNumber: activeSlot,
    accounts: [row(1, "alice@example.com", ORG_A), row(2, "bob@example.com", ORG_B, "Bob Max")],
  };
}

function statusPayload(email: string, n: number, org: string): unknown {
  return {
    schemaVersion: 1,
    active: {
      number: n,
      email,
      organizationName: `${email}'s Organization`,
      organizationUuid: org,
      isOrganization: true,
      managed: true,
      usageStatus: "ok",
      usage: null,
    },
    totalManagedAccounts: 2,
  };
}

function switchPayload(toSlot: number, toEmail: string): unknown {
  return {
    schemaVersion: 1,
    switched: true,
    from: { number: 1, email: "alice@example.com" },
    to: { number: toSlot, email: toEmail },
    strategy: "direct",
    reason: "switched",
    message: `Switched to Account-${toSlot} (${toEmail})`,
    warnings: [],
  };
}

function request(overrides: Partial<SwitchRequest> = {}): SwitchRequest {
  return {
    requestId: "req-1",
    provider: "claude",
    targetKey: claudeKey("bob@example.com", ORG_B),
    expectedEmail: "bob@example.com",
    targetLabel: "Bob Max",
    via: "list",
    ...overrides,
  };
}

function switchEnv(): { dir: string; cfg: { cswapPath: string; codexbarPath: string } } {
  const dir = tempDir();
  const cswapPath = installFake(dir, "cswap");
  setSpec(dir, "list", { stdout: json(listPayload(1)) });
  setSpec(dir, "status", { stdout: json(statusPayload("alice@example.com", 1, ORG_A)) });
  return { dir, cfg: { cswapPath, codexbarPath: path.join(dir, "no-codexbar") } };
}

// ---------------------------------------------------------------------------
// claudeKey

test("claudeKey lowercases the email and falls back to ambient", () => {
  assert.equal(claudeKey("Alice@Example.com", "ORG-1"), "claude:alice@example.com|org-1");
  assert.equal(claudeKey("alice@example.com", null), "claude:alice@example.com|");
  assert.equal(claudeKey(null, null), "claude:ambient|");
  assert.equal(claudeKey("  ", ""), "claude:ambient|");
});

// ---------------------------------------------------------------------------
// normalizeCswapList

test("normalizes the real one-account cswap fixture", () => {
  const [a, ...rest] = normalizeCswapList(fixture("cswap-list-one.json"));
  assert.equal(rest.length, 0);
  assert.equal(a.provider, "claude");
  assert.equal(a.key, "claude:alice@example.com|00000000-0000-4000-8000-000000000001");
  assert.equal(a.label, "alice@example.com");
  assert.equal(a.email, "alice@example.com");
  assert.equal(a.plan, null);
  assert.equal(a.workspace, null, "default '<email>'s Organization' is not a workspace");
  assert.equal(a.active, true);
  assert.equal(a.status, "ok");
  assert.equal(a.lastGood, undefined);
  assert.deepEqual(a.switchTarget, { kind: "cswap", slot: 1 });
  assert.deepEqual(
    a.windows.map((w) => w.id),
    ["session", "weekly", "scoped:Fable"],
  );
  assert.deepEqual(win(a, "session"), {
    id: "session",
    kind: "session",
    label: "5h",
    usedPct: 41,
    resetsAt: "2026-09-30T01:09:59.900Z",
    observedAt: "2026-09-29T21:48:59.000Z",
    windowMinutes: 300,
    decisionMaxAgeMinutes: 12,
  });
  const weekly = win(a, "weekly");
  assert.equal(weekly.label, "Weekly");
  assert.equal(weekly.usedPct, 11);
  assert.equal(weekly.windowMinutes, 10080);
  assert.deepEqual(weekly.pace, {
    expectedUsedPct: 88,
    willLastToReset: true,
    projectedExhaustionAt: "2026-11-18T17:47:17.000Z",
  });
  const fable = win(a, "scoped:Fable");
  assert.equal(fable.kind, "scoped");
  assert.equal(fable.label, "Fable");
  assert.strictEqual(fable.usedPct, 0);
  assert.equal(fable.resetsAt, "2026-09-30T18:00:00.000Z");
  assert.deepEqual(fable.pace, { expectedUsedPct: 88, willLastToReset: true });
});

test("normalizes the synthesized multi-account fixture", () => {
  const accounts = normalizeCswapList(fixture("claude-cswap-list-multi.json"));
  assert.equal(accounts.length, 10);

  const dana = byEmail(accounts, "dana@example.com");
  assert.equal(dana.key, "claude:dana@example.com|00000000-0000-4000-8000-00000000000a");
  assert.equal(dana.label, "work-max");
  assert.equal(dana.alias, "work-max");
  assert.equal(dana.workspace, null);
  assert.equal(dana.status, "ok");
  assert.equal(dana.active, false);
  assert.strictEqual(win(dana, "session").usedPct, 0);
  assert.strictEqual(win(dana, "weekly").usedPct, 100);
  assert.equal(win(dana, "weekly").pace?.willLastToReset, false);
  assert.equal(win(dana, "weekly").pace?.projectedExhaustionAt, "2026-09-29T12:00:00.000Z");
  assert.strictEqual(win(dana, "scoped:Fable").usedPct, 100);
  assert.strictEqual(win(dana, "scoped:Opus").usedPct, 0);
  assert.equal(win(dana, "scoped:Opus").resetsAt, null);
  assert.equal(win(dana, "scoped:Opus").pace, undefined);

  const erin = byEmail(accounts, "erin@example.invalid");
  assert.equal(erin.status, "relogin");
  assert.equal(erin.active, true);
  assert.equal(erin.workspace, "Example Research Lab");
  assert.match(erin.statusDetail ?? "", /run \/login as erin@example\.invalid in Claude Code, then cswap add --slot 2/);
  assert.deepEqual(
    erin.windows.map((w) => [w.id, w.usedPct]),
    [
      ["session", null],
      ["weekly", null],
    ],
  );

  const frank = byEmail(accounts, "frank@example.invalid");
  assert.equal(frank.key, "claude:frank@example.invalid|");
  assert.equal(frank.status, "disabled");
  assert.equal(frank.lastGood, true);
  assert.match(frank.statusDetail ?? "", /Disabled in claude-swap/);
  assert.match(frank.statusDetail ?? "", /http-429/);
  assert.equal(win(frank, "session").usedPct, 37);
  assert.equal(win(frank, "weekly").usedPct, 64.5);
  assert.equal(win(frank, "weekly").observedAt, "2026-09-29T19:30:00.000Z");

  const grace = byEmail(accounts, "grace@example.com");
  assert.equal(grace.status, "unavailable");
  assert.equal(grace.statusDetail, "Token expired; refreshes on next Claude message");
  assert.ok(grace.windows.every((w) => w.usedPct === null));

  assert.equal(byEmail(accounts, "heidi@example.com").statusDetail, "API-key login has no subscription quota");
  assert.equal(byEmail(accounts, "heidi@example.com").status, "unavailable");
  assert.equal(byEmail(accounts, "ivan@example.com").statusDetail, "Keychain locked or unavailable; retry");
  assert.equal(byEmail(accounts, "judy@example.com").status, "error");
  assert.equal(byEmail(accounts, "mallory@example.com").status, "relogin");

  const niaj = byEmail(accounts, "niaj@example.com");
  assert.equal(niaj.status, "unavailable");
  assert.equal(niaj.lastGood, true);
  assert.equal(win(niaj, "session").usedPct, 12);
  assert.equal(win(niaj, "session").observedAt, "2026-09-29T20:00:00.000Z");

  // A successful reading without a 5h window: the window is absent (not binding), not unknown.
  const olivia = byEmail(accounts, "olivia@example.com");
  assert.equal(olivia.status, "ok");
  assert.deepEqual(
    olivia.windows.map((w) => w.id),
    ["weekly"],
  );
});

test("cswap error envelope and unsupported schema throw sanitized errors", () => {
  assert.throws(
    () => normalizeCswapList({ schemaVersion: 1, error: { type: "LockError", message: "Failed to acquire lock" } }),
    /claude-swap LockError: Failed to acquire lock/,
  );
  assert.throws(() => normalizeCswapList({ schemaVersion: 2, accounts: [] }), /schemaVersion 2/);
  assert.throws(() => normalizeCswapList({ accounts: [] }), /schemaVersion/);
  assert.throws(() => normalizeCswapList([]), /unexpected JSON/);
  assert.throws(() => normalizeCswapList({ schemaVersion: 1 }), /no accounts array/);
  const fakeSecret = "sk-ant-oat01-" + "A".repeat(48);
  assert.throws(
    () => normalizeCswapList({ schemaVersion: 1, error: { type: "X", message: `bad\u0007 ${fakeSecret}` } }),
    (error: Error) => !error.message.includes("sk-ant") && !error.message.includes("\u0007"),
  );
});

test("cswap edge values: token_expired with usage, pct bounds, observedAt from age, duplicate identities", () => {
  const nowMs = Date.parse("2026-09-29T22:00:00Z");
  const accounts = normalizeCswapList(
    {
      schemaVersion: 1,
      accounts: [
        {
          number: 1,
          email: "pat@example.com",
          organizationUuid: "",
          active: false,
          usageStatus: "token_expired",
          usage: { fiveHour: { pct: 104.2 }, sevenDay: { pct: -3 }, scoped: [{ pct: "50", name: "Fable" }] },
          usageAgeSeconds: 30,
        },
        { number: 2, email: "pat@example.com", organizationUuid: "", active: false, usageStatus: "ok", usage: null },
        { number: 3, email: "", active: false, usageStatus: "brand_new_status", usage: null },
      ],
    },
    nowMs,
  );
  const [first, second, third] = accounts;
  assert.equal(first.status, "ok");
  assert.equal(win(first, "session").usedPct, 100);
  assert.equal(win(first, "weekly").usedPct, null);
  assert.equal(win(first, "scoped:Fable").usedPct, null);
  assert.equal(win(first, "session").observedAt, "2026-09-29T21:59:30.000Z");
  assert.equal(first.key, "claude:pat@example.com|");
  assert.equal(second.key, "claude:pat@example.com|#2");
  assert.equal(second.status, "unavailable");
  assert.equal(third.label, "Account 3");
  assert.equal(third.key, "claude:ambient|");
  assert.match(third.statusDetail ?? "", /Unknown claude-swap usage status/);

  const [noClock] = normalizeCswapList({
    schemaVersion: 1,
    accounts: [
      { number: 1, email: "q@example.com", usageStatus: "ok", usage: { sevenDay: { pct: 1 } }, usageAgeSeconds: 5 },
    ],
  });
  assert.equal(win(noClock, "weekly").observedAt, null);
});

// ---------------------------------------------------------------------------
// normalizeCodexbarClaudeAmbient

test("normalizes the ambient CodexBar Claude fixture", () => {
  const [a, ...rest] = normalizeCodexbarClaudeAmbient(fixture("codexbar-claude-ambient.json"));
  assert.equal(rest.length, 0);
  assert.equal(a.key, "claude:ambient|");
  assert.equal(a.label, "Current Claude login");
  assert.equal(a.email, null);
  assert.equal(a.active, true);
  assert.equal(a.status, "ok");
  assert.equal(a.switchTarget, undefined);
  assert.deepEqual(
    a.windows.map((w) => w.id),
    ["session", "weekly", "scoped:Fable"],
  );
  const session = win(a, "session");
  assert.equal(session.usedPct, 11);
  assert.equal(session.windowMinutes, 300);
  assert.equal(session.resetsAt, "2026-09-30T01:10:00.000Z");
  assert.equal(session.observedAt, "2026-09-29T20:57:21.000Z");
  assert.deepEqual(session.pace, {
    expectedUsedPct: 16,
    willLastToReset: true,
    summary: "5% in reserve | Expected 16% used | Lasts until reset",
    stage: "slightlyBehind",
  });
  assert.equal(win(a, "weekly").usedPct, 3);
  assert.equal(win(a, "weekly").pace?.stage, "farBehind");
  assert.equal(win(a, "weekly").pace?.projectedExhaustionAt, undefined);
  const fable = win(a, "scoped:Fable");
  assert.equal(fable.label, "Fable");
  assert.strictEqual(fable.usedPct, 0);
  assert.equal(fable.windowMinutes, 10080);
});

test("ambient CodexBar error row throws", () => {
  assert.throws(
    () => normalizeCodexbarClaudeAmbient(fixture("codexbar-claude-no-token-accounts.json")),
    /CodexBar: No token accounts configured for claude\./,
  );
  assert.throws(() => normalizeCodexbarClaudeAmbient([{ provider: "codex" }]), /no Claude usage row/);
});

test("ambient identity, unknown windows and relative ETAs", () => {
  const [a] = normalizeCodexbarClaudeAmbient([
    {
      provider: "claude",
      source: "oauth",
      pace: { secondary: { expectedUsedPercent: 40, willLastToReset: false, etaSeconds: 3600, stage: "ahead" } },
      usage: {
        primary: { usedPercent: 0, windowMinutes: 300, isSyntheticPlaceholder: true },
        secondary: { usedPercent: 100, windowMinutes: 10080, resetsAt: "2026-10-01T00:00:00Z" },
        tertiary: null,
        extraRateWindows: [
          { id: "claude-weekly-scoped-fable", title: "Fable only", usageKnown: false, window: { usedPercent: 0 } },
        ],
        updatedAt: "2026-09-29T21:00:00Z",
        identity: { providerID: "claude", accountEmail: "Sam@Example.com", accountOrganization: "Example Org" },
        accountEmail: "Sam@Example.com",
        loginMethod: "Claude Max",
      },
    },
  ]);
  assert.equal(a.key, "claude:sam@example.com|");
  assert.equal(a.label, "Sam@Example.com");
  assert.equal(a.plan, "Claude Max");
  assert.equal(a.workspace, "Example Org");
  assert.equal(win(a, "session").usedPct, null, "synthetic placeholder is not a reading");
  assert.strictEqual(win(a, "weekly").usedPct, 100);
  assert.deepEqual(win(a, "weekly").pace, { expectedUsedPct: 40, willLastToReset: false, stage: "ahead" });
  assert.equal(win(a, "scoped:Fable").usedPct, null);

  const [empty] = normalizeCodexbarClaudeAmbient([{ provider: "claude", usage: null }]);
  assert.equal(empty.status, "unavailable");
  assert.deepEqual(
    empty.windows.map((w) => [w.id, w.usedPct]),
    [
      ["session", null],
      ["weekly", null],
    ],
  );
});

// ---------------------------------------------------------------------------
// fetchClaude

test("fetchClaude reads cswap --list --json", async () => {
  const dir = tempDir();
  const cswapPath = installFake(dir, "cswap");
  setSpec(dir, "list", { stdout: json(fixture("cswap-list-one.json")) });
  const result = await fetchClaude({ cswapPath, codexbarPath: path.join(dir, "missing") });
  assert.equal(result.provider, "claude");
  assert.equal(result.source, "cswap");
  assert.equal(result.accounts.length, 1);
  assert.deepEqual(result.notices, []);
  assert.deepEqual(calls(dir), [["--list", "--json"]]);
});

test("fetchClaude tolerates a noisy line before the JSON and surfaces cswap warnings", async () => {
  const dir = tempDir();
  const cswapPath = installFake(dir, "cswap");
  setSpec(dir, "list", {
    stdout: "Warning: failed to save refreshed token\n" + json(fixture("claude-cswap-list-multi.json")),
  });
  const result = await fetchClaude({ cswapPath, codexbarPath: path.join(dir, "missing") });
  assert.equal(result.accounts.length, 10);
  assert.deepEqual(result.notices, ["Account-11 and Account-12 hold the same login (synthetic test warning)"]);
});

test("fetchClaude rejects on a cswap error envelope (nonzero exit)", async () => {
  const dir = tempDir();
  const cswapPath = installFake(dir, "cswap");
  setSpec(dir, "list", {
    stdout: json({ schemaVersion: 1, error: { type: "ConfigError", message: "sequence file is corrupt" } }),
    exit: 1,
  });
  await assert.rejects(
    fetchClaude({ cswapPath, codexbarPath: path.join(dir, "missing") }),
    /ConfigError: sequence file is corrupt/,
  );
});

test("fetchClaude reports an empty cswap inventory", async () => {
  const dir = tempDir();
  const cswapPath = installFake(dir, "cswap");
  setSpec(dir, "list", { stdout: json({ schemaVersion: 1, activeAccountNumber: null, accounts: [] }) });
  const result = await fetchClaude({ cswapPath, codexbarPath: path.join(dir, "missing") });
  assert.equal(result.accounts.length, 0);
  assert.match(result.notices[0], /no accounts yet/);
});

test("fetchClaude falls back to CodexBar oauth, then the Claude Code CLI source (never auto), when cswap is missing", async () => {
  const dir = tempDir();
  const codexbarPath = installFake(dir, "codexbar");
  setSpec(dir, "oauth", {
    stdout: JSON.stringify([
      {
        source: "oauth",
        provider: "claude",
        error: { code: 1, message: "Claude OAuth credentials not found.", kind: "provider" },
      },
    ]),
    exit: 1,
  });
  setSpec(dir, "cli", { stdout: json(fixture("codexbar-claude-ambient.json")) });
  const result = await fetchClaude({ cswapPath: path.join(dir, "no-cswap"), codexbarPath });
  assert.equal(result.source, "codexbar-ambient");
  assert.deepEqual(result.notices, ["claude-swap not installed — showing the current Claude login only"]);
  assert.equal(result.accounts.length, 1);
  assert.equal(result.accounts[0].active, true);
  assert.deepEqual(calls(dir), [
    ["usage", "--provider", "claude", "--source", "oauth", "--no-credits", "--json"],
    ["usage", "--provider", "claude", "--source", "cli", "--no-credits", "--json"],
  ]);
});

test("fetchClaude uses the oauth result directly when it succeeds", async () => {
  const dir = tempDir();
  const codexbarPath = installFake(dir, "codexbar");
  setSpec(dir, "oauth", { stdout: json(fixture("codexbar-claude-ambient.json")) });
  const result = await fetchClaude({ cswapPath: path.join(dir, "no-cswap"), codexbarPath });
  assert.equal(result.source, "codexbar-ambient");
  assert.equal(calls(dir).length, 1);
});

test("fetchClaude rejects when both CodexBar sources fail", async () => {
  const dir = tempDir();
  const codexbarPath = installFake(dir, "codexbar");
  setSpec(dir, "oauth", { stdout: "not json", exit: 1 });
  setSpec(dir, "cli", { stdout: json(fixture("codexbar-claude-no-token-accounts.json")), exit: 1 });
  await assert.rejects(
    fetchClaude({ cswapPath: path.join(dir, "no-cswap"), codexbarPath }),
    (error: Error) =>
      /claude-swap is not installed/.test(error.message) && /No token accounts configured/.test(error.message),
  );
});

test("fetchClaude rejects when neither cswap nor codexbar exists", async () => {
  const dir = tempDir();
  await assert.rejects(
    fetchClaude({ cswapPath: path.join(dir, "no-cswap"), codexbarPath: path.join(dir, "no-codexbar") }),
    /CodexBar CLI is not available/,
  );
});

// ---------------------------------------------------------------------------
// switchClaude

test("switchClaude succeeds and verifies the new identity", async () => {
  const { dir, cfg } = switchEnv();
  setSpec(dir, "switch", {
    stdout: json(switchPayload(2, "bob@example.com")),
    then: { status: { stdout: json(statusPayload("bob@example.com", 2, ORG_B)) } },
  });
  const pids: (number | undefined)[] = [];
  const result = await switchClaude(request(), cfg, { onSpawn: (pid) => pids.push(pid) });
  assert.equal(result.state, "succeeded");
  assert.equal(result.message, "Claude → Bob Max. Running Claude Code picks it up within ~30 s.");
  assert.equal(result.activeKey, claudeKey("bob@example.com", ORG_B));
  // Every cswap child (--list, --switch-to, --status) is recorded in the provider lock, so a child still running
  // past its UI deadline keeps the lock and no second cswap run starts over it.
  assert.equal(pids.length, 3);
  assert.ok(pids.every((pid) => typeof pid === "number"));
  assert.deepEqual(calls(dir), [
    ["--list", "--json"],
    ["--switch-to", "2", "--json"],
    ["--status", "--json"],
  ]);
});

test("switchClaude accepts a noisy line before the switch JSON", async () => {
  const { dir, cfg } = switchEnv();
  setSpec(dir, "switch", {
    stdout: "Warning: something harmless\n" + json(switchPayload(2, "bob@example.com")),
    then: { status: { stdout: json(statusPayload("bob@example.com", 2, ORG_B)) } },
  });
  const result = await switchClaude(request(), cfg);
  assert.equal(result.state, "succeeded");
});

test("switchClaude maps a cswap error envelope to failed without verifying", async () => {
  const { dir, cfg } = switchEnv();
  setSpec(dir, "switch", {
    stdout: json({
      schemaVersion: 1,
      error: { type: "LockError", message: "Failed to acquire lock - another instance may be running" },
    }),
    exit: 1,
  });
  const result = await switchClaude(request(), cfg);
  assert.equal(result.state, "failed");
  assert.equal(result.message, "claude-swap LockError: Failed to acquire lock - another instance may be running");
  assert.equal(result.activeKey, undefined);
  assert.deepEqual(
    calls(dir).map((c) => c[0]),
    ["--list", "--switch-to"],
  );
});

test("switchClaude reports unknown for garbage output", async () => {
  const { dir, cfg } = switchEnv();
  setSpec(dir, "switch", { stdout: "Traceback (most recent call last):\n  boom\n", exit: 1 });
  const result = await switchClaude(request(), cfg);
  assert.equal(result.state, "unknown");
  assert.match(result.message, /unreadable output \(exit 1\)/);
  assert.deepEqual(
    calls(dir).map((c) => c[0]),
    ["--list", "--switch-to"],
  );
});

test("switchClaude reports unknown when the process is killed by a signal", async () => {
  const { cfg, dir } = switchEnv();
  setSpec(dir, "switch", { signal: "SIGKILL" });
  const result = await switchClaude(request(), cfg);
  assert.equal(result.state, "unknown");
  assert.match(result.message, /interrupted \(SIGKILL\)/);
});

test("switchClaude reports unknown when cswap confirms a different slot or exits 0 with an envelope", async () => {
  const wrongSlot = switchEnv();
  setSpec(wrongSlot.dir, "switch", { stdout: json(switchPayload(1, "alice@example.com")) });
  assert.equal((await switchClaude(request(), wrongSlot.cfg)).state, "unknown");

  const envelopeZero = switchEnv();
  setSpec(envelopeZero.dir, "switch", { stdout: json({ schemaVersion: 1, error: { type: "X", message: "odd" } }) });
  assert.equal((await switchClaude(request(), envelopeZero.cfg)).state, "unknown");
});

test("switchClaude is a noop when the target is already active", async () => {
  const { dir, cfg } = switchEnv();
  const result = await switchClaude(
    request({ targetKey: claudeKey("alice@example.com", ORG_A), expectedEmail: "alice@example.com", targetLabel: "" }),
    cfg,
  );
  assert.equal(result.state, "noop");
  assert.equal(result.activeKey, claudeKey("alice@example.com", ORG_A));
  assert.equal(result.message, "Claude is already using alice@example.com");
  assert.deepEqual(calls(dir), [["--list", "--json"]]);
});

test("switchClaude reports unknown when verification shows another account", async () => {
  const { dir, cfg } = switchEnv();
  setSpec(dir, "switch", { stdout: json(switchPayload(2, "bob@example.com")) });
  const result = await switchClaude(request(), cfg);
  assert.equal(result.state, "unknown");
  assert.match(result.message, /reports alice@example\.com, not bob@example\.com/);
  assert.equal(result.activeKey, undefined);
});

test("switchClaude reports unknown when verification cannot run", async () => {
  const { dir, cfg } = switchEnv();
  setSpec(dir, "switch", {
    stdout: json(switchPayload(2, "bob@example.com")),
    then: { status: { stdout: "garbage", exit: 1 } },
  });
  const result = await switchClaude(request(), cfg);
  assert.equal(result.state, "unknown");
  assert.match(result.message, /could not be verified/);
});

test("switchClaude refuses unknown targets and stale requests without switching", async () => {
  const missing = switchEnv();
  const notFound = await switchClaude(
    request({ targetKey: claudeKey("zed@example.com", null), expectedEmail: "zed@example.com" }),
    missing.cfg,
  );
  assert.deepEqual(notFound, { state: "failed", message: "Account not found in claude-swap" });
  assert.deepEqual(calls(missing.dir), [["--list", "--json"]]);

  const stale = switchEnv();
  const mismatch = await switchClaude(request({ expectedEmail: "someone-else@example.com" }), stale.cfg);
  assert.equal(mismatch.state, "failed");
  assert.deepEqual(calls(stale.dir), [["--list", "--json"]]);

  const wrongProvider = await switchClaude(request({ provider: "codex" }), stale.cfg);
  assert.equal(wrongProvider.state, "failed");

  const noCswap = await switchClaude(request(), { cswapPath: path.join(tempDir(), "cswap"), codexbarPath: "/nope" });
  assert.equal(noCswap.state, "failed");
});

test("switchClaude falls back to a unique email match only for a request without an organization", async () => {
  const { dir, cfg } = switchEnv();
  setSpec(dir, "switch", {
    stdout: json(switchPayload(2, "bob@example.com")),
    then: { status: { stdout: json(statusPayload("bob@example.com", 2, ORG_B)) } },
  });
  // A legacy slot requested before cswap migrated its organization.
  const result = await switchClaude(request({ targetKey: claudeKey("bob@example.com", null) }), cfg);
  assert.equal(result.state, "succeeded");
  assert.equal(result.activeKey, claudeKey("bob@example.com", ORG_B));
  assert.deepEqual(calls(dir)[1], ["--switch-to", "2", "--json"]);
});

test("switchClaude refuses to substitute another organization's slot for the same email", async () => {
  const { dir, cfg } = switchEnv();
  const result = await switchClaude(request({ targetKey: claudeKey("bob@example.com", "old-org") }), cfg);
  assert.deepEqual(result, {
    state: "failed",
    message: "The claude-swap account changed since the list loaded; refresh and pick again",
  });
  assert.deepEqual(calls(dir), [["--list", "--json"]]);
});

// ---------------------------------------------------------------------------
// Review fixes

interface RowSpec {
  n: number;
  email: string;
  org: string;
  active?: boolean;
  usageStatus?: string;
}

function cswapRow(r: RowSpec): Record<string, unknown> {
  const ok = (r.usageStatus ?? "ok") === "ok";
  return {
    number: r.n,
    email: r.email,
    organizationName: `${r.email}'s Organization`,
    organizationUuid: r.org,
    isOrganization: !!r.org,
    active: r.active === true,
    usageStatus: r.usageStatus ?? "ok",
    usage: ok ? { fiveHour: { pct: 10.0 }, sevenDay: { pct: 20.0 } } : null,
    usageFetchedAt: "2026-09-29T21:00:00Z",
  };
}

function listOf(rows: RowSpec[]): unknown {
  const active = rows.find((r) => r.active === true);
  return { schemaVersion: 1, activeAccountNumber: active ? active.n : null, accounts: rows.map(cswapRow) };
}

function statusOf(active: Record<string, unknown> | null): unknown {
  return { schemaVersion: 1, active };
}

function envWith(rows: RowSpec[]): { dir: string; cfg: { cswapPath: string; codexbarPath: string } } {
  const dir = tempDir();
  const cswapPath = installFake(dir, "cswap");
  setSpec(dir, "list", { stdout: json(listOf(rows)) });
  return { dir, cfg: { cswapPath, codexbarPath: path.join(dir, "no-codexbar") } };
}

// Finding 1: cswap --list/--status can rotate refresh tokens, so they are never signalled.

test("fetchClaude stops waiting at the deadline but never kills cswap --list", async () => {
  const dir = tempDir();
  const cswapPath = installFake(dir, "cswap");
  setSpec(dir, "list", { stdout: json(listPayload(1)), sleepMs: 1200 });
  const started = Date.now();
  await assert.rejects(
    fetchClaude({ cswapPath, codexbarPath: path.join(dir, "missing"), queryDeadlineMs: 200 }),
    (error: Error) => error.message === "claude-swap is still refreshing; showing previous readings",
  );
  assert.ok(Date.now() - started < 1000, "the caller stops waiting at the deadline");
  assert.deepEqual(calls(dir), [["--list", "--json"]], "no CodexBar fallback and no second cswap run");
  await waitFor(() => completed(dir).length === 1);
  assert.deepEqual(completed(dir), [["--list", "--json"]], "the child ran to completion");
});

test("switchClaude does not switch when the pre-switch --list outlives the deadline, and leaves it running", async () => {
  const { dir, cfg } = switchEnv();
  setSpec(dir, "list", { stdout: json(listPayload(1)), sleepMs: 1000 });
  const result = await switchClaude(request(), { ...cfg, queryDeadlineMs: 150 });
  assert.equal(result.state, "failed");
  assert.match(result.message, /still refreshing/);
  assert.deepEqual(calls(dir), [["--list", "--json"]]);
  await waitFor(() => completed(dir).length === 1);
});

test("switchClaude reports unknown when the post-switch --status outlives the deadline, and never kills it", async () => {
  const { dir, cfg } = switchEnv();
  setSpec(dir, "switch", {
    stdout: json(switchPayload(2, "bob@example.com")),
    then: { status: { stdout: json(statusPayload("bob@example.com", 2, ORG_B)), sleepMs: 1000 } },
  });
  const result = await switchClaude(request(), { ...cfg, queryDeadlineMs: 300 });
  assert.equal(result.state, "unknown");
  assert.match(result.message, /could not be verified \(claude-swap --status is still running/);
  await waitFor(() => completed(dir).some((c) => c[0] === "--status"));
});

// Findings 2 and 9: cswap-vouched readings stay decision-grade across its ~10-minute poll cadence.

test("cswap 'ok' readings carry a 12-minute decision horizon; last-known-good and expired readings do not", () => {
  const accounts = normalizeCswapList(fixture("claude-cswap-list-multi.json"));
  const dana = byEmail(accounts, "dana@example.com");
  assert.ok(dana.windows.length > 0);
  assert.ok(dana.windows.every((w) => w.decisionMaxAgeMinutes === 12));
  assert.ok(byEmail(accounts, "olivia@example.com").windows.every((w) => w.decisionMaxAgeMinutes === 12));
  for (const email of ["frank@example.invalid", "niaj@example.com", "grace@example.com", "erin@example.invalid"]) {
    assert.ok(
      byEmail(accounts, email).windows.every((w) => w.decisionMaxAgeMinutes === undefined),
      `${email} gets no backend trust horizon`,
    );
  }
  const [expired] = normalizeCswapList({
    schemaVersion: 1,
    accounts: [{ number: 1, email: "t@example.com", usageStatus: "token_expired", usage: { sevenDay: { pct: 5 } } }],
  });
  assert.equal(win(expired, "weekly").decisionMaxAgeMinutes, undefined);
});

// Finding 8: the CodexBar fallback must not present the claude.ai browser session as the Claude Code login.

test("a web-sourced CodexBar row is never the active Claude Code login", () => {
  const [a] = normalizeCodexbarClaudeAmbient([
    {
      provider: "claude",
      source: "web",
      usage: {
        primary: { usedPercent: 47, windowMinutes: 300 },
        secondary: { usedPercent: 89, windowMinutes: 10080 },
        updatedAt: "2026-09-29T21:00:00Z",
        accountEmail: "browser-account@example.com",
      },
    },
  ]);
  assert.equal(a.active, "unknown");
  assert.notEqual(a.key, claudeKey("browser-account@example.com", null));
  assert.equal(a.label, "claude.ai browser session (browser-account@example.com)");
  assert.match(a.statusDetail ?? "", /may not be the Claude Code login/);
  assert.equal(a.switchTarget, undefined);
});

test("fetchClaude ambient fallback flags a browser-session row instead of marking it active", async () => {
  const dir = tempDir();
  const codexbarPath = installFake(dir, "codexbar");
  setSpec(dir, "oauth", { stdout: "not json", exit: 1 });
  setSpec(dir, "cli", {
    stdout: json([
      { provider: "claude", source: "web", usage: { primary: { usedPercent: 5 }, accountEmail: "b@example.com" } },
    ]),
  });
  const result = await fetchClaude({ cswapPath: path.join(dir, "no-cswap"), codexbarPath });
  assert.equal(result.accounts[0].active, "unknown");
  assert.ok(result.notices.some((n) => /claude\.ai browser session/.test(n)));
});

// Finding 11: post-switch verification compares slot and organization exactly.

const BOB_SLOTS: RowSpec[] = [
  { n: 1, email: "alice@example.com", org: ORG_A, active: true },
  { n: 2, email: "bob@example.com", org: "" },
  { n: 3, email: "bob@example.com", org: ORG_B },
];

function managedStatus(n: number, email: string, org: string | undefined): Record<string, unknown> {
  const s: Record<string, unknown> = { number: n, email, managed: true, usageStatus: "ok", usage: null };
  if (org !== undefined) s.organizationUuid = org;
  return s;
}

test("switchClaude reports unknown when the live login is the same email in another (empty) organization", async () => {
  const { dir, cfg } = envWith(BOB_SLOTS);
  setSpec(dir, "switch", {
    stdout: json(switchPayload(3, "bob@example.com")),
    then: { status: { stdout: json(statusOf(managedStatus(2, "bob@example.com", ""))) } },
  });
  const result = await switchClaude(request({ targetKey: claudeKey("bob@example.com", ORG_B) }), cfg);
  assert.equal(result.state, "unknown");
  assert.equal(result.activeKey, undefined);
  assert.match(result.message, /in a different organization/);
});

test("switchClaude reports unknown when the target has an empty organization but the live login has one", async () => {
  const { dir, cfg } = envWith(BOB_SLOTS);
  setSpec(dir, "switch", {
    stdout: json(switchPayload(2, "bob@example.com")),
    then: { status: { stdout: json(statusOf(managedStatus(3, "bob@example.com", ORG_B))) } },
  });
  const result = await switchClaude(request({ targetKey: claudeKey("bob@example.com", null) }), cfg);
  assert.equal(result.state, "unknown");
  assert.equal(result.activeKey, undefined);
});

test("switchClaude reports unknown when --status omits the organization or names a slot that is not the target", async () => {
  const noOrg = switchEnv();
  setSpec(noOrg.dir, "switch", {
    stdout: json(switchPayload(2, "bob@example.com")),
    then: { status: { stdout: json(statusOf(managedStatus(2, "bob@example.com", undefined))) } },
  });
  assert.equal((await switchClaude(request(), noOrg.cfg)).state, "unknown");

  const otherSlot = switchEnv();
  setSpec(otherSlot.dir, "switch", {
    stdout: json(switchPayload(2, "bob@example.com")),
    then: { status: { stdout: json(statusOf(managedStatus(7, "bob@example.com", ORG_B))) } },
  });
  const result = await switchClaude(request(), otherSlot.cfg);
  assert.equal(result.state, "unknown");
  assert.match(result.message, /in slot 7, not slot 2/);
});

test("switchClaude accepts --status naming an identical duplicate slot and keeps the requested slot's key", async () => {
  const { dir, cfg } = envWith([
    { n: 1, email: "alice@example.com", org: ORG_A, active: true },
    { n: 2, email: "bob@example.com", org: ORG_B },
    { n: 3, email: "bob@example.com", org: ORG_B },
  ]);
  setSpec(dir, "switch", {
    stdout: json(switchPayload(3, "bob@example.com")),
    then: { status: { stdout: json(statusOf(managedStatus(2, "bob@example.com", ORG_B))) } },
  });
  const targetKey = `${claudeKey("bob@example.com", ORG_B)}#3`;
  const result = await switchClaude(request({ targetKey }), cfg);
  assert.equal(result.state, "succeeded");
  assert.equal(result.activeKey, targetKey);
  assert.deepEqual(calls(dir)[1], ["--switch-to", "3", "--json"]);
});

// Finding 12: a foreign credential on the active slot is repaired by cswap's self-switch.

const FOREIGN_SLOTS: RowSpec[] = [
  { n: 1, email: "alice@example.com", org: ORG_A, active: true, usageStatus: "foreign_credential" },
  { n: 2, email: "bob@example.com", org: ORG_B },
];

function selfSwitchPayload(warnings: string[]): unknown {
  const ref = { number: 1, email: "alice@example.com" };
  return {
    schemaVersion: 1,
    switched: false,
    from: ref,
    to: ref,
    strategy: "direct",
    reason: "already-active",
    message: "Already on Account-1 (alice@example.com)",
    warnings,
  };
}

const aliceRequest = (): SwitchRequest =>
  request({ targetKey: claudeKey("alice@example.com", ORG_A), expectedEmail: "alice@example.com", targetLabel: "" });

test("foreign_credential detail names a remedy the extension can perform", () => {
  const [alice] = normalizeCswapList(listOf(FOREIGN_SLOTS));
  assert.equal(alice.status, "error");
  assert.doesNotMatch(alice.statusDetail ?? "", /switching repairs it/);
  assert.match(alice.statusDetail ?? "", /switch away and back, or run cswap --switch-to 1/);
});

test("switchClaude runs cswap's self-switch repair for an active slot with a foreign credential", async () => {
  const { dir, cfg } = envWith(FOREIGN_SLOTS);
  setSpec(dir, "switch", {
    stdout: json(selfSwitchPayload(["Credential ownership mismatch detected. The live credential was preserved."])),
    then: { status: { stdout: json(statusOf(managedStatus(1, "alice@example.com", ORG_A))) } },
  });
  const result = await switchClaude(aliceRequest(), cfg);
  assert.equal(result.state, "succeeded");
  assert.match(result.message, /^Repaired the Claude login for alice@example\.com\. Credential ownership mismatch/);
  assert.equal(result.activeKey, claudeKey("alice@example.com", ORG_A));
  assert.deepEqual(calls(dir), [
    ["--list", "--json"],
    ["--switch-to", "1", "--json"],
    ["--status", "--json"],
  ]);
});

test("switchClaude reports a repair that did not take, and never lets a refresh upgrade an unconfirmed one", async () => {
  const stillForeign = envWith(FOREIGN_SLOTS);
  setSpec(stillForeign.dir, "switch", {
    stdout: json(selfSwitchPayload([])),
    then: {
      status: {
        stdout: json(statusOf({ ...managedStatus(1, "alice@example.com", ORG_A), usageStatus: "foreign_credential" })),
      },
    },
  });
  const failed = await switchClaude(aliceRequest(), stillForeign.cfg);
  assert.equal(failed.state, "failed");
  assert.match(failed.message, /still belongs to another account/);

  const silent = envWith(FOREIGN_SLOTS);
  setSpec(silent.dir, "switch", {
    stdout: json(selfSwitchPayload([])),
    then: { status: { stdout: json(statusOf(managedStatus(1, "alice@example.com", ORG_A))) } },
  });
  const unconfirmed = await switchClaude(aliceRequest(), silent.cfg);
  assert.equal(unconfirmed.state, "unknown");
  assert.match(unconfirmed.warning ?? "", /repair could not be confirmed/);
});

// Finding 21: slots whose login Claude Code cannot use are not activated.

test("cswap rows needing a re-login carry switchBlocked; transient states do not", () => {
  const accounts = normalizeCswapList(fixture("claude-cswap-list-multi.json"));
  assert.match(byEmail(accounts, "erin@example.invalid").switchBlocked ?? "", /run \/login as erin@example\.invalid/);
  assert.match(byEmail(accounts, "mallory@example.com").switchBlocked ?? "", /No stored login/);
  for (const email of ["dana@example.com", "ivan@example.com", "grace@example.com", "judy@example.com"]) {
    assert.equal(byEmail(accounts, email).switchBlocked, undefined, email);
  }
});

test("switchClaude refuses relogin, no-credential and keychain-unavailable targets without switching", async () => {
  for (const [usageStatus, pattern] of [
    ["relogin_required", /Re-login needed: run \/login as bob@example\.com in Claude Code, then cswap add --slot 2/],
    ["no_credentials", /No stored login: run \/login as bob@example\.com/],
    ["keychain_unavailable", /keychain.*Retry/],
  ] as const) {
    const { dir, cfg } = envWith([
      { n: 1, email: "alice@example.com", org: ORG_A, active: true },
      { n: 2, email: "bob@example.com", org: ORG_B, usageStatus },
    ]);
    const result = await switchClaude(request(), cfg);
    assert.equal(result.state, "failed", usageStatus);
    assert.match(result.message, pattern);
    assert.deepEqual(calls(dir), [["--list", "--json"]], usageStatus);
  }
});

// Finding 22: a live login claude-swap does not manage stays visible as the active row.

test("fetchClaude adds the unmanaged live login as the active row when no slot is active", async () => {
  const { dir, cfg } = envWith([
    { n: 1, email: "alice@example.com", org: ORG_A },
    { n: 2, email: "bob@example.com", org: ORG_B },
  ]);
  setSpec(dir, "status", { stdout: json(statusOf({ email: "carol@example.com", managed: false })) });
  const result = await fetchClaude(cfg);
  assert.equal(result.accounts.length, 3);
  const live = result.accounts[2];
  assert.equal(live.key, claudeKey("carol@example.com", null));
  assert.equal(live.label, "carol@example.com (not in claude-swap)");
  assert.equal(live.active, true);
  assert.equal(live.status, "unavailable");
  assert.equal(live.switchTarget, undefined);
  assert.deepEqual(
    live.windows.map((w) => [w.id, w.usedPct]),
    [
      ["session", null],
      ["weekly", null],
    ],
  );
  assert.ok(result.notices.some((n) => /carol@example\.com.*cswap add/.test(n)));
  assert.deepEqual(calls(dir), [
    ["--list", "--json"],
    ["--status", "--json"],
  ]);
});

test("fetchClaude unmanaged live login: empty inventory, no live login, and key collisions", async () => {
  const empty = envWith([]);
  setSpec(empty.dir, "status", { stdout: json(statusOf({ email: "carol@example.com", managed: false })) });
  const onlyLive = await fetchClaude(empty.cfg);
  assert.deepEqual(
    onlyLive.accounts.map((a) => [a.label, a.active]),
    [["carol@example.com (not in claude-swap)", true]],
  );
  assert.equal(onlyLive.notices.length, 1);
  assert.match(onlyLive.notices[0], /no accounts yet/);

  const loggedOut = envWith([{ n: 1, email: "alice@example.com", org: ORG_A }]);
  setSpec(loggedOut.dir, "status", { stdout: json(statusOf(null)) });
  assert.equal((await fetchClaude(loggedOut.cfg)).accounts.length, 1);

  // Same email as a managed empty-org slot, but cswap says the live login is not that slot (another org).
  const collide = envWith([{ n: 1, email: "carol@example.com", org: "" }]);
  setSpec(collide.dir, "status", { stdout: json(statusOf({ email: "carol@example.com", managed: false })) });
  const both = await fetchClaude(collide.cfg);
  assert.deepEqual(
    both.accounts.map((a) => a.key),
    [claudeKey("carol@example.com", null), `${claudeKey("carol@example.com", null)}#live`],
  );

  const active = envWith([{ n: 1, email: "alice@example.com", org: ORG_A, active: true }]);
  await fetchClaude(active.cfg);
  assert.deepEqual(calls(active.dir), [["--list", "--json"]], "no --status when a slot is active");
});

// Integration: every cswap child is reported to the caller's lock, including one left running past its deadline.

test("fetchClaude reports each cswap child through onSpawn, including a --list left running past the deadline", async () => {
  const dir = tempDir();
  const cswapPath = installFake(dir, "cswap");
  setSpec(dir, "list", { stdout: json(listPayload(1)), sleepMs: 800 });
  const pids: (number | undefined)[] = [];
  await assert.rejects(
    fetchClaude(
      { cswapPath, codexbarPath: path.join(dir, "missing"), queryDeadlineMs: 150 },
      { onSpawn: (pid) => pids.push(pid) },
    ),
    /still refreshing/,
  );
  assert.equal(pids.length, 1);
  const pid = pids[0]!;
  assert.equal(typeof pid, "number");
  // The detached child is alive right after the deadline (a lock holding its pid stays held) and then finishes.
  assert.doesNotThrow(() => process.kill(pid, 0));
  await waitFor(() => completed(dir).length === 1);
});

test("fetchClaude reports the unmanaged-login --status child too", async () => {
  const { dir, cfg } = envWith([{ n: 1, email: "alice@example.com", org: ORG_A }]);
  setSpec(dir, "status", {
    stdout: json(statusOf({ managed: false, email: "carol@example.com", organizationUuid: "" })),
  });
  const pids: (number | undefined)[] = [];
  const fetched = await fetchClaude(cfg, { onSpawn: (pid) => pids.push(pid) });
  assert.ok(fetched.accounts.some((a) => a.active === true && a.email === "carol@example.com"));
  assert.deepEqual(calls(dir), [
    ["--list", "--json"],
    ["--status", "--json"],
  ]);
  assert.equal(pids.length, 2);
});

// Finding 12 (UI side): the active foreign-credential row is marked for the list's "Repair Claude Login" action.

test("only the active foreign_credential row carries loginRepair", () => {
  const [alice, bob] = normalizeCswapList(listOf(FOREIGN_SLOTS));
  assert.equal(alice.loginRepair, true);
  assert.equal(alice.switchBlocked, undefined);
  assert.equal(bob.loginRepair, undefined);
  const [inactive] = normalizeCswapList(
    listOf([
      { n: 1, email: "alice@example.com", org: ORG_A, usageStatus: "foreign_credential" },
      { n: 2, email: "bob@example.com", org: ORG_B, active: true },
    ]),
  );
  assert.equal(inactive.loginRepair, undefined);
  for (const a of normalizeCswapList(fixture("claude-cswap-list-multi.json"))) assert.equal(a.loginRepair, undefined);
});

// ---------------------------------------------------------------------------
// New logins show up by themselves: auto-add of an untracked Claude Code login, and Claude desktop app accounts.

test("fetchClaude auto-adds an untracked Claude Code login and shows it as the active slot", async () => {
  const { dir, cfg } = envWith([{ n: 1, email: "alice@example.com", org: ORG_A }]);
  setSpec(dir, "status", { stdout: json(statusOf({ email: "carol@example.com", managed: false })) });
  setSpec(dir, "other", {
    stdout: "Added Account 2: carol@example.com\n",
    then: {
      list: {
        stdout: json(
          listOf([
            { n: 1, email: "alice@example.com", org: ORG_A },
            { n: 2, email: "carol@example.com", org: ORG_B, active: true },
          ]),
        ),
      },
    },
  });
  const fetched = await fetchClaude({ ...cfg, autoAddLogins: true });
  const carol = fetched.accounts.find((a) => a.email === "carol@example.com");
  assert.equal(carol?.active, true);
  assert.deepEqual(carol?.switchTarget, { kind: "cswap", slot: 2 });
  assert.equal(fetched.accounts.length, 2, "no leftover 'not in claude-swap' row");
  assert.ok(fetched.notices.some((n) => /Added the new Claude login carol@example\.com as account 2/.test(n)));
  assert.deepEqual(calls(dir), [["--list", "--json"], ["--status", "--json"], ["add"], ["--list", "--json"]]);
});

test("fetchClaude keeps the untracked row and explains when the auto-add fails", async () => {
  const { dir, cfg } = envWith([{ n: 1, email: "alice@example.com", org: ORG_A }]);
  setSpec(dir, "status", { stdout: json(statusOf({ email: "carol@example.com", managed: false })) });
  setSpec(dir, "other", { stdout: "", exit: 1 });
  const fetched = await fetchClaude({ ...cfg, autoAddLogins: true });
  assert.ok(fetched.accounts.some((a) => a.active === true && a.label === "carol@example.com (not in claude-swap)"));
  assert.ok(fetched.notices.some((n) => /Could not add carol@example\.com to claude-swap/.test(n)));
});

test("fetchClaude never runs cswap add unless auto-add is on", async () => {
  const { dir, cfg } = envWith([{ n: 1, email: "alice@example.com", org: ORG_A }]);
  setSpec(dir, "status", { stdout: json(statusOf({ email: "carol@example.com", managed: false })) });
  await fetchClaude(cfg);
  assert.ok(!calls(dir).some((c) => c[0] === "add"));
});

const APP_UUID = "11111111-2222-4333-8444-555555555555";
const SLOT1_UUID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

function loginPaths(appUuid: string | null, slots: Record<string, string>): ClaudeLoginPaths {
  const dir = tempDir();
  const paths = { cswapSequence: path.join(dir, "sequence.json"), desktopConfig: path.join(dir, "config.json") };
  const accounts = Object.fromEntries(
    Object.entries(slots).map(([n, uuid]) => [n, { email: `${n}@example.com`, uuid }]),
  );
  fs.writeFileSync(paths.cswapSequence, JSON.stringify({ accounts }));
  fs.writeFileSync(
    paths.desktopConfig,
    JSON.stringify(appUuid ? { lastKnownAccountUuid: appUuid, darkMode: "dark" } : {}),
  );
  return paths;
}

function slotAccount(slot: number, email: string): Account {
  return {
    provider: "claude",
    key: claudeKey(email, null),
    label: email,
    email,
    plan: null,
    workspace: null,
    active: slot === 1,
    status: "ok",
    windows: [],
    switchTarget: { kind: "cswap", slot },
  };
}

test("withClaudeAppAccount tags the slot the Claude app is signed in to", () => {
  const accounts = [slotAccount(1, "alice@example.com"), slotAccount(2, "bob@example.com")];
  const out = withClaudeAppAccount(accounts, loginPaths(SLOT1_UUID, { "1": SLOT1_UUID, "2": APP_UUID }));
  assert.deepEqual(
    out.map((a) => [a.email, a.inClaudeApp === true, a.needsAdd === true]),
    [
      ["alice@example.com", true, false],
      ["bob@example.com", false, false],
    ],
  );
});

test("withClaudeAppAccount adds an 'add this account' row for an untracked Claude app account", () => {
  const out = withClaudeAppAccount([slotAccount(1, "alice@example.com")], loginPaths(APP_UUID, { "1": SLOT1_UUID }));
  assert.equal(out.length, 2);
  const row = out[1];
  assert.equal(row.needsAdd, true);
  assert.equal(row.inClaudeApp, true);
  assert.equal(row.active, false);
  assert.equal(row.switchTarget, undefined, "never switchable or suggested");
  assert.equal(row.key, `claude:app|${APP_UUID}`);
});

test("withClaudeAppAccount leaves the list alone without an app login or with a tracked slot missing from the list", () => {
  const accounts = [slotAccount(1, "alice@example.com")];
  assert.deepEqual(withClaudeAppAccount(accounts, loginPaths(null, { "1": SLOT1_UUID })), accounts);
  // Slot 2 is tracked in sequence.json even though this --list did not return it.
  assert.equal(withClaudeAppAccount(accounts, loginPaths(APP_UUID, { "1": SLOT1_UUID, "2": APP_UUID })).length, 1);
});

test("claudeLogins readers accept only well-formed UUIDs and never throw", () => {
  const dir = tempDir();
  const paths = { cswapSequence: path.join(dir, "seq.json"), desktopConfig: path.join(dir, "cfg.json") };
  assert.equal(readClaudeAppAccountUuid(paths), null, "missing file");
  assert.equal(readCswapAccountUuids(paths).size, 0);
  fs.writeFileSync(paths.desktopConfig, "{not json");
  fs.writeFileSync(
    paths.cswapSequence,
    JSON.stringify({ accounts: { "1": { uuid: "nope" }, x: { uuid: SLOT1_UUID } } }),
  );
  assert.equal(readClaudeAppAccountUuid(paths), null);
  assert.equal(readCswapAccountUuids(paths).size, 0);
  fs.writeFileSync(paths.desktopConfig, JSON.stringify({ lastKnownAccountUuid: APP_UUID.toUpperCase() }));
  assert.equal(readClaudeAppAccountUuid(paths), APP_UUID);
});

/** Run the add command with fake cswap/claude/open, optionally through the terminal sh wrapper. */
async function runAddCommand(cswapScript: string | null, shell?: string): Promise<{ order: string[]; out: string }> {
  const { addClaudeAccountCommand, shellQuote } = await import("../lib/claudeLogins");
  const { spawnSync } = await import("node:child_process");
  const dir = tempDir();
  const bin = path.join(dir, "bin dir's");
  fs.mkdirSync(bin);
  const log = path.join(dir, "order.log");
  const write = (name: string, body: string) =>
    fs.writeFileSync(path.join(bin, name), `#!/bin/sh\necho "${name} $*" >> '${log}'\n${body}\n`, { mode: 0o755 });
  if (cswapScript !== null) write("cswap", cswapScript);
  write("claude", "exit 0");
  write("open", "exit 0");
  const cmd = addClaudeAccountCommand(path.join(bin, "cswap"), {
    reopenUrl: "raycast://extensions/x/ai-accounts/accounts",
  });
  const command = shell ? `/bin/sh -c ${shellQuote(cmd)}` : `alias claude='echo ALIAS >> ${log}'; ${cmd}`;
  const shellFlags = !shell || shell === "/bin/zsh" ? ["-f"] : path.basename(shell) === "fish" ? ["--no-config"] : [];
  const res = spawnSync(shell ?? "/bin/zsh", [...shellFlags, "-c", command], {
    env: { PATH: `${bin}:/usr/bin:/bin`, TERM: "dumb", HOME: dir },
    encoding: "utf8",
  });
  const order = fs.existsSync(log) ? fs.readFileSync(log, "utf8").trim().split("\n").filter(Boolean) : [];
  return { order, out: res.stdout };
}

test("add command: saves the current login, signs in, adds, then reopens AI Accounts (alias bypassed)", async () => {
  const { order, out } = await runAddCommand("exit 0");
  assert.deepEqual(order, [
    "cswap add",
    "claude auth login",
    "cswap add",
    "open raycast://extensions/x/ai-accounts/accounts",
  ]);
  assert.match(out, /Done\. The new account is now the active Claude Code login/);
});

test("add command: never signs in when the current login cannot be saved", async () => {
  const { order, out } = await runAddCommand(
    `echo "Error: The stored credential rotated while it was being verified"; exit 1`,
  );
  assert.deepEqual(order, ["cswap add"]);
  assert.match(
    out,
    /Could not save your current Claude login, so nothing was changed:\s+Error: The stored credential rotated/,
  );
});

for (const shell of ["/bin/sh", "/bin/zsh", "fish"]) {
  test(`add command: sh wrapper fails closed under ${shell}`, async (t) => {
    let shellPath = shell;
    if (shell === "fish") {
      const { spawnSync } = await import("node:child_process");
      const found = spawnSync("/bin/sh", ["-c", "command -v fish"], { encoding: "utf8" });
      if (found.status !== 0 || !path.isAbsolute(found.stdout.trim())) {
        t.skip("fish is not installed");
        return;
      }
      shellPath = found.stdout.trim();
    }
    const { order, out } = await runAddCommand(
      `echo "Error: The stored credential rotated while it was being verified"; exit 1`,
      shellPath,
    );
    assert.deepEqual(order, ["cswap add"]);
    assert.match(
      out,
      /Could not save your current Claude login, so nothing was changed:\s+Error: The stored credential rotated/,
    );
  });
}

test("add command: with no current login it goes straight to sign-in", async () => {
  const { order } = await runAddCommand(
    `case "$1" in add) if [ -f "$0.saved" ]; then exit 0; fi; touch "$0.saved"; echo "Error: No active Claude account found. Please log in first."; exit 1;; esac`,
  );
  assert.deepEqual(order.slice(0, 3), ["cswap add", "claude auth login", "cswap add"]);
});

test("add command: never signs in when claude-swap is missing", async () => {
  const { order, out } = await runAddCommand(null);
  assert.deepEqual(order, []);
  assert.match(out, /claude-swap was not found/);
});

test("add command: a failed sign-in does not report success or reopen", async () => {
  const { addClaudeAccountCommand } = await import("../lib/claudeLogins");
  assert.ok(addClaudeAccountCommand("/x/cswap").includes("your saved accounts are unchanged"));
  const dir = tempDir();
  const bin = path.join(dir, "bin");
  fs.mkdirSync(bin);
  const log = path.join(dir, "order.log");
  for (const [name, body] of [
    ["cswap", "exit 0"],
    ["claude", "exit 1"],
    ["open", "exit 0"],
  ]) {
    fs.writeFileSync(path.join(bin, name), `#!/bin/sh\necho "${name} $*" >> '${log}'\n${body}\n`, { mode: 0o755 });
  }
  const { spawnSync } = await import("node:child_process");
  const res = spawnSync(
    "/bin/zsh",
    ["-f", "-c", addClaudeAccountCommand(path.join(bin, "cswap"), { reopenUrl: "x" })],
    {
      env: { PATH: `${bin}:/usr/bin:/bin`, TERM: "dumb", HOME: dir },
      encoding: "utf8",
    },
  );
  assert.deepEqual(fs.readFileSync(log, "utf8").trim().split("\n"), ["cswap add", "claude auth login"]);
  assert.match(res.stdout, /did not finish/);
});

// Review round 2: auto-add memory, back-off, subscription check, and signed-out app detection.

function autoAddEnv(authStatus?: Record<string, unknown>) {
  const { dir, cfg } = envWith([{ n: 1, email: "alice@example.com", org: ORG_A }]);
  setSpec(dir, "status", { stdout: json(statusOf({ email: "carol@example.com", managed: false })) });
  const stateFile = path.join(dir, "auto-add.json");
  let claudePath: string | undefined;
  if (authStatus) {
    const cdir = tempDir();
    claudePath = installFake(cdir, "claude");
    setSpec(cdir, "other", { stdout: json(authStatus) });
  }
  return { dir, cfg: { ...cfg, autoAddLogins: true, autoAddStatePath: stateFile, claudePath }, stateFile };
}

test("auto-add never re-adds an account the user removed from claude-swap", async () => {
  const { dir, cfg, stateFile } = autoAddEnv();
  fs.writeFileSync(stateFile, JSON.stringify({ tracked: ["carol@example.com"], failures: {} }));
  const fetched = await fetchClaude(cfg);
  assert.ok(!calls(dir).some((c) => c[0] === "add"));
  assert.ok(fetched.notices.some((n) => /carol@example\.com was removed from claude-swap/.test(n)));
  assert.ok(
    fetched.accounts.some((a) => a.active === true && a.email === "carol@example.com"),
    "still shown",
  );
});

test("auto-add backs off for 30 min after a failure and shows the last error", async () => {
  const { dir, cfg, stateFile } = autoAddEnv();
  setSpec(dir, "other", { stdout: "", exit: 1 });
  await fetchClaude(cfg);
  assert.equal(calls(dir).filter((c) => c[0] === "add").length, 1);
  const again = await fetchClaude(cfg);
  assert.equal(calls(dir).filter((c) => c[0] === "add").length, 1, "no retry inside the back-off");
  assert.ok(again.notices.some((n) => /Could not add carol@example\.com.*retry after 30 min/.test(n)));
  assert.ok(readJson(stateFile).failures["carol@example.com"]);
});

test("auto-add skips a Console/API-key login and a login that changed while checking", async () => {
  const consoleEnv = autoAddEnv({ loggedIn: true, authMethod: "console", email: "carol@example.com" });
  const c = await fetchClaude(consoleEnv.cfg);
  assert.ok(!calls(consoleEnv.dir).some((x) => x[0] === "add"));
  assert.ok(c.notices.some((n) => /with console; claude-swap tracks Claude subscription logins only/.test(n)));
  const moved = autoAddEnv({ loggedIn: true, authMethod: "claude.ai", email: "dave@example.com" });
  const m = await fetchClaude(moved.cfg);
  assert.ok(!calls(moved.dir).some((x) => x[0] === "add"));
  assert.ok(m.notices.some((n) => /login changed while checking/.test(n)));
});

test("auto-add of a confirmed subscription login remembers it and passes on cswap's verification warning", async () => {
  const { dir, cfg, stateFile } = autoAddEnv({ loggedIn: true, authMethod: "claude.ai", email: "carol@example.com" });
  setSpec(dir, "other", {
    stdout: "Notice: could not verify that the stored credential belongs to carol@example.com\nAdded Account 2\n",
    then: {
      list: {
        stdout: json(
          listOf([
            { n: 1, email: "alice@example.com", org: ORG_A },
            { n: 2, email: "carol@example.com", org: ORG_B, active: true },
          ]),
        ),
      },
    },
  });
  const fetched = await fetchClaude(cfg);
  assert.ok(fetched.notices.some((n) => /could not verify the saved login for carol@example\.com/.test(n)));
  assert.deepEqual(readJson(stateFile).tracked.sort(), ["alice@example.com", "carol@example.com"]);
});

test("a signed-out Claude app counts as no app account", () => {
  const dir = tempDir();
  const paths = { cswapSequence: path.join(dir, "seq.json"), desktopConfig: path.join(dir, "cfg.json") };
  fs.writeFileSync(
    paths.desktopConfig,
    JSON.stringify({ lastKnownAccountUuid: APP_UUID, windowSizeWasSignedIn: false }),
  );
  assert.equal(readClaudeAppAccountUuid(paths), null);
});

function readJson(file: string): { tracked: string[]; failures: Record<string, unknown> } {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
