const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");
const { runInThisContext } = require("node:vm");
const ts = require("typescript");

function loadModule(path, dependencies) {
  const filename = resolve(__dirname, "..", path);
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

const { ClientV2 } = loadModule("src/v2/lib/twitterapi_v2.ts", {
  "@raycast/api": {
    Cache: class extends Map {
      constructor() {
        super();
      }
      remove(key) {
        return this.delete(key);
      }
    },
  },
  "node:fs/promises": require("node:fs/promises"),
  "node:path": require("node:path"),
  react: {},
  "twitter-api-v2": require("twitter-api-v2"),
  "./oauth": {},
  "./twitter": loadModule("src/v2/lib/twitter.ts", {}),
  "../../utils": loadModule("src/utils.ts", {}),
  "./post_search": loadModule("src/v2/lib/post_search.ts", {}),
});

const participant = { id: "100", name: "Participant", username: "participant" };
// Adjacent snowflakes must stay distinct strings, not lose precision through Number().
const target = { id: "2091064589136093573", name: "Target", username: "target" };
const other = { id: "2091064589136093574", name: "Target", username: "other", description: "@target" };
const page = (data, nextToken) => ({ data, meta: { result_count: data.length, next_token: nextToken } });

function fixture(pages, profiles = { participant, target }) {
  const client = new ClientV2();
  client.clearCache();
  const calls = [];
  client.me = async () => assert.fail("Arbitrary-account lookups must never substitute the signed-in account");
  client.request = async (operation) => {
    const readConnections = (relationship) => async (id, options) => {
      calls.push({ relationship, id, options });
      const response = pages[options.pagination_token ?? "first"];
      assert.notEqual(response, undefined, "Unexpected pagination request");
      if (response instanceof Error) throw response;
      return response;
    };
    return operation({
      v2: {
        userByUsername: async (username) => {
          calls.push({ username });
          const user = profiles[username];
          if (user instanceof Error) throw user;
          assert.ok(user, `Unexpected username: ${username}`);
          return { data: user };
        },
        following: readConnections("following"),
        followers: readConnections("followers"),
      },
    });
  };
  return { client, calls };
}

test("list tools use the requested account and direction, preserve cursors, and fetch only one page", async () => {
  for (const relationship of ["following", "followers"]) {
    const { client, calls } = fixture({ first: page([other], "next"), next: page([], "after-empty") });
    const tool = loadModule("src/tools/get-user-connections.ts", {
      "../v2/lib/twitterapi_v2": { clientV2: client },
    }).default;
    const result = await tool({ username: " @PARTICIPANT ", relationship });
    assert.equal(result.user.id, participant.id);
    assert.equal(result.relationship, relationship);
    assert.equal(result.nextToken, "next");
    const reads = calls.filter((call) => call.relationship);
    assert.equal(reads.length, 1);
    assert.equal(reads[0].id, participant.id);
    assert.equal(reads[0].relationship, relationship);
    assert.equal(reads[0].options.max_results, 20);
    const next = await tool({ username: "participant", relationship, nextToken: result.nextToken });
    assert.deepEqual(next.items, []);
    assert.equal(next.nextToken, "after-empty");
    assert.equal(calls.filter((call) => call.relationship).length, 2);
  }
});

test("verification matches exact IDs across an empty intermediate page and stops at the match", async () => {
  const { client, calls } = fixture({
    first: page([other], "empty"),
    empty: page([], "match"),
    match: page([target], "never-fetch"),
  });
  const tool = loadModule("src/tools/check-follow-relationship.ts", {
    "../v2/lib/twitterapi_v2": { clientV2: client },
  }).default;
  const result = await tool({ sourceUsername: " @PARTICIPANT ", targetUsername: "@TARGET" });
  assert.equal(result.status, "following");
  assert.equal(result.reason, "match_found");
  assert.equal(result.sourceUserId, participant.id);
  assert.equal(result.targetUserId, target.id);
  assert.equal(result.pagesChecked, 3);
  assert.equal(result.usersChecked, 2);
  assert.equal(result.reachedEnd, false);
  assert.equal(result.maxPages, 10);
  const reads = calls.filter((call) => call.relationship);
  assert.equal(reads.length, 3);
  assert.ok(reads.every((call) => call.id === participant.id && call.relationship === "following"));
  assert.ok(reads.every((call) => call.options.max_results === 1000));
});

test("a negative requires every page, and a matching display name or bio is insufficient", async () => {
  const { client } = fixture({ first: page([other], "last"), last: page([]) });
  const result = await client.checkFollowRelationship("participant", "target");
  assert.equal(result.status, "not_following");
  assert.equal(result.reason, "complete_list");
  assert.equal(result.reachedEnd, true);
  assert.equal(result.pagesChecked, 2);
});

test("reversing the requested relationship scans the other user's following", async () => {
  const { client, calls } = fixture({ first: page([participant]) });
  const result = await client.checkFollowRelationship("target", "participant");
  assert.equal(result.status, "following");
  assert.equal(calls.find((call) => call.relationship).id, target.id);
});

test("the page budget leaves an unresolved relationship unverified", async () => {
  const { client, calls } = fixture({ first: page([other], "unread") });
  const result = await client.checkFollowRelationship("participant", "target", 1);
  assert.equal(result.status, "unverified");
  assert.equal(result.reason, "page_limit");
  assert.equal(result.reachedEnd, false);
  assert.equal(result.pagesChecked, 1);
  assert.equal(calls.filter((call) => call.relationship).length, 1);
});

test("a match or complete list on the final allowed page remains conclusive", async () => {
  for (const [data, status] of [
    [[target], "following"],
    [[other], "not_following"],
  ]) {
    const { client } = fixture({ first: page(data) });
    assert.equal((await client.checkFollowRelationship("participant", "target", 1)).status, status);
  }
});

test("a repeated pagination token stops verification without a false negative", async () => {
  const { client } = fixture({ first: page([other], "same"), same: page([], "same") });
  const result = await client.checkFollowRelationship("participant", "target");
  assert.equal(result.status, "unverified");
  assert.equal(result.reason, "pagination_loop");
  assert.equal(result.pagesChecked, 2);
});

test("protected, missing, rate-limited, and network failures remain unverified with their error", async () => {
  for (const message of ["403 protected account", "404 unavailable", "429 rate limit", "Network unavailable"]) {
    const { client } = fixture({ first: page([other], "failure"), failure: new Error(message) });
    const result = await client.checkFollowRelationship("participant", "target");
    assert.equal(result.status, "unverified");
    assert.equal(result.reason, "lookup_failed");
    assert.equal(result.reachedEnd, false);
    assert.equal(result.pagesChecked, 1);
    assert.equal(result.error, message);
  }
});

test("profile lookup failures do not scan connections or produce a negative", async () => {
  const { client, calls } = fixture({}, { participant, target: new Error("Account unavailable") });
  const result = await client.checkFollowRelationship("participant", "target");
  assert.equal(result.status, "unverified");
  assert.equal(result.pagesChecked, 0);
  assert.equal(result.error, "Account unavailable");
  assert.equal(calls.filter((call) => call.relationship).length, 0);
});

test("partial errors and malformed pages cannot establish absence", async () => {
  for (const response of [
    { ...page([]), errors: [{ title: "Forbidden", detail: "Some users unavailable", type: "about:blank" }] },
    {},
    { data: [] },
    { data: [], meta: {} },
    { data: [], meta: { result_count: 1 } },
    { data: null, meta: { result_count: 0 } },
    page([{}]),
    page([], ""),
    page([], null),
  ]) {
    const { client } = fixture({ first: response });
    const result = await client.checkFollowRelationship("participant", "target");
    assert.equal(result.status, "unverified");
    assert.equal(result.reason, "lookup_failed");
    assert.match(result.error, /incomplete/);
  }
});

test("list tools surface incomplete data and do not cache failures", async () => {
  const pages = { first: { ...page([]), errors: [{ title: "Forbidden", type: "about:blank" }] } };
  const { client, calls } = fixture(pages);
  await assert.rejects(client.getUserConnections("participant", "followers"), /Forbidden/);
  pages.first = page([other]);
  assert.equal((await client.getUserConnections("participant", "followers")).items.length, 1);
  assert.equal(calls.filter((call) => call.relationship).length, 2);
});

test("successful pages are cached separately by account, relationship, cursor, and page size", async () => {
  const { client, calls } = fixture({ first: page([other]) });
  await client.getUserConnections("participant", "following");
  await client.getUserConnections("participant", "following");
  await client.getUserConnections("participant", "followers");
  await client.getUserConnections("target", "following");
  await client.checkFollowRelationship("participant", "target");
  await client.checkFollowRelationship("participant", "target");
  assert.equal(calls.filter((call) => call.relationship).length, 4);
});

test("invalid handles, direction, and page budgets fail before any API reads", async () => {
  const { client, calls } = fixture({});
  for (const value of ["", "@", "invalid handle", "https://x.com/person"]) {
    await assert.rejects(client.checkFollowRelationship(value, "target"), /username/);
    await assert.rejects(client.checkFollowRelationship("participant", value), /username/);
    await assert.rejects(client.getUserConnections(value, "followers"), /username/);
  }
  for (const budget of [0, 11, 1.5, NaN]) {
    await assert.rejects(client.checkFollowRelationship("participant", "target", budget), /maxPages/);
  }
  await assert.rejects(client.getUserConnections("participant", "likes"), /relationship/);
  assert.equal(calls.length, 0);
});

test("personal connection search retains its following-first fallback behavior", async () => {
  for (const [data, expectedRelationships] of [
    [[other], ["following"]],
    [[], ["following", "followers"]],
  ]) {
    const { client, calls } = fixture({ first: page(data) });
    client.me = async () => participant;
    const result = await client.searchMyConnections(["other"]);
    assert.deepEqual(result.relationshipsSearched, expectedRelationships);
    assert.deepEqual(
      calls.map((call) => call.relationship),
      expectedRelationships,
    );
  }
});
