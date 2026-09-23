const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { state, reset } = require("./harness.cjs");
const { token, forgetToken } = require("../src/attention/lib/gh-cli.ts");
const { checkGhStatus } = require("../src/attention/lib/gh-status.ts");
const { graphql } = require("../src/attention/lib/graphql.ts");
const { getLogin } = require("../src/integration/getLogin.ts");
const { prepareAuthCache } = require("../src/attention/lib/auth-cache.ts");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "raycast-auth-test-"));
const cli = path.join(temp, "gh");
fs.writeFileSync(
  cli,
  '#!/bin/sh\nif [ "$2" = "token" ]; then printf "test-cli-token"; else printf "Token scopes: repo, read:org"; fi\n',
  { mode: 0o700 },
);
after(() => fs.rmSync(temp, { recursive: true, force: true }));
beforeEach(() => {
  reset();
  forgetToken();
  global.fetch = async () => new Response(JSON.stringify({ data: { viewer: { login: "tester" } } }));
});
test("existing PAT preference works with no CLI and no new preference", async () => {
  assert.equal(await token(""), "test-pat");
  assert.deepEqual(await checkGhStatus(), { state: "ready", login: "tester", scopes: [], missingScopes: [] });
});
test("missing PAT does not fall back to a working gh installation", async () => {
  state.preferences = { ghPath: cli };
  await assert.rejects(token(""), /Personal Access Token is missing/);
  assert.equal((await checkGhStatus()).state, "not-authenticated");
});
test("explicit CLI choice ignores the saved PAT", async () => {
  state.preferences = { authMethod: "gh", token: "wrong-pat", ghPath: cli };
  assert.equal(await token(""), "test-cli-token");
  assert.equal((await checkGhStatus()).state, "ready");
});
test("broken CLI does not fall back to a valid PAT", async () => {
  state.preferences.authMethod = "gh";
  await assert.rejects(token(""), /No gh binary/);
});
test("rejected PAT reports PAT repair and never invokes CLI", async () => {
  global.fetch = async () => new Response("Bad credentials", { status: 401 });
  await assert.rejects(
    graphql("query { viewer { login } }"),
    error => /Personal Access Token/.test(error.message) && /preferences/.test(error.hint),
  );
});
test("original identity and new queries send the same explicitly selected credential", async () => {
  for (const method of ["pat", "gh"]) {
    state.preferences = { authMethod: method, token: "test-pat", ghPath: cli };
    const expected = method === "pat" ? "test-pat" : "test-cli-token";
    global.fetch = async (_url, options) => {
      assert.equal(new Headers(options.headers).get("Authorization"), `bearer ${expected}`);
      assert.equal(JSON.parse(options.body).query.includes("viewer"), true);
      return new Response(JSON.stringify({ data: { viewer: { login: "tester" } } }));
    };
    assert.equal(await getLogin(), "tester");
    assert.equal((await graphql("query { viewer { login } }")).viewer.login, "tester");
  }
});
test("switching credentials clears cached account data but preserves tracking configuration", async () => {
  state.storage.set("recentlyVisitedPulls", "old history");
  await prepareAuthCache("first-token");
  assert.equal(state.storage.get("recentlyVisitedPulls"), "old history");
  state.storage.set("gh-review.config", "saved configuration");
  state.storage.set("gh-review.activity", "old private activity");
  state.storage.set("githubAPITokenLastValue", "old-token-copy");
  await prepareAuthCache("second-token");
  assert.equal(state.storage.has("recentlyVisitedPulls"), false);
  assert.equal(state.storage.has("gh-review.activity"), false);
  assert.equal(state.storage.has("githubAPITokenLastValue"), false);
  assert.equal(state.storage.get("gh-review.config"), "saved configuration");
  assert.equal(state.clears, 1);
  assert.ok(!JSON.stringify([...state.storage]).includes("second-token"));
});

test("the original search/menu GraphQL client uses both selected authentication methods", async () => {
  const client = require("../src/integration/graphQLClient.ts").default;
  for (const method of ["pat", "gh"]) {
    state.preferences = { authMethod: method, token: "test-pat", ghPath: cli };
    global.fetch = async (_url, options) => {
      assert.equal(new Headers(options.headers).get("Authorization"), `bearer ${method === "pat" ? "test-pat" : "test-cli-token"}`);
      return new Response(JSON.stringify({ data: { viewer: { login: "tester" } } }), { headers: { "Content-Type": "application/json" } });
    };
    assert.equal((await client.request("query { viewer { login } }")).viewer.login, "tester");
  }
});
