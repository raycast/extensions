/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { EventEmitter } = require("node:events");
const { PassThrough, Writable } = require("node:stream");
const { test } = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const code = ts.transpileModule(readFileSync(join(__dirname, "../src/lib/usage.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const now = 1_800_000_000_000;
const quota = (duration = 10080, used = 20) => ({
  usedPercent: used,
  windowDurationMins: duration,
  resetsAt: (now + 3600000) / 1000,
});
const bridgeReading = (overrides = {}) => ({
  provider: "claude",
  bridgeConnected: true,
  source: "live",
  data: {
    provider: "claude",
    fetchedAt: now - 1000,
    windows: [{ id: "five_hour", title: "5-hour", usedPercent: 30, remainingPercent: 70, resetsAt: now + 60000 }],
  },
  ...overrides,
});
function harness(preferences = { usageOnly: true }, storage = new Map()) {
  const spawned = [];
  const runtime = {
    clock: now,
    bridge: undefined,
    failCodex: false,
    blockCodex: undefined,
    custom: [],
    customError: false,
  };
  class Clock extends Date {
    static now() {
      return runtime.clock;
    }
  }
  const api = {
    getPreferenceValues: () => preferences,
    LocalStorage: {
      getItem: async (key) => storage.get(key),
      allItems: async () => Object.fromEntries(storage),
      removeItem: async (key) => {
        storage.delete(key);
      },
      setItem: async (key, value) => {
        storage.set(key, value);
      },
    },
  };
  function spawn(executable, args, options) {
    const child = new EventEmitter();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.exitCode = null;
    child.signalCode = null;
    child.kill = (signal) => {
      child.signalCode = signal;
      child.emit("exit", null);
      return true;
    };
    const isCodex = args[0] === "app-server";
    spawned.push({ executable, args, options });
    child.stdin = new Writable({
      write(chunk, _, done) {
        const request = JSON.parse(chunk.toString());
        queueMicrotask(async () => {
          if (isCodex) {
            if (!request.id) return;
            let response = { id: request.id, result: {} };
            if (request.method === "account/rateLimits/read") {
              if (runtime.blockCodex) await runtime.blockCodex;
              response = runtime.failCodex
                ? { id: request.id, error: { message: "offline" } }
                : {
                    id: request.id,
                    result: {
                      rateLimitsByLimitId: {
                        codex: { primary: quota() },
                        base_model_inference: { limitName: "gpt-reserve", primary: quota(10080, 99) },
                      },
                    },
                  };
            } else if (request.method === "account/usage/read") {
              response = { id: request.id, error: { message: "unknown method" } };
            }
            child.stdout.write(JSON.stringify(response) + "\n");
          } else {
            child.stdout.write(
              JSON.stringify({
                type: "control_response",
                response: {
                  request_id: request.request_id,
                  response: {
                    rate_limits: { five_hour: { utilization: 25, resets_at: new Date(now + 60000).toISOString() } },
                  },
                },
              }) + "\n",
            );
          }
        });
        done();
      },
    });
    return child;
  }
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    Date: Clock,
    process,
    Buffer,
    console,
    setTimeout,
    clearTimeout,
    require: (id) => {
      if (id === "@raycast/api") return api;
      if (id === "./claude-statusline") return { readClaudeStatusLineUsage: async () => runtime.bridge };
      if (id === "./custom-usage")
        return {
          fetchCustomUsage: async () => {
            if (runtime.customError) throw new Error("invalid file");
            return runtime.custom;
          },
        };
      if (id === "node:child_process") return { spawn };
      return require(id);
    },
  });
  return { usage: module.exports, runtime, spawned, storage, preferences, api };
}

// Bound the wait so a scheduling regression fails instead of hanging the test run.
async function until(predicate) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  throw new Error("request did not start");
}

test("Codex uses normal subscription windows and actual reported durations", () => {
  const { usage } = harness();
  const parse = (limits) => usage.normalizeCodexUsage({}, limits, {}, now);
  const mapped = parse({
    rateLimitsByLimitId: { codex: { primary: quota() }, reserve: { primary: quota(300, 99) } },
    rateLimits: { primary: quota(300) },
  });
  assert.equal(mapped.windows.length, 1);
  assert.equal(mapped.windows[0].title, "Weekly limit");
  assert.equal(mapped.windows[0].remainingPercent, 80);
  assert.equal(parse({ rateLimits: { limitId: "gpt-reserve", primary: quota() } }).windows.length, 0);
  assert.equal(parse({ rateLimits: { primary: quota(300), secondary: quota() } }).windows.length, 2);
  assert.equal(parse({ rateLimits: { primary: { usedPercent: 0 } } }).windows[0].title, "Primary limit");
});

test("quota-only mode never starts Claude, and optional Codex stats errors do not hide quotas", async () => {
  const { usage, spawned } = harness();
  const snapshot = await usage.loadUsageSnapshot();
  assert.equal(snapshot.providers.claude.needsConnection, true);
  assert.equal(snapshot.providers.codex.data.windows.length, 1);
  assert.equal(spawned.length, 1);
  assert.equal(spawned[0].args[0], "app-server");
});

test("connected Claude always reads saved observations without renewing time or falling back", async () => {
  const { usage, runtime, spawned } = harness({ usageOnly: false });
  runtime.bridge = bridgeReading();
  const first = await usage.loadUsageSnapshot();
  runtime.clock += 300001;
  const second = await usage.loadUsageSnapshot();
  assert.equal(second.providers.claude.data.fetchedAt, first.providers.claude.data.fetchedAt);
  assert.equal(second.providers.claude.source, "stale");
  assert.equal(usage.currentUsageWindows(second.providers.claude).length, 0);
  runtime.bridge = bridgeReading({ source: "unavailable", data: undefined, error: "changed settings" });
  const waiting = await usage.loadUsageSnapshot({ force: true });
  assert.equal(waiting.providers.claude.source, "unavailable");
  assert.equal(
    spawned.every((child) => child.args[0] === "app-server"),
    true,
  );
});

test("existing Claude CLI flow remains available and configured data roots reach both CLIs", async () => {
  const { usage, spawned } = harness({
    usageOnly: false,
    claudeHome: "/tmp/claude-profile",
    codexHome: "/tmp/codex-profile",
  });
  const snapshot = await usage.loadUsageSnapshot();
  assert.equal(snapshot.providers.claude.data.windows[0].remainingPercent, 75);
  assert.equal(snapshot.providers.claude.needsConnection, true);
  assert.equal(spawned.length, 2);
  for (const { options } of spawned) {
    assert.equal(options.env.CLAUDE_CONFIG_DIR, "/tmp/claude-profile");
    assert.equal(options.env.CODEX_HOME, "/tmp/codex-profile");
  }
});

test("a failed refresh preserves history but excludes it from current quotas, including cached failures", async () => {
  const { usage, runtime } = harness();
  await usage.loadUsageSnapshot();
  runtime.failCodex = true;
  const failed = await usage.loadUsageSnapshot({ force: true });
  assert.equal(failed.providers.codex.data.windows[0].remainingPercent, 80);
  assert.equal(failed.providers.codex.source, "stale");
  assert.equal(usage.currentUsageWindows(failed.providers.codex).length, 0);
  assert.equal((await usage.loadUsageSnapshot()).providers.codex.source, "stale");
});

test("bad custom files are isolated from built-in providers", async () => {
  const { usage, runtime } = harness({ usageOnly: true, customUsageFile: "/tmp/quotas.json" });
  runtime.customError = true;
  const snapshot = await usage.loadUsageSnapshot();
  assert.equal(snapshot.customProviders[0].source, "unavailable");
  assert.equal(snapshot.providers.codex.source, "live");
});

test(
  "connect invalidation during a slow read cannot publish pre-connection Claude data",
  { timeout: 3000 },
  async () => {
    const { usage, runtime, spawned } = harness();
    let unblock;
    runtime.blockCodex = new Promise((resolve) => {
      unblock = resolve;
    });
    const first = usage.loadUsageSnapshot();
    await until(() => spawned.length > 0);
    runtime.bridge = bridgeReading();
    await usage.invalidateUsageCache();
    const forced = usage.loadUsageSnapshot({ force: true });
    runtime.blockCodex = undefined;
    unblock();
    const [a, b] = await Promise.all([first, forced]);
    assert.equal(a.providers.claude.bridgeConnected, true);
    assert.equal(b.providers.claude.data.windows[0].remainingPercent, 70);
  },
);

test("forced refreshes coalesce and settle under concurrent callers", { timeout: 3000 }, async () => {
  const { usage, runtime, spawned } = harness();
  let unblock;
  runtime.blockCodex = new Promise((resolve) => {
    unblock = resolve;
  });
  const first = usage.loadUsageSnapshot();
  await until(() => spawned.length > 0);
  const queue = Array.from({ length: 10 }, () => usage.loadUsageSnapshot({ force: true }));
  runtime.blockCodex = undefined;
  unblock();
  const results = await Promise.all([first, ...queue]);
  assert.equal(results.length, 11);
  assert.equal(spawned.length, 2);
  assert.equal(
    results.every((s) => s.providers.codex.data.windows.length === 1),
    true,
  );
});

test("invalidations and profile changes retain one cache entry and remove only obsolete usage keys", async () => {
  const { usage, storage, preferences } = harness();
  storage.set("cli-usage-cache-v1", "old cache");
  storage.set("cli-usage-cache-v2", "old cache");
  for (let i = 0; i < 5; i++) storage.set(`cli-usage-cache-v2-${String(i).padStart(24, "0")}`, "old cache");
  storage.set("favorite-chat-keys", "preserve this");
  for (let i = 0; i < 12; i++) {
    await usage.invalidateUsageCache();
    preferences.codexHome = `/tmp/profile-${i}`;
    await usage.loadUsageSnapshot();
    assert.equal([...storage.keys()].filter((key) => key.startsWith("cli-usage-cache-")).length, 1);
  }
  assert.equal(storage.get("favorite-chat-keys"), "preserve this");
  assert.equal(JSON.parse(storage.get("cli-usage-cache-v3")).providers.codex.data.windows[0].remainingPercent, 80);
});

test("a late pre-invalidation write cannot be reused by another command", { timeout: 3000 }, async () => {
  const storage = new Map();
  const oldCommand = harness({ usageOnly: true }, storage);
  const newCommand = harness({ usageOnly: true }, storage);
  let unblock;
  const gate = new Promise((resolve) => {
    unblock = resolve;
  });
  const originalSet = oldCommand.api.LocalStorage.setItem;
  let blocked = false;
  oldCommand.api.LocalStorage.setItem = async (key, value) => {
    if (key === "cli-usage-cache-v3" && !blocked) {
      blocked = true;
      await gate;
    }
    await originalSet(key, value);
  };
  const pending = oldCommand.usage.loadUsageSnapshot();
  await until(() => blocked);
  await newCommand.usage.invalidateUsageCache();
  await newCommand.usage.loadUsageSnapshot();
  const currentTag = JSON.parse(storage.get("cli-usage-cache-v3")).profile;
  let verifiedMiss = false;
  const originalGet = oldCommand.api.LocalStorage.getItem;
  oldCommand.api.LocalStorage.getItem = async (key) => {
    if (key === "cli-usage-revision-v2" && !verifiedMiss) {
      verifiedMiss = true;
      // The old write has landed; a separate command must fetch, not reuse it.
      assert.notEqual(JSON.parse(storage.get("cli-usage-cache-v3")).profile, currentTag);
      newCommand.runtime.failCodex = true;
      const result = await newCommand.usage.loadUsageSnapshot();
      assert.equal(result.providers.codex.source, "unavailable");
      assert.equal(result.providers.codex.data, undefined);
    }
    return originalGet(key);
  };
  unblock();
  await pending;
  assert.equal(verifiedMiss, true);
  assert.equal([...storage.keys()].filter((key) => key.startsWith("cli-usage-cache-")).length, 1);
});
