const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");
const { runInThisContext } = require("node:vm");
const ts = require("typescript");

function loadOAuth(dependencies) {
  const filename = resolve(__dirname, "..", "src/v2/lib/oauth.ts");
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  const module = { exports: {} };
  const requireMock = (name) => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  };
  runInThisContext(`(function(require, module, exports) { ${outputText}\n})`, { filename })(
    requireMock,
    module,
    module.exports,
  );
  return module.exports;
}

test("concurrent authorization shares a single refresh and preserves its tokens", async () => {
  const scopes = [
    "tweet.read",
    "tweet.write",
    "users.read",
    "follows.read",
    "like.write",
    "bookmark.read",
    "bookmark.write",
    "tweet.moderate.write",
    "media.write",
    "dm.read",
    "dm.write",
    "offline.access",
  ].join(" ");
  const configuration = `eHhMN2wwUldTeEpscThvMzBHZVI6MTpjaQ:${scopes}`;
  let storedTokens = {
    accessToken: "expired-access-token",
    refreshToken: "single-use-refresh-token",
    isExpired: () => true,
  };
  let refreshRequests = 0;
  let removals = 0;
  let interactiveAuthorizations = 0;
  let releaseRefresh;
  const refreshBarrier = new Promise((resolve) => {
    releaseRefresh = resolve;
  });

  class PKCEClient {
    async getTokens() {
      return storedTokens;
    }

    async setTokens(tokens) {
      storedTokens = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        isExpired: () => false,
      };
    }

    async removeTokens() {
      removals += 1;
      storedTokens = undefined;
    }

    async authorizationRequest() {
      interactiveAuthorizations += 1;
      throw new Error("Interactive authorization should not be needed");
    }
  }

  const originalFetch = global.fetch;
  global.fetch = async () => {
    refreshRequests += 1;
    if (refreshRequests > 1) {
      return new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 });
    }
    await refreshBarrier;
    return new Response(JSON.stringify({ access_token: "fresh-access-token", refresh_token: "rotated-refresh-token" }), {
      status: 200,
    });
  };

  try {
    const { authorize } = loadOAuth({
      "@raycast/api": {
        LocalStorage: { getItem: async () => configuration, setItem: async () => {} },
        OAuth: { PKCEClient, RedirectMethod: { Web: "web" } },
      },
      "../../icon": { XIcon: () => "icon" },
    });

    const first = authorize();
    const second = authorize();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(refreshRequests, 1);

    releaseRefresh();
    await Promise.all([first, second]);

    assert.equal(refreshRequests, 1);
    assert.equal(removals, 0);
    assert.equal(interactiveAuthorizations, 0);
    assert.equal(storedTokens.accessToken, "fresh-access-token");
    assert.equal(storedTokens.refreshToken, "rotated-refresh-token");
  } finally {
    global.fetch = originalFetch;
  }
});
