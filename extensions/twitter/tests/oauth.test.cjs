const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { fork } = require("node:child_process");
const ts = require("typescript");

function load(file, mocks, modules = new Map()) {
  file = path.resolve(file);
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} };
  modules.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const requireMock = (name) => {
    if (name in mocks) return mocks[name];
    if (name.startsWith(".")) return load(path.resolve(path.dirname(file), name + ".ts"), mocks, modules);
    return require(name);
  };
  new Function("require", "module", "exports", code)(requireMock, module, module.exports);
  return module.exports;
}

if (process.argv[2] === "lock-worker") {
  const directory = process.argv[3];
  const { withOAuthLock } = load("src/v2/lib/oauth_lock.ts", {
    "@raycast/api": { environment: { supportPath: directory } },
  });
  withOAuthLock(async () => {
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
    const state = { onRead: undefined, fail: false };
    const client = {
      getTokens: async () => {
        reads++;
        const snapshot = stored;
        state.onRead?.(reads, () => {
          stored = fresh;
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
          getItem: async () =>
            "eHhMN2wwUldTeEpscThvMzBHZVI6MTpjaQ:tweet.read tweet.write users.read follows.read like.write bookmark.read bookmark.write tweet.moderate.write media.write dm.read dm.write offline.access",
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
          JSON.stringify(state.fail ? { error: "invalid_grant" } : { access_token: "fresh", refresh_token: "rotated" }),
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

  test("invalid-grant loser preserves credentials written after its expired reread", async (t) => {
    const f = fixture(t);
    f.state.fail = true;
    // Capture expired tokens, then publish the winner's tokens before the read resolves.
    f.state.onRead = (reads, publishWinner) => {
      if (reads === 2) publishWinner();
    };
    await assert.rejects(f.api().authorize(), /Could not refresh X authentication/);
    assert.equal(f.stored().accessToken, "fresh");
    assert.equal(f.removals(), 0);
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
}
