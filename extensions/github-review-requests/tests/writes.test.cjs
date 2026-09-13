const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { reset } = require("./harness.cjs");
const { graphql, UnconfirmedWriteError } = require("../src/attention/lib/graphql.ts");
const { addComment, replyToThread, setThreadResolved, ownerRepos } = require("../src/attention/lib/github.ts");

/**
 * Answers each call with the next scripted response, repeating the last one,
 * and returns the array the sent requests accumulate in.
 */
function respondWith(...responses) {
  const sent = [];
  global.fetch = async (_url, options) => {
    sent.push(JSON.parse(options.body));
    return responses[Math.min(sent.length - 1, responses.length - 1)]();
  };
  return sent;
}

const networkFailure = () => () => {
  throw new TypeError("fetch failed");
};
const serverError = (status = 502) => () => new Response("upstream blew up", { status });
const rateLimited = () =>
  () =>
    new Response("You have exceeded a secondary rate limit", {
      status: 403,
      headers: { "retry-after": "0" },
    });
const json = payload => () => new Response(JSON.stringify({ data: payload }));

const COMMENT = { author: { login: "tester" }, bodyText: "looks good", createdAt: "2026-09-11T09:00:00Z" };

beforeEach(() => {
  reset();
});

test("a comment is not posted twice when the response is lost", async () => {
  const sent = respondWith(networkFailure());
  await assert.rejects(addComment("pr-node-id", "looks good"), UnconfirmedWriteError);
  assert.equal(sent.length, 1, "the write must not be replayed");
});

test("a thread reply is not replayed after a 5xx", async () => {
  const sent = respondWith(serverError());
  await assert.rejects(replyToThread("thread-id", "looks good"), UnconfirmedWriteError);
  assert.equal(sent.length, 1);
});

test("an unconfirmed write tells the reader to check GitHub first", async () => {
  respondWith(networkFailure());
  await assert.rejects(replyToThread("thread-id", "looks good"), error => {
    assert.match(error.message, /did not confirm/);
    assert.match(error.message, /check the pull request on GitHub/);
    return true;
  });
});

test("a rate-limited write still retries, since GitHub refused to run it", async () => {
  const sent = respondWith(rateLimited(), json({ addComment: { commentEdge: { node: COMMENT } } }));
  assert.deepEqual(await addComment("pr-node-id", "looks good"), {
    author: "tester",
    body: "looks good",
    createdAt: "2026-09-11T09:00:00Z",
  });
  assert.equal(sent.length, 2);
});

test("reads and idempotent mutations keep retrying through a 5xx", async () => {
  const read = respondWith(serverError(500), json({ viewer: { login: "tester" } }));
  assert.equal((await graphql("query { viewer { login } }")).viewer.login, "tester");
  assert.equal(read.length, 2);

  const resolve = respondWith(serverError(500), json({ resolveReviewThread: { thread: { id: "thread-id" } } }));
  await setThreadResolved("thread-id", true);
  assert.equal(resolve.length, 2, "resolving twice lands on the same state, so retrying is safe");
});

test("watched repositories resolve personal owners as well as organizations", async () => {
  const sent = respondWith(json({ repositoryOwner: { repositories: { pageInfo: {}, nodes: [{ name: "dotfiles", owner: { login: "tester" } }] } } }));
  assert.deepEqual(await ownerRepos("tester"), [{ owner: "tester", name: "dotfiles" }]);
  assert.match(sent[0].query, /repositoryOwner\(login: \$owner\)/);
  assert.doesNotMatch(sent[0].query, /organization\(login:/);
  assert.equal(sent[0].variables.owner, "tester");
});

test("an owner GitHub cannot resolve yields nothing instead of failing the whole scope", async () => {
  respondWith(json({ repositoryOwner: null }));
  assert.deepEqual(await ownerRepos("no-such-login"), []);
});
