const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { fork } = require("node:child_process");

const { load } = require("./load.cjs");

if (process.argv[2] === "lock-worker") {
  const directory = process.argv[3];
  const { withOAuthLock } = load("src/v2/lib/oauth_lock.ts", {
    "@raycast/api": { environment: { supportPath: directory } },
  });
  withOAuthLock(async () => {
    if (process.argv[4] === "hold") {
      process.send("acquired");
      await new Promise((resolve) => process.once("message", resolve));
      return;
    }
    const marker = path.join(directory, "critical-section");
    const fd = fs.openSync(marker, "wx");
    await new Promise((resolve) => setTimeout(resolve, 150));
    fs.closeSync(fd);
    fs.unlinkSync(marker);
  }).then(
    () => process.exit(0),
    (error) => {
      console.error(error);
      process.exit(1);
    },
  );
} else {
  function fixture(t) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "x-oauth-test-"));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    let stored = { accessToken: "expired", refreshToken: "refresh", isExpired: () => true };
    let reads = 0,
      removals = 0,
      refreshes = 0;
    const fresh = { accessToken: "fresh", refreshToken: "rotated", isExpired: () => false };
    const state = {
      onRead: undefined,
      fail: false,
      errorCode: "invalid_grant",
      configuration:
        "eHhMN2wwUldTeEpscThvMzBHZVI6MTpjaQ:tweet.read tweet.write users.read follows.read like.read like.write bookmark.read bookmark.write tweet.moderate.write media.write dm.read dm.write offline.access",
      authorizationRequests: [],
    };
    const client = {
      authorizationRequest: async (options) => {
        state.authorizationRequests.push(options);
        return { ...options, codeVerifier: "verifier", redirectURI: "https://raycast.com/redirect" };
      },
      authorize: async () => ({ authorizationCode: "code" }),
      getTokens: async () => {
        reads++;
        const snapshot = stored;
        state.onRead?.(reads, (replacement = fresh) => {
          stored = replacement;
        });
        return snapshot;
      },
      setTokens: async () => {
        stored = fresh;
      },
      removeTokens: async () => {
        removals++;
        stored = undefined;
      },
    };
    const mocks = {
      "@raycast/api": {
        environment: { supportPath: directory },
        OAuth: {
          PKCEClient: class {
            constructor() {
              return client;
            }
          },
          RedirectMethod: { Web: "web" },
        },
        LocalStorage: {
          getItem: async () => state.configuration,
          setItem: async (_key, value) => {
            state.configuration = value;
          },
        },
      },
      "./read_cache": { readCache: { clear() {} } },
      "../../icon": { XIcon() {} },
    };
    const originalFetch = global.fetch;
    t.after(() => {
      global.fetch = originalFetch;
    });
    global.fetch = async () => {
      refreshes++;
      await new Promise((resolve) => setTimeout(resolve, 30));
      return {
        ok: !state.fail,
        status: state.fail ? 400 : 200,
        text: async () =>
          JSON.stringify(state.fail ? { error: state.errorCode } : { access_token: "fresh", refresh_token: "rotated" }),
      };
    };
    return {
      state,
      api: () => load("src/v2/lib/oauth.ts", mocks),
      stored: () => stored,
      removals: () => removals,
      refreshes: () => refreshes,
    };
  }

  test("scope migration requests like.read and like.write during reauthorization", async (t) => {
    const f = fixture(t);
    f.state.configuration = f.state.configuration.replace("like.read ", "");
    const api = f.api();
    await api.authorize();
    assert.equal(f.removals(), 1);
    assert.equal(f.state.authorizationRequests.length, 1);
    const scopes = f.state.authorizationRequests[0].scope.split(" ");
    assert.ok(scopes.includes("like.read"));
    assert.ok(scopes.includes("like.write"));
    assert.ok(f.state.configuration.includes("like.read "));
    await api.authorize();
    assert.equal(f.removals(), 1);
    assert.equal(f.state.authorizationRequests.length, 1);
  });

  test("invalid-grant loser preserves credentials written after its expired reread", async (t) => {
    const f = fixture(t);
    f.state.fail = true;
    // Capture expired tokens, then publish the winner's tokens before the read resolves.
    f.state.onRead = (reads, publishWinner) => {
      if (reads === 2) publishWinner();
    };
    await f.api().authorize();
    assert.equal(f.stored().accessToken, "fresh");
    assert.equal(f.removals(), 0);
  });

  test("revoked tokens are cleared and the next attempt can authorize", async (t) => {
    const f = fixture(t);
    f.state.fail = true;
    const api = f.api();
    await assert.rejects(api.authorize(), /invalid_grant/);
    assert.equal(f.removals(), 1);
    assert.equal(f.stored(), undefined);
    f.state.fail = false;
    await api.authorize();
    assert.equal(f.stored().accessToken, "fresh");
    assert.equal(f.state.authorizationRequests.length, 2);
  });

  test("invalid grant preserves a newer expired session for its own refresh", async (t) => {
    const f = fixture(t);
    f.state.fail = true;
    f.state.onRead = (reads, publishWinner) => {
      if (reads === 2) publishWinner({ accessToken: "newer", refreshToken: "newer-refresh", isExpired: () => true });
    };
    await assert.rejects(f.api().authorize(), /authentication changed/);
    assert.equal(f.stored().refreshToken, "newer-refresh");
    assert.equal(f.removals(), 0);
    assert.equal(f.state.authorizationRequests.length, 0);
  });

  test("transient OAuth errors do not erase credentials or start authorization", async (t) => {
    const f = fixture(t);
    f.state.fail = true;
    f.state.errorCode = "temporarily_unavailable";
    await assert.rejects(f.api().authorize(), /temporarily_unavailable/);
    assert.equal(f.stored().refreshToken, "refresh");
    assert.equal(f.removals(), 0);
    assert.equal(f.state.authorizationRequests.length, 0);
  });

  test("independent OAuth instances serialize refresh and reread rotated credentials", async (t) => {
    const f = fixture(t);
    await Promise.all([f.api().authorize(), f.api().authorize()]);
    assert.equal(f.refreshes(), 1);
    assert.equal(f.removals(), 0);
    assert.equal(f.stored().accessToken, "fresh");
  });

  test("delayed 401 reset preserves newer credentials", async (t) => {
    const f = fixture(t);
    const api = f.api();
    await api.authorize();
    await api.resetOAuthTokens("expired");
    assert.equal(f.removals(), 0);
    await api.resetOAuthTokens();
    assert.equal(f.removals(), 1);
  });

  test("lock excludes separate Node processes", async (t) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "x-oauth-lock-"));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    await Promise.all(
      Array.from(
        { length: 3 },
        () =>
          new Promise((resolve, reject) => {
            const child = fork(__filename, ["lock-worker", directory], { stdio: "pipe" });
            let stderr = "";
            child.stderr.on("data", (chunk) => {
              stderr += chunk;
            });
            child.on("error", reject);
            child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(stderr || `Exit ${code}`))));
          }),
      ),
    );
    assert.equal(fs.existsSync(path.join(directory, "oauth-credentials.lock")), false);
  });

  function deferred() {
    let resolve;
    const promise = new Promise((done) => {
      resolve = done;
    });
    return { promise, resolve };
  }

  async function holder(t, directory) {
    const child = fork(__filename, ["lock-worker", directory, "hold"], { stdio: ["ignore", "ignore", "pipe", "ipc"] });
    t.after(() => {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    });
    await new Promise((resolve, reject) => {
      child.once("message", resolve);
      child.once("error", reject);
      child.once("exit", () => reject(new Error("Holder exited before acquiring lock")));
    });
    return child;
  }

  function lockFixture(t, fsOverrides = {}) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "x-oauth-recovery-"));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const makeLock = (overrides = fsOverrides) =>
      load("src/v2/lib/oauth_lock.ts", {
        "@raycast/api": { environment: { supportPath: directory } },
        "node:fs/promises": { ...require("node:fs/promises"), ...overrides },
      }).withOAuthLock;
    return { directory, makeLock };
  }

  test("a killed holder is recovered by competing processes", { timeout: 10000 }, async (t) => {
    const { directory } = lockFixture(t);
    const child = await holder(t, directory);
    const exited = new Promise((resolve) => child.once("exit", resolve));
    child.kill("SIGKILL");
    await exited;
    assert.equal(fs.existsSync(path.join(directory, "oauth-credentials.lock")), true);
    await Promise.all(
      Array.from(
        { length: 4 },
        () =>
          new Promise((resolve, reject) => {
            const contender = fork(__filename, ["lock-worker", directory], { stdio: "pipe" });
            t.after(() => {
              if (contender.exitCode === null) contender.kill("SIGKILL");
            });
            let stderr = "";
            contender.stderr.on("data", (chunk) => {
              stderr += chunk;
            });
            contender.once("error", reject);
            contender.once("exit", (code) => (code === 0 ? resolve() : reject(new Error(stderr))));
          }),
      ),
    );
    assert.equal(fs.existsSync(path.join(directory, "oauth-credentials.lock")), false);
  });

  test("an old lock held by a live process remains protected", { timeout: 10000 }, async (t) => {
    const { directory, makeLock } = lockFixture(t);
    const child = await holder(t, directory);
    const lockPath = path.join(directory, "oauth-credentials.lock");
    const owners = fs.readdirSync(lockPath);
    fs.utimesSync(lockPath, new Date(0), new Date(0));
    const inspected = deferred();
    const withLock = makeLock({
      readdir: async (target) => {
        const entries = await fs.promises.readdir(target);
        inspected.resolve();
        return entries;
      },
    });
    let entered = false;
    const pending = withLock(async () => {
      entered = true;
    });
    await inspected.promise;
    assert.equal(entered, false);
    assert.deepEqual(fs.readdirSync(lockPath), owners);
    child.send("release");
    await pending;
    assert.equal(entered, true);
  });

  test("a delayed dead-owner cleanup cannot remove a replacement holder", { timeout: 10000 }, async (t) => {
    const { directory, makeLock } = lockFixture(t);
    const child = await holder(t, directory);
    const exited = new Promise((resolve) => child.once("exit", resolve));
    child.kill("SIGKILL");
    await exited;
    const lockPath = path.join(directory, "oauth-credentials.lock");
    const oldOwner = fs.readdirSync(lockPath)[0];
    const paused = deferred(),
      resume = deferred(),
      replacementEntered = deferred(),
      replacementInspected = deferred(),
      release = deferred();
    let delayedEntered = false;
    const delayedLock = makeLock({
      readdir: async (target) => {
        const entries = await fs.promises.readdir(target);
        if (entries.length > 0 && !entries.includes(oldOwner)) replacementInspected.resolve();
        return entries;
      },
      unlink: async (target) => {
        if (path.basename(target) === oldOwner) {
          paused.resolve();
          await resume.promise;
        }
        return fs.promises.unlink(target);
      },
    });
    const delayed = delayedLock(async () => {
      delayedEntered = true;
    });
    await paused.promise;
    const replacement = makeLock()(async () => {
      replacementEntered.resolve();
      await release.promise;
    });
    await replacementEntered.promise;
    const replacementOwners = fs.readdirSync(lockPath);
    resume.resolve();
    // Wait for the delayed recoverer to inspect the replacement after its stale cleanup.
    await replacementInspected.promise;
    assert.equal(delayedEntered, false);
    assert.deepEqual(fs.readdirSync(lockPath), replacementOwners);
    release.resolve();
    await Promise.all([delayed, replacement]);
    assert.equal(delayedEntered, true);
  });
}
