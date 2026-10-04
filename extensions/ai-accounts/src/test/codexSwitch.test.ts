import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  codexDaemonControl,
  CodexSwitchOptions,
  DaemonControl,
  preflightCodexSwitch,
  switchCodexDirect,
} from "../lib/codexSwitch";
import { SwitchRequest } from "../lib/model";

// All credentials below are fake JWTs built here; nothing reads real user state.

const NOW = Date.parse("2026-09-29T12:00:00.000Z");
const MIN = 60_000;

function b64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function fakeJwt(payload: Record<string, unknown>): string {
  return `${b64url({ alg: "none", typ: "JWT" })}.${b64url(payload)}.fakesig`;
}

interface AuthSpec {
  email: string;
  accountId: string;
  tag: string;
  accessExpMs?: number;
  lastRefreshMs?: number;
  authMode?: string;
}

function authBytes(spec: AuthSpec): Buffer {
  const exp = Math.floor((spec.accessExpMs ?? NOW + 120 * MIN) / 1000);
  const body = {
    OPENAI_API_KEY: null,
    auth_mode: spec.authMode ?? "chatgpt",
    tokens: {
      id_token: fakeJwt({
        email: spec.email,
        "https://api.openai.com/auth": { chatgpt_account_id: spec.accountId },
        exp,
      }),
      access_token: fakeJwt({ exp, tag: spec.tag }),
      refresh_token: `fake-refresh-${spec.tag}`,
      account_id: spec.accountId,
    },
    last_refresh: new Date(spec.lastRefreshMs ?? NOW - 60 * MIN).toISOString(),
  };
  return Buffer.from(JSON.stringify(body, null, 2));
}

const ALICE = { email: "alice@example.com", accountId: "acct-alice" };
const CAROL = { email: "carol@school.example.edu", accountId: "acct-carol-edu" };
const BOB = { email: "bob@example.com", accountId: "acct-bob" };

class FakeDaemon implements DaemonControl {
  calls: string[] = [];
  running = true;
  failIsRunning = false;
  failStop = false;
  /** stop() takes the daemon down and still fails (a stop error after the signals landed). */
  failStopAfterKill = false;
  failStart = false;
  onStop?: () => void;
  onStart?: () => void;
  async isRunning(): Promise<boolean> {
    this.calls.push("isRunning");
    if (this.failIsRunning) throw new Error("status probe exploded");
    return this.running;
  }
  async stop(): Promise<void> {
    this.calls.push("stop");
    if (this.failStop) throw new Error("stop exploded");
    if (this.failStopAfterKill) {
      this.running = false;
      throw new Error("stop timed out");
    }
    this.onStop?.();
    this.running = false;
  }
  async start(): Promise<void> {
    this.calls.push("start");
    if (this.failStart) throw new Error("start exploded");
    this.onStart?.();
    this.running = true;
  }
}

interface Env {
  root: string;
  codexHome: string;
  supportDir: string;
  liveFile: string;
  aliceHome: string;
  carolHome: string;
  bobHome: string;
  storeFile: string;
  daemon: FakeDaemon;
  opts(extra?: Partial<CodexSwitchOptions>): CodexSwitchOptions;
  req(extra?: Partial<SwitchRequest>): SwitchRequest;
  snapshot(): Record<string, Buffer | null>;
}

interface SetupOptions {
  live?: Buffer;
  carol?: Buffer;
  aliceSaved?: Buffer | null;
  manageAlice?: boolean;
  config?: string;
}

function setup(o: SetupOptions = {}): Env {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codexswitch-test-"));
  const codexHome = path.join(root, "dot-codex");
  const supportDir = path.join(root, "CodexBar");
  const homes = path.join(supportDir, "managed-codex-homes");
  const aliceHome = path.join(homes, "AAAA-ALICE");
  const carolHome = path.join(homes, "CCCC-CAROL");
  const bobHome = path.join(homes, "BBBB-BOB");
  for (const dir of [codexHome, aliceHome, carolHome, bobHome]) fs.mkdirSync(dir, { recursive: true });
  const liveFile = path.join(codexHome, "auth.json");
  // 0644 on purpose: the switch must publish 0600 files.
  fs.writeFileSync(liveFile, o.live ?? authBytes({ ...ALICE, tag: "alice-live" }), { mode: 0o644 });
  if (o.aliceSaved !== null) {
    fs.writeFileSync(
      path.join(aliceHome, "auth.json"),
      o.aliceSaved ?? authBytes({ ...ALICE, tag: "alice-old", accessExpMs: NOW - 24 * 60 * MIN }),
      { mode: 0o644 },
    );
  }
  fs.writeFileSync(
    path.join(carolHome, "auth.json"),
    o.carol ?? authBytes({ ...CAROL, tag: "carol", accessExpMs: NOW + 180 * MIN, lastRefreshMs: NOW - 120 * MIN }),
    { mode: 0o600 },
  );
  fs.writeFileSync(path.join(bobHome, "auth.json"), authBytes({ ...BOB, tag: "bob" }), { mode: 0o600 });
  if (o.config !== undefined) fs.writeFileSync(path.join(codexHome, "config.toml"), o.config);
  const entry = (who: { email: string; accountId: string }, home: string, label: string) => ({
    id: `id-${label}`,
    email: who.email.toUpperCase(), // CodexBar normalizes; matching must be case-insensitive
    providerAccountID: who.accountId,
    workspaceLabel: label,
    workspaceAccountID: who.accountId,
    authFingerprint: "0".repeat(64),
    managedHomePath: home,
    createdAt: 1,
    updatedAt: 1,
    lastAuthenticatedAt: 1,
  });
  const accounts = [entry(BOB, bobHome, "Personal"), entry(CAROL, carolHome, "Example University Pro (Edu)")];
  if (o.manageAlice !== false) accounts.push(entry(ALICE, aliceHome, "Personal"));
  const storeFile = path.join(supportDir, "managed-codex-accounts.json");
  fs.writeFileSync(storeFile, JSON.stringify({ version: 3, accounts }, null, 2));
  const daemon = new FakeDaemon();
  const files = {
    live: liveFile,
    alice: path.join(aliceHome, "auth.json"),
    carol: path.join(carolHome, "auth.json"),
    bob: path.join(bobHome, "auth.json"),
    store: storeFile,
  };
  return {
    root,
    codexHome,
    supportDir,
    liveFile,
    aliceHome,
    carolHome,
    bobHome,
    storeFile,
    daemon,
    opts: (extra = {}) => ({
      paths: { codexHome, codexbarSupportDir: supportDir },
      daemon,
      nowMs: () => NOW,
      managedHomePath: carolHome,
      settleMs: 0,
      ...extra,
    }),
    req: (extra = {}) => ({
      requestId: "req-1",
      provider: "codex",
      targetKey: "codex:carol@school.example.edu|Example University Pro (Edu)",
      expectedEmail: "Carol@School.example.edu",
      targetLabel: "carol (Edu)",
      via: "list",
      ...extra,
    }),
    snapshot: () =>
      Object.fromEntries(
        Object.entries(files).map(([k, f]) => [k, fs.existsSync(f) ? fs.readFileSync(f) : null]),
      ) as Record<string, Buffer | null>,
  };
}

function mode(file: string): number {
  return fs.statSync(file).mode & 0o777;
}

function cleanup(env: Env): void {
  fs.rmSync(env.root, { recursive: true, force: true });
}

async function refusedUntouched(env: Env, opts: CodexSwitchOptions, pattern: RegExp): Promise<void> {
  const before = env.snapshot();
  const result = await switchCodexDirect(env.req(), opts);
  assert.equal(result.state, "failed");
  assert.match(result.message, pattern);
  assert.equal("activeKey" in result, false);
  assert.deepEqual(env.snapshot(), before);
  assert.deepEqual(env.daemon.calls, []);
  const pre = preflightCodexSwitch(env.req(), opts);
  assert.equal(pre.ok, false);
}

test("happy path: preserves live, promotes target, stop before swap, start after", async () => {
  const env = setup({ config: 'model = "gpt-6"\ncli_auth_credentials_store = "file"\n' });
  try {
    const before = env.snapshot();
    const seen: Record<string, Buffer> = {};
    env.daemon.onStop = () => (seen.atStop = fs.readFileSync(env.liveFile));
    env.daemon.onStart = () => (seen.atStart = fs.readFileSync(env.liveFile));
    const result = await switchCodexDirect(env.req(), env.opts());
    assert.equal(result.state, "succeeded", result.message);
    assert.equal(result.activeKey, env.req().targetKey);
    assert.match(result.message, /^Codex → carol \(Edu\)\. New Codex sessions use it now/);
    assert.deepEqual(env.daemon.calls, ["isRunning", "stop", "start"]);
    // Daemon was stopped while the old login was still live and started on the new one.
    assert.ok(seen.atStop.equals(before.live!));
    assert.ok(seen.atStart.equals(before.carol!));
    const after = env.snapshot();
    assert.ok(after.live!.equals(before.carol!), "live now holds the target bytes");
    assert.ok(after.alice!.equals(before.live!), "displaced home holds the old live bytes");
    assert.ok(after.carol!.equals(before.carol!), "target's managed copy is left in place");
    assert.ok(after.bob!.equals(before.bob!));
    assert.ok(after.store!.equals(before.store!), "managed-codex-accounts.json is never written");
    assert.equal(mode(env.liveFile), 0o600);
    assert.equal(mode(path.join(env.aliceHome, "auth.json")), 0o600);
    // No temp files left behind.
    assert.deepEqual(fs.readdirSync(env.codexHome).sort(), ["auth.json", "config.toml"]);
    assert.deepEqual(fs.readdirSync(env.aliceHome), ["auth.json"]);
  } finally {
    cleanup(env);
  }
});

test("daemon not running: swaps without stop/start", async () => {
  const env = setup();
  try {
    env.daemon.running = false;
    const result = await switchCodexDirect(env.req(), env.opts());
    assert.equal(result.state, "succeeded", result.message);
    assert.deepEqual(env.daemon.calls, ["isRunning"]);
  } finally {
    cleanup(env);
  }
});

test("preflight plan describes the switch and carries no token material", () => {
  const env = setup();
  try {
    const pre = preflightCodexSwitch(env.req(), env.opts());
    assert.equal(pre.ok, true);
    if (!pre.ok) return;
    assert.equal(pre.plan.noop, false);
    assert.equal(pre.plan.liveEmail, ALICE.email);
    assert.equal(pre.plan.targetEmail, CAROL.email);
    assert.equal(pre.plan.displacedHomePath, env.aliceHome);
    assert.equal(pre.plan.targetHomePath, env.carolHome);
    assert.equal(pre.plan.liveTokenExpiresAt, new Date(NOW + 120 * MIN).toISOString());
    const text = JSON.stringify(pre);
    assert.doesNotMatch(text, /fake-refresh|fakesig|eyJ/);
    assert.deepEqual(env.daemon.calls, []);
  } finally {
    cleanup(env);
  }
});

test("noop when the target is the live account", async () => {
  const env = setup();
  try {
    const before = env.snapshot();
    const opts = env.opts({ managedHomePath: env.aliceHome + "/" });
    const req = env.req({ expectedEmail: ALICE.email, targetLabel: "alice", targetKey: "codex:alice@example.com|" });
    const result = await switchCodexDirect(req, opts);
    assert.equal(result.state, "noop");
    assert.deepEqual(env.daemon.calls, []);
    assert.deepEqual(env.snapshot(), before);
    const pre = preflightCodexSwitch(req, opts);
    assert.ok(pre.ok && pre.plan.noop);
  } finally {
    cleanup(env);
  }
});

test("refuses when the live account is not managed by CodexBar", async () => {
  const env = setup({ manageAlice: false });
  try {
    await refusedUntouched(
      env,
      env.opts(),
      /^Your current Codex account \(alice@example\.com\) is not saved in CodexBar yet\. Switch once from CodexBar's menu \(System Account\)/,
    );
  } finally {
    cleanup(env);
  }
});

test("refuses when the store is missing entirely", async () => {
  const env = setup();
  try {
    fs.rmSync(env.storeFile);
    await refusedUntouched(env, env.opts(), /is not saved in CodexBar yet/);
  } finally {
    cleanup(env);
  }
});

test("refuses a symlinked live auth.json", async () => {
  const env = setup();
  try {
    const real = path.join(env.root, "elsewhere.json");
    fs.renameSync(env.liveFile, real);
    fs.symlinkSync(real, env.liveFile);
    await refusedUntouched(env, env.opts(), /symlink/);
  } finally {
    cleanup(env);
  }
});

test("refuses keyring / auto credential stores", async () => {
  for (const config of ['cli_auth_credentials_store = "keyring"\n', "cli_auth_credentials_store='auto' # x\n"]) {
    const env = setup({ config });
    try {
      await refusedUntouched(env, env.opts(), /credential store/);
    } finally {
      cleanup(env);
    }
  }
  // A commented-out line does not count.
  const env = setup({ config: '# cli_auth_credentials_store = "keyring"\n' });
  try {
    assert.equal(preflightCodexSwitch(env.req(), env.opts()).ok, true);
  } finally {
    cleanup(env);
  }
});

test("refuses API-key logins", async () => {
  const env = setup({ live: Buffer.from(JSON.stringify({ OPENAI_API_KEY: "sk-fake", auth_mode: "apikey" })) });
  try {
    await refusedUntouched(env, env.opts(), /not a ChatGPT login/);
  } finally {
    cleanup(env);
  }
});

test("refuses when the live token expires within 10 minutes or already expired", async () => {
  const soon = setup({ live: authBytes({ ...ALICE, tag: "a", accessExpMs: NOW + 5 * MIN + 30_000 }) });
  try {
    await refusedUntouched(
      soon,
      soon.opts(),
      /Codex is refreshing its login right now \(token expires in 5 min\); try again in a minute/,
    );
  } finally {
    cleanup(soon);
  }
  const expired = setup({ live: authBytes({ ...ALICE, tag: "a", accessExpMs: NOW - MIN }) });
  try {
    await refusedUntouched(expired, expired.opts(), /has expired/);
  } finally {
    cleanup(expired);
  }
  // Exactly at the boundary (10 min) is still refused.
  const edge = setup({ live: authBytes({ ...ALICE, tag: "a", accessExpMs: NOW + 10 * MIN }) });
  try {
    await refusedUntouched(edge, edge.opts(), /expires in 10 min/);
  } finally {
    cleanup(edge);
  }
});

test("refuses when the target token expires within 10 minutes", async () => {
  const env = setup({ carol: authBytes({ ...CAROL, tag: "c", accessExpMs: NOW + 3 * MIN }) });
  try {
    await refusedUntouched(
      env,
      env.opts(),
      /^carol \(Edu\) login token expires in 3 min; open Codex with that account once or wait/,
    );
  } finally {
    cleanup(env);
  }
});

test("refuses when Codex refreshed its login less than 60 s ago", async () => {
  const env = setup({ live: authBytes({ ...ALICE, tag: "a", lastRefreshMs: NOW - 30_000 }) });
  try {
    await refusedUntouched(env, env.opts(), /refreshed its login 30 s ago/);
  } finally {
    cleanup(env);
  }
});

test("refuses when the expected email does not match the target", async () => {
  const env = setup();
  try {
    const before = env.snapshot();
    const result = await switchCodexDirect(env.req({ expectedEmail: "mallory@example.com" }), env.opts());
    assert.equal(result.state, "failed");
    assert.match(result.message, /not mallory@example\.com/);
    assert.deepEqual(env.snapshot(), before);
    assert.deepEqual(env.daemon.calls, []);
  } finally {
    cleanup(env);
  }
});

test("refuses when the target's saved file holds another account than its store entry", async () => {
  const env = setup({ carol: authBytes({ ...BOB, tag: "imposter" }) });
  try {
    await refusedUntouched(env, env.opts(), /saved login is for bob@example\.com, not carol@school\.example\.edu/);
  } finally {
    cleanup(env);
  }
});

test("refuses when the target's saved file is for another workspace", async () => {
  const env = setup({ carol: authBytes({ email: CAROL.email, accountId: "acct-other-ws", tag: "c" }) });
  try {
    await refusedUntouched(env, env.opts(), /different workspace/);
  } finally {
    cleanup(env);
  }
});

test("refuses a target path that is not in CodexBar's store", async () => {
  const env = setup();
  try {
    const stray = path.join(env.root, "stray-home");
    fs.mkdirSync(stray);
    fs.copyFileSync(path.join(env.carolHome, "auth.json"), path.join(stray, "auth.json"));
    await refusedUntouched(env, env.opts({ managedHomePath: stray }), /not in CodexBar's saved accounts/);
  } finally {
    cleanup(env);
  }
});

test("refuses when the displaced home holds a different account", async () => {
  const env = setup({ aliceSaved: authBytes({ ...BOB, tag: "wrong" }) });
  try {
    await refusedUntouched(env, env.opts(), /saved home for alice@example\.com holds bob@example\.com/);
  } finally {
    cleanup(env);
  }
});

test("repairs a missing displaced auth.json like CodexBar's repairExisting", async () => {
  const env = setup({ aliceSaved: null });
  try {
    const before = env.snapshot();
    const result = await switchCodexDirect(env.req(), env.opts());
    assert.equal(result.state, "succeeded", result.message);
    assert.ok(fs.readFileSync(path.join(env.aliceHome, "auth.json")).equals(before.live!));
  } finally {
    cleanup(env);
  }
});

test("refuses an unsupported store version", async () => {
  const env = setup();
  try {
    const store = JSON.parse(fs.readFileSync(env.storeFile, "utf8"));
    store.version = 4;
    fs.writeFileSync(env.storeFile, JSON.stringify(store));
    await refusedUntouched(env, env.opts(), /version 4 is not supported/);
  } finally {
    cleanup(env);
  }
});

test("daemon stop failure refuses and touches nothing", async () => {
  const env = setup();
  try {
    env.daemon.failStop = true;
    const before = env.snapshot();
    const result = await switchCodexDirect(env.req(), env.opts());
    assert.equal(result.state, "failed");
    assert.match(result.message, /Could not stop the Codex daemon: stop exploded\. Nothing was switched\./);
    // The daemon is re-probed and its state reported (it is still up, so it is not started again).
    assert.match(result.message, /The daemon is still running\.$/);
    assert.deepEqual(env.daemon.calls, ["isRunning", "stop", "isRunning"]);
    assert.deepEqual(env.snapshot(), before);
  } finally {
    cleanup(env);
  }
});

test("daemon status failure refuses and touches nothing", async () => {
  const env = setup();
  try {
    env.daemon.failIsRunning = true;
    const before = env.snapshot();
    const result = await switchCodexDirect(env.req(), env.opts());
    assert.equal(result.state, "failed");
    assert.deepEqual(env.daemon.calls, ["isRunning"]);
    assert.deepEqual(env.snapshot(), before);
  } finally {
    cleanup(env);
  }
});

test("re-validates after stopping the daemon (it refreshed while draining)", async () => {
  const env = setup();
  try {
    env.daemon.onStop = () =>
      fs.writeFileSync(env.liveFile, authBytes({ ...ALICE, tag: "alice-drain", lastRefreshMs: NOW - 5_000 }));
    const result = await switchCodexDirect(env.req(), env.opts());
    assert.equal(result.state, "failed");
    assert.match(result.message, /refreshed its login 5 s ago/);
    assert.deepEqual(env.daemon.calls, ["isRunning", "stop", "start"]);
    const after = env.snapshot();
    assert.match(after.live!.toString(), /alice/); // untouched by us
    assert.ok(after.live!.equals(authBytes({ ...ALICE, tag: "alice-drain", lastRefreshMs: NOW - 5_000 })));
  } finally {
    cleanup(env);
  }
});

test("race: live rewritten once after the displaced save -> newer bytes preserved, switch proceeds", async () => {
  const env = setup();
  try {
    const before = env.snapshot();
    const refreshed = authBytes({ ...ALICE, tag: "alice-refreshed", accessExpMs: NOW + 300 * MIN });
    const result = await switchCodexDirect(
      env.req(),
      env.opts({
        hooks: {
          afterDisplacedWrite: (attempt) => {
            if (attempt === 1) fs.writeFileSync(env.liveFile, refreshed);
          },
        },
      }),
    );
    assert.equal(result.state, "succeeded", result.message);
    const after = env.snapshot();
    assert.ok(after.alice!.equals(refreshed), "displaced home holds the refreshed live bytes");
    assert.ok(after.live!.equals(before.carol!));
  } finally {
    cleanup(env);
  }
});

test("race: live keeps changing -> failed, live untouched, daemon restarted", async () => {
  const env = setup();
  try {
    let n = 0;
    let lastWritten: Buffer | null = null;
    const result = await switchCodexDirect(
      env.req(),
      env.opts({
        hooks: {
          afterDisplacedWrite: () => {
            n += 1;
            lastWritten = authBytes({ ...ALICE, tag: `alice-churn-${n}` });
            fs.writeFileSync(env.liveFile, lastWritten);
          },
        },
      }),
    );
    assert.equal(result.state, "failed");
    assert.equal(result.message, "Codex rewrote its login during the switch; nothing was switched. Try again.");
    assert.equal(n, 2);
    assert.ok(fs.readFileSync(env.liveFile).equals(lastWritten!), "live file is whatever Codex wrote last");
    // The displaced home holds a complete login of the live account (the first rewrite), never a torn one.
    assert.ok(
      fs.readFileSync(path.join(env.aliceHome, "auth.json")).equals(authBytes({ ...ALICE, tag: "alice-churn-1" })),
    );
    assert.deepEqual(env.daemon.calls, ["isRunning", "stop", "start"]);
  } finally {
    cleanup(env);
  }
});

test("race: torn live read is never copied into the displaced home", async () => {
  const env = setup();
  try {
    const before = env.snapshot();
    const result = await switchCodexDirect(
      env.req(),
      env.opts({
        hooks: {
          afterDisplacedWrite: (attempt) => {
            if (attempt === 1) fs.writeFileSync(env.liveFile, '{"tokens": {"id_to');
          },
        },
      }),
    );
    assert.equal(result.state, "failed");
    assert.ok(fs.readFileSync(path.join(env.aliceHome, "auth.json")).equals(before.live!));
  } finally {
    cleanup(env);
  }
});

test("target refreshed between reads: new valid bytes are promoted", async () => {
  const env = setup();
  try {
    const refreshedCarol = authBytes({ ...CAROL, tag: "carol-refreshed", accessExpMs: NOW + 400 * MIN });
    const result = await switchCodexDirect(
      env.req(),
      env.opts({
        hooks: {
          afterDisplacedWrite: (attempt) => {
            if (attempt === 1) fs.writeFileSync(path.join(env.carolHome, "auth.json"), refreshedCarol);
          },
        },
      }),
    );
    assert.equal(result.state, "succeeded", result.message);
    assert.ok(fs.readFileSync(env.liveFile).equals(refreshedCarol));
  } finally {
    cleanup(env);
  }
});

test("target replaced by another account between reads: failed, live untouched", async () => {
  const env = setup();
  try {
    const before = env.snapshot();
    const result = await switchCodexDirect(
      env.req(),
      env.opts({
        hooks: {
          afterDisplacedWrite: () =>
            fs.writeFileSync(path.join(env.carolHome, "auth.json"), authBytes({ ...BOB, tag: "x" })),
        },
      }),
    );
    assert.equal(result.state, "failed");
    assert.match(result.message, /saved login changed during the switch/);
    assert.ok(fs.readFileSync(env.liveFile).equals(before.live!));
    assert.deepEqual(env.daemon.calls, ["isRunning", "stop", "start"]);
  } finally {
    cleanup(env);
  }
});

test("verification failure -> unknown, no rollback", async () => {
  const env = setup();
  try {
    const before = env.snapshot();
    const result = await switchCodexDirect(
      env.req(),
      env.opts({
        // Simulate a stale Codex process writing the old account back right after the swap.
        hooks: { afterLiveWrite: () => fs.writeFileSync(env.liveFile, before.live!) },
      }),
    );
    assert.equal(result.state, "unknown");
    assert.equal("activeKey" in result, false);
    assert.match(result.message, /holds alice@example\.com, not carol@school\.example\.edu/);
    assert.match(result.message, /saved copy of alice@example\.com is intact/);
    assert.match(result.message, /Nothing was rolled back/);
    assert.equal(result.warning, undefined, "a refresh may confirm the live side; nothing else to warn about");
    assert.ok(fs.readFileSync(env.liveFile).equals(before.live!), "no automatic rollback or retry");
    assert.deepEqual(env.daemon.calls, ["isRunning", "stop", "start"]);
  } finally {
    cleanup(env);
  }
});

test("daemon start failure -> succeeded with a note", async () => {
  const env = setup();
  try {
    env.daemon.failStart = true;
    const result = await switchCodexDirect(env.req(), env.opts());
    assert.equal(result.state, "succeeded");
    assert.equal(result.activeKey, env.req().targetKey);
    assert.match(
      result.message,
      /Codex daemon did not restart: start exploded; it starts with the next codex launch\./,
    );
    assert.deepEqual(env.daemon.calls, ["isRunning", "stop", "start"]);
  } finally {
    cleanup(env);
  }
});

test("rejects non-codex requests without touching anything", async () => {
  const env = setup();
  try {
    const before = env.snapshot();
    const result = await switchCodexDirect(env.req({ provider: "claude" }), env.opts());
    assert.equal(result.state, "failed");
    assert.deepEqual(env.snapshot(), before);
    assert.deepEqual(env.daemon.calls, []);
  } finally {
    cleanup(env);
  }
});

// ---------------------------------------------------------------------------
// codexDaemonControl against a fake `codex` script

function fakeCodex(dir: string, script: string): string {
  const file = path.join(dir, "codex");
  fs.writeFileSync(file, `#!/bin/sh\n${script}\n`, { mode: 0o755 });
  return file;
}

test("codexDaemonControl: running daemon, stop failure carries sanitized stderr, start ok", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codexswitch-cli-"));
  try {
    const codex = fakeCodex(
      dir,
      [
        'case "$3" in',
        '  version) echo \'{"status":"running","backend":"pid","socketPath":"/x"}\' ;;',
        '  stop) printf "daemon\\tbusy\\n" >&2; exit 3 ;;',
        '  start) echo \'{"status":"started"}\' ;;',
        "esac",
      ].join("\n"),
    );
    const control = codexDaemonControl(codex, { codexHome: path.join(dir, "home") });
    assert.equal(await control.isRunning(), true);
    await assert.rejects(control.stop(), /codex app-server daemon stop failed: daemon busy/);
    await control.start();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("codexDaemonControl: nonzero version means not running; garbage output throws", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codexswitch-cli-"));
  try {
    // An isolated home with no pid records: nothing recorded as running.
    const home = { codexHome: path.join(dir, "home") };
    const down = codexDaemonControl(fakeCodex(dir, 'echo "error: no daemon" >&2; exit 1'), home);
    assert.equal(await down.isRunning(), false);
    const stopped = codexDaemonControl(fakeCodex(dir, 'echo \'{"status":"notRunning"}\''), home);
    assert.equal(await stopped.isRunning(), false);
    const garbage = codexDaemonControl(fakeCodex(dir, "echo hello"), home);
    await assert.rejects(garbage.isRunning(), /unexpected output/);
    const relative = codexDaemonControl("codex", home);
    await assert.rejects(relative.isRunning(), /must be absolute/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Review regressions

/** A login file with full control over which identity fields exist (all token values are fake). */
function rawAuth(o: {
  email?: string;
  claimAccountId?: string;
  accountId?: string | null;
  authMode?: string | null;
  apiKey?: string;
  tokens?: boolean;
}): Buffer {
  const exp = Math.floor((NOW + 120 * MIN) / 1000);
  const claims: Record<string, unknown> = { exp };
  if (o.email) claims.email = o.email;
  if (o.claimAccountId) claims["https://api.openai.com/auth"] = { chatgpt_account_id: o.claimAccountId };
  const body: Record<string, unknown> = {
    OPENAI_API_KEY: o.apiKey ?? null,
    last_refresh: new Date(NOW - 60 * MIN).toISOString(),
  };
  if (o.authMode !== undefined) body.auth_mode = o.authMode;
  if (o.tokens === false) body.tokens = null;
  else {
    body.tokens = {
      id_token: fakeJwt(claims),
      access_token: fakeJwt({ exp, tag: "other" }),
      refresh_token: "fake-refresh-ONLY-COPY",
      account_id: o.accountId === undefined ? null : o.accountId,
    };
  }
  return Buffer.from(JSON.stringify(body));
}

const DAVE = { email: "dave@example.com", accountId: "acct-dave" };

test("finding 3: displaced home holding another login in a shape parseAuth rejects is refused, not overwritten", async () => {
  const shapes: [string, Buffer, RegExp][] = [
    // codex writes account_id: null when the id_token has no chatgpt_account_id claim
    [
      "account_id null, no claim",
      rawAuth({ email: DAVE.email, accountId: null, authMode: "chatgpt" }),
      /holds dave@example\.com instead/,
    ],
    [
      "account_id null, claim only",
      rawAuth({ email: DAVE.email, claimAccountId: DAVE.accountId, authMode: "chatgpt" }),
      /holds dave@example\.com instead/,
    ],
    [
      "no email claim",
      rawAuth({ accountId: DAVE.accountId, claimAccountId: DAVE.accountId }),
      /holds a login for another workspace instead/,
    ],
    [
      "no email, no account id",
      rawAuth({ accountId: null, authMode: "chatgpt" }),
      /holds a login without a workspace id instead/,
    ],
    [
      "API-key login",
      rawAuth({ apiKey: "sk-fake-not-real", authMode: "apikey", tokens: false }),
      /holds an API-key login instead/,
    ],
    [
      "other auth mode with tokens",
      rawAuth({ email: ALICE.email, accountId: ALICE.accountId, authMode: "chatgptAuthTokens" }),
      /holds a non-ChatGPT login \(auth mode chatgptAuthTokens\) instead/,
    ],
  ];
  for (const [name, bytes, pattern] of shapes) {
    const env = setup({ aliceSaved: bytes });
    try {
      await refusedUntouched(env, env.opts(), pattern);
      assert.ok(fs.readFileSync(path.join(env.aliceHome, "auth.json")).equals(bytes), `${name}: bytes unchanged`);
    } finally {
      cleanup(env);
    }
  }
});

test("finding 3: the live account's own login in a lenient shape, or a file with no login, is repaired", async () => {
  const repairable: [string, Buffer][] = [
    // Same account: account id from the claim, email absent. CodexBar matches it, so the save may overwrite it.
    ["same account, claim id only", rawAuth({ claimAccountId: ALICE.accountId, authMode: "chatgpt" })],
    ["same account, no email", rawAuth({ accountId: ALICE.accountId })],
    // Nothing CodexBar can read a login from: not an object, or no API key and no access+refresh tokens.
    ["not an object", Buffer.from("[1,2]")],
    ["tokens without refresh", Buffer.from(JSON.stringify({ tokens: { access_token: "a", refresh_token: " " } }))],
    ["empty object", Buffer.from("{}")],
  ];
  for (const [name, bytes] of repairable) {
    const env = setup({ aliceSaved: bytes });
    try {
      const before = env.snapshot();
      const result = await switchCodexDirect(env.req(), env.opts());
      assert.equal(result.state, "succeeded", `${name}: ${result.message}`);
      assert.ok(fs.readFileSync(path.join(env.aliceHome, "auth.json")).equals(before.live!), name);
    } finally {
      cleanup(env);
    }
  }
});

test("finding 4/15: a saved copy that changed after the save returns a warning the flow must keep", async () => {
  const env = setup();
  try {
    const before = env.snapshot();
    const aliceFile = path.join(env.aliceHome, "auth.json");
    const result = await switchCodexDirect(
      env.req(),
      env.opts({ hooks: { afterLiveWrite: () => fs.writeFileSync(aliceFile, '{"tokens":') } }),
    );
    assert.equal(result.state, "unknown");
    assert.equal("activeKey" in result, false);
    assert.match(result.message, /holds carol@school\.example\.edu as expected/);
    assert.match(result.message, /saved copy of alice@example\.com changed after it was saved/);
    assert.equal(
      result.warning,
      "CodexBar's saved copy of alice@example.com changed after it was saved; check CodexBar's System Account menu before switching back.",
    );
    assert.ok(fs.readFileSync(env.liveFile).equals(before.carol!));
  } finally {
    cleanup(env);
  }
});

function rewriteStore(env: Env, edit: (accounts: Record<string, unknown>[]) => void): void {
  const store = JSON.parse(fs.readFileSync(env.storeFile, "utf8"));
  edit(store.accounts);
  fs.writeFileSync(env.storeFile, JSON.stringify(store));
}

function setAliceHome(env: Env, home: string): void {
  rewriteStore(env, (accounts) => {
    const alice = accounts.find((a) => String(a.email).toLowerCase() === ALICE.email)!;
    alice.managedHomePath = home;
  });
}

test("finding 17: a displaced home aliasing Codex's own home by case or symlink is refused", async () => {
  // Case alias of the live home (APFS is case-insensitive by default): outside the managed root lexically.
  const upper = setup();
  try {
    setAliceHome(upper, path.join(upper.root, "DOT-CODEX"));
    await refusedUntouched(upper, upper.opts(), /saved home for alice@example\.com is outside its managed-codex-homes/);
  } finally {
    cleanup(upper);
  }
  // Symlink inside the managed root pointing at the live home.
  const link = setup();
  try {
    const alias = path.join(link.supportDir, "managed-codex-homes", "ALIAS");
    fs.symlinkSync(link.codexHome, alias);
    setAliceHome(link, alias);
    await refusedUntouched(link, link.opts(), /saved home for alice@example\.com is a symlink/);
  } finally {
    cleanup(link);
  }
  // A parent directory inside the root that is a symlink: the real path leaves the root.
  const parent = setup();
  try {
    const hop = path.join(parent.supportDir, "managed-codex-homes", "HOP");
    fs.symlinkSync(parent.root, hop);
    setAliceHome(parent, path.join(hop, "dot-codex"));
    await refusedUntouched(parent, parent.opts(), /resolves outside its managed-codex-homes folder/);
  } finally {
    cleanup(parent);
  }
});

test("finding 17: ~/.codex symlinked into the displaced managed home is refused by directory identity", async () => {
  const env = setup();
  try {
    // Live auth.json lives in alice's managed home; Codex's home is a symlink to it.
    const liveBytes = authBytes({ ...ALICE, tag: "alice-live" });
    fs.writeFileSync(path.join(env.aliceHome, "auth.json"), liveBytes, { mode: 0o600 });
    fs.rmSync(env.codexHome, { recursive: true });
    fs.symlinkSync(env.aliceHome, env.codexHome);
    const before = fs.readFileSync(path.join(env.aliceHome, "auth.json"));
    const result = await switchCodexDirect(env.req(), env.opts());
    assert.equal(result.state, "failed");
    assert.match(result.message, /saved home for alice@example\.com is Codex's own home/);
    assert.deepEqual(env.daemon.calls, []);
    assert.ok(fs.readFileSync(path.join(env.aliceHome, "auth.json")).equals(before), "live login untouched");
  } finally {
    cleanup(env);
  }
});

test("finding 17: target and displaced entries that are the same folder, or a home outside the root, are refused", async () => {
  // A target home outside CodexBar's managed root, holding a valid carol login.
  const outside = setup();
  try {
    const stray = path.join(outside.root, "stray-carol");
    fs.mkdirSync(stray);
    fs.copyFileSync(path.join(outside.carolHome, "auth.json"), path.join(stray, "auth.json"));
    rewriteStore(outside, (accounts) => {
      accounts.find((a) => String(a.email).toLowerCase() === CAROL.email)!.managedHomePath = stray;
    });
    await refusedUntouched(
      outside,
      outside.opts({ managedHomePath: stray }),
      /saved home for carol \(Edu\) is outside its managed-codex-homes folder/,
    );
  } finally {
    cleanup(outside);
  }
  // A case alias of alice's home as carol's home: only a case-insensitive file system makes it the same folder.
  const same = setup();
  try {
    const alias = path.join(same.supportDir, "managed-codex-homes", "aaaa-alice");
    if (!fs.existsSync(alias)) return; // case-sensitive volume: the alias is simply a missing home
    rewriteStore(same, (accounts) => {
      accounts.find((a) => String(a.email).toLowerCase() === CAROL.email)!.managedHomePath = alias;
    });
    await refusedUntouched(same, same.opts({ managedHomePath: alias }), /are the same folder/);
  } finally {
    cleanup(same);
  }
});

test("finding 18: stop failure that left the daemon down restarts it and says so", async () => {
  const env = setup();
  try {
    env.daemon.failStopAfterKill = true;
    const before = env.snapshot();
    const result = await switchCodexDirect(env.req(), env.opts());
    assert.equal(result.state, "failed");
    assert.match(result.message, /Could not stop the Codex daemon: stop timed out\. Nothing was switched\./);
    assert.match(result.message, /The daemon had stopped and was started again\.$/);
    assert.deepEqual(env.daemon.calls, ["isRunning", "stop", "isRunning", "start"]);
    assert.deepEqual(env.snapshot(), before);
  } finally {
    cleanup(env);
  }
  const down = setup();
  try {
    down.daemon.failStopAfterKill = true;
    down.daemon.failStart = true;
    const result = await switchCodexDirect(down.req(), down.opts());
    assert.equal(result.state, "failed");
    assert.match(
      result.message,
      /The daemon is stopped and did not restart \(start exploded\); it starts with the next codex launch\.$/,
    );
  } finally {
    cleanup(down);
  }
});

function daemonHome(root: string, records: Record<string, string>): string {
  const home = path.join(root, "home");
  fs.mkdirSync(path.join(home, "app-server-daemon"), { recursive: true });
  for (const [name, body] of Object.entries(records))
    fs.writeFileSync(path.join(home, "app-server-daemon", name), body);
  return home;
}

test("finding 18: a failing `version` with a live recorded daemon pid is an error, not 'not running'", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codexswitch-cli-"));
  try {
    const failing = fakeCodex(dir, 'echo "Error: timed out waiting for app-server control socket" >&2; exit 1');
    const record = JSON.stringify({ pid: 4242, processStartTime: "x" });
    const alive = async (pid: number) => pid === 4242;
    const dead = async () => false;

    for (const name of ["daemon.pid", "app-server.pid"]) {
      const home = daemonHome(path.join(dir, name), { [name]: record });
      const control = codexDaemonControl(failing, { codexHome: home, isAppServerPid: alive });
      await assert.rejects(
        control.isRunning(),
        /the daemon \(pid 4242\) is running but `codex app-server daemon version` failed: Error: timed out waiting/,
      );
      // A recycled pid (not a codex app-server) does not count.
      assert.equal(await codexDaemonControl(failing, { codexHome: home, isAppServerPid: dead }).isRunning(), false);
    }
    // No usable record: empty (reserved while starting), garbage, or pid 0.
    const junk = daemonHome(path.join(dir, "junk"), { "daemon.pid": "", "app-server.pid": '{"pid":0}' });
    assert.equal(await codexDaemonControl(failing, { codexHome: junk, isAppServerPid: alive }).isRunning(), false);
    // `version` answering with a non-running status while a pid is live is also an error.
    const notRunning = fakeCodex(path.join(dir, "junk"), 'echo \'{"status":"notRunning"}\'');
    const home = daemonHome(path.join(dir, "nr"), { "daemon.pid": record });
    await assert.rejects(
      codexDaemonControl(notRunning, { codexHome: home, isAppServerPid: alive }).isRunning(),
      /reported "notRunning"/,
    );
    // Through switchCodexDirect this is a refusal that touches nothing (covered by the FakeDaemon status test).
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("finding 18: the default pid check rejects a live pid that is not a codex app-server", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codexswitch-cli-"));
  try {
    const failing = fakeCodex(dir, "exit 1");
    // This test process is alive but is not `codex app-server --listen unix://`.
    const home = daemonHome(dir, { "daemon.pid": JSON.stringify({ pid: process.pid }) });
    assert.equal(await codexDaemonControl(failing, { codexHome: home }).isRunning(), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("finding 6/18: daemon stop and start pass their child pid to onSpawn; version does not", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codexswitch-cli-"));
  try {
    const codex = fakeCodex(
      dir,
      ['case "$3" in', '  version) echo \'{"status":"running"}\' ;;', "  *) exit 0 ;;", "esac"].join("\n"),
    );
    const pids: (number | undefined)[] = [];
    const control = codexDaemonControl(codex, { codexHome: path.join(dir, "home"), onSpawn: (pid) => pids.push(pid) });
    assert.equal(await control.isRunning(), true);
    assert.equal(pids.length, 0);
    await control.stop();
    await control.start();
    assert.equal(pids.length, 2);
    assert.ok(pids.every((pid) => typeof pid === "number" && pid > 0));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
