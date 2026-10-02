const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

const source = ts.transpileModule(readFileSync("src/api/custom-auth.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText;

function setup({ stored, status = 200, payload, networkError, invalidJSON } = {}) {
  const calls = { requests: [], saved: [], authorization: [] };
  const module = { exports: {} };
  runInNewContext(source, {
    exports: module.exports,
    URLSearchParams,
    AbortController,
    setTimeout,
    clearTimeout,
    require(name) {
      assert.equal(name, "node-fetch");
      return async (url, options) => {
        calls.requests.push({ url, options });
        if (networkError) throw new Error("request includes secret-value");
        return {
          ok: status === 200,
          status,
          json: async () => {
            if (invalidJSON) throw new Error("secret-value");
            return payload ?? { access_token: "new-access", refresh_token: "rotated-refresh", expires_in: 21600 };
          },
        };
      };
    },
  });
  const client = {
    getTokens: async () => stored,
    setTokens: async (tokens) => calls.saved.push(tokens),
    authorizationRequest: async (options) => {
      calls.authorization.push(options);
      return { toURL: () => "authorization-url" };
    },
    authorize: async () => ({ authorizationCode: "one-time-code" }),
  };
  return {
    calls,
    make: (id = "12345", secret = "secret-value") => module.exports.createCustomStravaProvider(client, id, secret),
  };
}

test("personal app exchanges its authorization code directly with Strava", async () => {
  const { make, calls } = setup();
  assert.equal(await make().authorize(), "new-access");
  assert.equal(calls.authorization[0].clientId, "12345");
  assert.ok(calls.authorization[0].scope.includes("activity:read_all"));
  assert.ok(!JSON.stringify(calls.authorization).includes("secret-value"));
  const { url, options } = calls.requests[0];
  assert.equal(url, "https://www.strava.com/oauth/token");
  assert.equal(options.method, "POST");
  assert.deepEqual(Object.fromEntries(options.body), {
    client_id: "12345",
    client_secret: "secret-value",
    grant_type: "authorization_code",
    code: "one-time-code",
  });
  assert.equal(calls.saved[0].refreshToken, "rotated-refresh");
});

test("valid stored tokens need no browser or token request", async () => {
  const { make, calls } = setup({ stored: { accessToken: "existing", isExpired: () => false } });
  assert.equal(await make().authorize(), "existing");
  assert.equal(calls.requests.length, 0);
  assert.equal(calls.authorization.length, 0);
});

test("expired tokens refresh and persist the rotated refresh token", async () => {
  const { make, calls } = setup({
    stored: { accessToken: "expired", refreshToken: "old-refresh", isExpired: () => true },
  });
  assert.equal(await make().authorize(), "new-access");
  assert.equal(calls.authorization.length, 0);
  assert.equal(calls.requests[0].options.body.get("grant_type"), "refresh_token");
  assert.equal(calls.requests[0].options.body.get("refresh_token"), "old-refresh");
  assert.equal(calls.saved[0].refreshToken, "rotated-refresh");
});

test("partial or malformed credentials fail before contacting Strava", async () => {
  const { make, calls } = setup();
  await assert.rejects(make("123", "").authorize(), /Enter both/);
  await assert.rejects(make("", "secret").authorize(), /Enter both/);
  await assert.rejects(make("invalid", "secret").authorize(), /only numbers/);
  assert.equal(calls.requests.length, 0);
  assert.equal(calls.authorization.length, 0);
});

for (const status of [400, 401, 403, 429, 500]) {
  test(`HTTP ${status} is recoverable without saving tokens or exposing secrets`, async () => {
    const { make, calls } = setup({
      status,
      payload: { message: "secret-value" },
      stored: { accessToken: "expired", refreshToken: "refresh", isExpired: () => true },
    });
    await assert.rejects(make().authorize(), (error) => !error.message.includes("secret-value"));
    assert.equal(calls.saved.length, 0);
    assert.equal(calls.authorization.length, 0);
  });
}

for (const options of [
  { networkError: true },
  { invalidJSON: true },
  { payload: {} },
  { payload: null, invalidJSON: true },
  { payload: { access_token: "access", refresh_token: "refresh", expires_in: -1 } },
]) {
  test(`invalid token response is rejected: ${JSON.stringify(options)}`, async () => {
    const { make, calls } = setup(options);
    await assert.rejects(make().authorize(), (error) => !error.message.includes("secret-value"));
    assert.equal(calls.saved.length, 0);
  });
}

test("absolute token expiry is converted for Raycast's token storage", async () => {
  const { make, calls } = setup({
    payload: { access_token: "access", refresh_token: "refresh", expires_at: Math.floor(Date.now() / 1000) + 3600 },
  });
  await make().authorize();
  assert.ok(calls.saved[0].expiresIn > 3595 && calls.saved[0].expiresIn <= 3600);
});
