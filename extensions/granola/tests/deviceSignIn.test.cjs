const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, overrides = {}, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, "../src/utils", file), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(js, {
    exports,
    require: (id) => overrides[id] ?? (id === "./diagnostics" ? { diagnostic: () => {} } : require(id)),
    Buffer,
    URL,
    URLSearchParams,
    AbortSignal,
    ...globals,
  });
  return exports;
}
const protocol = load("granolaAuthProtocol.ts");
const KEY = "granola-pending-sign-in";
const device = {
  device_code: "device-secret",
  user_code: "ABCD-EFGH",
  verification_uri_complete: "https://mcp-auth.granola.ai/device?user_code=ABCD-EFGH",
  expires_in: 300,
  interval: 5,
};
const approved = { response: { ok: true }, body: { access_token: "access", refresh_token: "refresh", expires_in: 3600 } };
const pending = { response: { ok: false, status: 400 }, body: { error: "authorization_pending" } };

// One shared Raycast environment: LocalStorage and the OAuth token store
// persist across command processes, exactly as they do in Raycast.
function raycast({ exchange, grant = async () => device, beforeSave = async () => {}, onWait = () => {} } = {}) {
  const storage = new Map();
  const events = [];
  let session;
  const env = {
    storage,
    events,
    session: () => session,
    exchange,
    // Each call is a fresh command process with its own module state.
    command: () =>
      load("deviceSignIn.ts", {
        "@raycast/api": {
          LocalStorage: {
            getItem: async (k) => storage.get(k),
            setItem: async (k, v) => void storage.set(k, v),
            removeItem: async (k) => void storage.delete(k),
          },
          open: async (url) => {
            events.push(["open", url, storage.has(KEY)]);
          },
        },
        "./getAccessToken": {
          granolaOAuth: {
            getTokens: async () => session,
            setTokens: async (tokens) => {
              // Lets a test hold the keychain write open, like a slow save.
              await beforeSave();
              session = tokens;
            },
          },
        },
        "./granolaAuthProtocol": {
          ...protocol,
          requestDeviceGrant: grant,
          exchangeToken: (...args) => {
            events.push(["exchange"]);
            return env.exchange(...args);
          },
        },
        // Instant, abortable waits keep the poll loop fast and observable.
        "node:timers/promises": {
          setTimeout: async (ms, _value, { signal } = {}) => {
            events.push(["wait", ms]);
            onWait(ms);
            signal?.throwIfAborted();
            await new Promise((r) => setImmediate(r));
            signal?.throwIfAborted();
          },
        },
      }),
  };
  return env;
}
const savedGrant = (overrides = {}) => JSON.stringify({ ...device, deadline: Date.now() + 60_000, ...overrides });

test("grant is saved before the browser opens, and survives the command being unloaded", async () => {
  const env = raycast({ exchange: async () => pending });
  const controller = new AbortController();
  const run = env.command().runDeviceSignIn({ signal: controller.signal, onGrant: () => {} });
  // Raycast hides and unloads the command while the user is in the browser.
  setImmediate(() => controller.abort());
  await assert.rejects(run, { name: "AbortError" });
  assert.deepEqual(env.events[0], ["open", device.verification_uri_complete, true]);
  assert.equal(JSON.parse(env.storage.get(KEY)).device_code, "device-secret");
  assert.equal(env.session(), undefined);
});

test("next command resumes an approved sign-in immediately, without reopening the browser", async () => {
  const env = raycast({ exchange: async () => approved });
  env.storage.set(KEY, savedGrant());
  const next = env.command();
  const resume = await next.readPendingSignIn();
  const grants = [];
  const outcome = await next.runDeviceSignIn({
    signal: new AbortController().signal,
    resume,
    onGrant: (g) => grants.push(g.user_code),
  });
  assert.equal(outcome, "saved");
  assert.deepEqual(env.events, [["exchange"]]);
  assert.deepEqual(grants, ["ABCD-EFGH"]);
  assert.equal(env.session().accessToken, "access");
  assert.equal(env.storage.has(KEY), false);
});

test("a fresh sign-in waits between checks until the user approves", async () => {
  const replies = [pending, pending, approved];
  const env = raycast({ exchange: async () => replies.shift() });
  const outcome = await env.command().runDeviceSignIn({ signal: new AbortController().signal, onGrant: () => {} });
  assert.equal(outcome, "saved");
  assert.deepEqual(
    env.events.map(([e]) => e),
    ["open", "wait", "exchange", "wait", "exchange", "wait", "exchange"],
  );
  // Waits are computed from the next allowed check time, so allow for the
  // few milliseconds spent between scheduling and waiting.
  assert.ok(env.events.filter(([e]) => e === "wait").every(([, ms]) => ms > 4900 && ms <= 5000));
  assert.equal(env.storage.has(KEY), false);
});

test("two commands resuming the same grant both end up signed in", async () => {
  let redeemed = false;
  const env = raycast({
    exchange: async () => {
      if (redeemed) return { response: { ok: false, status: 400 }, body: { error: "invalid_grant" } };
      redeemed = true;
      return approved;
    },
  });
  env.storage.set(KEY, savedGrant());
  const [a, b] = [env.command(), env.command()];
  const resume = await a.readPendingSignIn();
  const signal = new AbortController().signal;
  assert.equal(await a.runDeviceSignIn({ signal, resume, onGrant: () => {} }), "saved");
  assert.equal(await b.runDeviceSignIn({ signal, resume, onGrant: () => {} }), "existing");
});

test("a command rejected while the winner is still saving waits for that session", async () => {
  let release;
  const saving = new Promise((r) => (release = r));
  let redeemed = false;
  const env = raycast({
    exchange: async () => {
      if (redeemed) return { response: { ok: false, status: 400 }, body: { error: "invalid_grant" } };
      redeemed = true;
      return approved;
    },
    // Hold the winner's keychain write until the loser has already looked
    // for a session once and found nothing.
    beforeSave: () => saving,
    onWait: (ms) => ms === 250 && release(),
  });
  env.storage.set(KEY, savedGrant());
  const [a, b] = [env.command(), env.command()];
  const resume = await a.readPendingSignIn();
  const signal = new AbortController().signal;
  const outcomes = await Promise.all([
    a.runDeviceSignIn({ signal, resume, onGrant: () => {} }),
    b.runDeviceSignIn({ signal, resume, onGrant: () => {} }),
  ]);
  assert.deepEqual(outcomes, ["saved", "existing"]);
  assert.equal(env.session().accessToken, "access");
});

test("slow_down survives an unload, and the resumed run keeps the longer interval", async () => {
  const slow = { response: { ok: false, status: 400 }, body: { error: "slow_down" } };
  const replies = [slow, approved];
  const controller = new AbortController();
  let waits = 0;
  const env = raycast({
    exchange: async () => replies.shift(),
    // Unload the command while it waits after the slow_down reply.
    onWait: () => ++waits === 2 && controller.abort(),
  });
  await assert.rejects(env.command().runDeviceSignIn({ signal: controller.signal, onGrant: () => {} }), {
    name: "AbortError",
  });
  const saved = JSON.parse(env.storage.get(KEY));
  assert.equal(saved.interval, 10);
  assert.ok(saved.nextCheckAt > Date.now() + 9000);

  env.events.length = 0;
  const next = env.command();
  const outcome = await next.runDeviceSignIn({
    signal: new AbortController().signal,
    resume: await next.readPendingSignIn(),
    onGrant: () => {},
  });
  assert.equal(outcome, "saved");
  // The resumed run waits out the server's pacing instead of checking at once.
  assert.equal(env.events[0][0], "wait");
  assert.ok(env.events[0][1] > 9000);
  assert.equal(env.events[1][0], "exchange");
});

test("declined and expired codes are cleared; network errors keep the grant for a retry", async () => {
  const deny = { response: { ok: false, status: 400 }, body: { error: "access_denied" } };
  const declined = raycast({ exchange: async () => deny });
  declined.storage.set(KEY, savedGrant());
  const resume = await declined.command().readPendingSignIn();
  await assert.rejects(
    declined.command().runDeviceSignIn({ signal: new AbortController().signal, resume, onGrant: () => {} }),
    (e) => e.kind === "declined",
  );
  assert.equal(declined.storage.has(KEY), false);

  const offline = raycast({
    exchange: async () => {
      throw new protocol.GranolaSignInError("connection", "unreachable");
    },
  });
  offline.storage.set(KEY, savedGrant());
  await assert.rejects(
    offline.command().runDeviceSignIn({
      signal: new AbortController().signal,
      resume: await offline.command().readPendingSignIn(),
      onGrant: () => {},
    }),
    (e) => e.kind === "connection",
  );
  assert.equal(offline.storage.has(KEY), true);
});

test("expired or malformed saved grants are discarded instead of resumed", async () => {
  for (const raw of [
    savedGrant({ deadline: Date.now() - 1 }),
    savedGrant({ interval: undefined }),
    savedGrant({ interval: 0 }),
    savedGrant({ device_code: 42 }),
    "{not json",
  ]) {
    const env = raycast();
    env.storage.set(KEY, raw);
    assert.equal(await env.command().readPendingSignIn(), undefined);
    assert.equal(env.storage.has(KEY), false);
  }
});
