// Focused regression check: auth failures must not destroy a saved connection.
// All credentials, tokens and responses below are synthetic; no network is used.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const { test } = require("node:test");

test("refresh preserves credentials and sessions unless browser sign-in succeeds", async () => {
  const prefs = { schwabAppKey: "fake-key", schwabAppSecret: "fake-secret" };
  let tokens = { accessToken: "old", refreshToken: "refresh", isExpired: () => true };
  let requests = 0;
  let signIns = 0;
  let saves = 0;
  let response = () => {
    throw new Error("offline");
  };
  class Client {
    async getTokens() {
      return tokens;
    }
    async setTokens(value) {
      saves++;
      tokens = { accessToken: value.access_token, refreshToken: value.refresh_token, isExpired: () => false };
    }
    async removeTokens() {
      throw new Error("Must not erase tokens");
    }
    async authorizationRequest() {
      return { codeVerifier: "fake-verifier", redirectURI: "https://example.com" };
    }
    async authorize() {
      signIns++;
      return { authorizationCode: "fake-code" };
    }
  }
  const module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync("src/lib/oauth.ts", "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
    }).outputText,
    {
      exports: module.exports,
      Buffer,
      URLSearchParams,
      require: (name) =>
        name === "@raycast/api"
          ? { OAuth: { PKCEClient: Client, RedirectMethod: { Web: "web" } }, getPreferenceValues: () => prefs }
          : { SCHWAB_AUTH_URL: "https://example.com/auth", SCHWAB_TOKEN_URL: "https://example.com/token" },
      fetch: async () => {
        requests++;
        return response();
      },
    },
  );
  const { schwabOAuth, refreshRejectedToken } = module.exports;
  await assert.rejects(schwabOAuth.authorize(), /offline/);
  for (const [status, error] of [
    [503, "server_error"],
    [429, "rate_limit"],
    [401, "invalid_client"],
  ]) {
    response = () => ({ ok: false, status, json: async () => ({ error }) });
    await assert.rejects(schwabOAuth.authorize());
    assert.equal(tokens.accessToken, "old");
    assert.equal(signIns, 0);
    assert.equal(saves, 0);
  }
  response = () => ({ ok: true, json: async () => ({ access_token: "fresh", expires_in: 1800 }) });
  const before = requests;
  assert.deepEqual(await Promise.all([schwabOAuth.authorize(), schwabOAuth.authorize()]), ["fresh", "fresh"]);
  assert.equal(requests, before + 1);
  assert.equal(tokens.refreshToken, "refresh");
  await refreshRejectedToken("fresh");
  assert.equal(requests, before + 2); // Refresh even when the rejected token is not locally expired.
  await refreshRejectedToken("old");
  assert.equal(requests, before + 2); // Reuse a newer token after another request refreshed it.
  tokens.isExpired = () => true;
  let attempt = 0;
  response = () =>
    ++attempt === 1
      ? { ok: false, status: 400, json: async () => ({ error: "invalid_grant" }) }
      : { ok: true, json: async () => ({ access_token: "signed-in", refresh_token: "new-refresh" }) };
  assert.equal(await schwabOAuth.authorize(), "signed-in");
  assert.equal(signIns, 1);
  assert.equal(prefs.schwabAppKey, "fake-key");
  assert.equal(prefs.schwabAppSecret, "fake-secret");
});
