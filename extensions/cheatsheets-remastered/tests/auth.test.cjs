const { test } = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

// Exercise the installed SDK, replacing only Raycast's native credential boundary.
// The native distribution smoke separately exercises the view wrapper in React.
function sdkFixture() {
  const state = { cached: { accessToken: "synthetic-cached-token" }, requests: [], reads: 0, writes: 0 };
  const native = {
    environment: { commandMode: "no-view" },
    Color: { PrimaryText: "text" },
    OAuth: {
      RedirectMethod: { Web: "web" },
      PKCEClient: class {
        async getTokens() {
          state.reads++;
          return state.cached;
        }
        async authorizationRequest(options) {
          state.requests.push(options);
          return options;
        }
        async authorize() {
          throw new Error("Synthetic authorization cancelled");
        }
        async setTokens() {
          state.writes++;
          throw new Error("Credential writes are forbidden in this test");
        }
        async removeTokens() {
          throw new Error("Credential removal is forbidden in this test");
        }
      },
    },
  };
  const originalLoad = Module._load;
  const sdkPath = require.resolve("@raycast/utils");
  const authPath = require.resolve("../.test-dist/github-oauth");
  delete require.cache[sdkPath];
  delete require.cache[authPath];
  Module._load = function (name, ...args) {
    return name === "@raycast/api" ? native : originalLoad.call(this, name, ...args);
  };
  try {
    const sdk = require("@raycast/utils");
    const { githubOAuth } = require(authPath);
    return { state, sdk, githubOAuth };
  } finally {
    Module._load = originalLoad;
  }
}

test("published OAuth scopes and cached token work with the installed SDK", async () => {
  const { state, sdk, githubOAuth } = sdkFixture();
  assert.equal(githubOAuth.scope, "repo read:org read:user");
  const run = sdk.withAccessToken(githubOAuth)(async () => sdk.getAccessToken());
  assert.deepEqual(await run({}), { token: "synthetic-cached-token", type: "oauth" });
  assert.equal(state.requests.length, 0);
  assert.equal(state.writes, 0);
});

test("cancelled authorization never runs authenticated work or removes credentials", async () => {
  const { state, sdk, githubOAuth } = sdkFixture();
  state.cached = undefined;
  let ran = false;
  const run = sdk.withAccessToken(githubOAuth)(async () => {
    ran = true;
  });
  await assert.rejects(run({}), /Synthetic authorization cancelled/);
  assert.equal(ran, false);
  assert.equal(state.requests[0].scope, "repo read:org read:user");
  assert.equal(state.writes, 0);
});

test("the SDK can retry after cancellation and reuse an existing token", async () => {
  const { state, sdk, githubOAuth } = sdkFixture();
  state.cached = undefined;
  const run = sdk.withAccessToken(githubOAuth)(async () => sdk.getAccessToken().token);
  await assert.rejects(run({}), /Synthetic authorization cancelled/);
  state.cached = { accessToken: "synthetic-retry-token" };
  assert.equal(await run({}), "synthetic-retry-token");
  assert.equal(state.requests.length, 1);
  assert.equal(state.writes, 0);
});
