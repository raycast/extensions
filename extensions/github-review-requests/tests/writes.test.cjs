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
const serverError =
  (status = 502) =>
  () =>
    new Response("upstream blew up", { status });
const rateLimited = () => () =>
  new Response("You have exceeded a secondary rate limit", {
    status: 403,
    headers: { "retry-after": "0" },
  });
const json = payload => () => new Response(JSON.stringify({ data: payload }));
/** Headers arrive, then the body stream dies — GitHub already ran the mutation. */
const interruptedBody = () => () =>
  new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"data":'));
        controller.error(new Error("socket hang up"));
      },
    }),
  );
const unreadableBody = () => () => new Response("<html>502 Bad Gateway</html>", { status: 200 });
const emptyBody = () => () => new Response(JSON.stringify({}));
/** A 200 carrying whatever GitHub answered a mutation with. */
const payload = body => () => new Response(JSON.stringify(body));

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

test("a write whose response is interrupted is reported unconfirmed, not failed", async () => {
  const sent = respondWith(interruptedBody());
  await assert.rejects(addComment("pr-node-id", "looks good"), UnconfirmedWriteError);
  assert.equal(sent.length, 1, "the write must not be replayed");
});

test("a write whose response cannot be parsed is reported unconfirmed", async () => {
  const sent = respondWith(unreadableBody());
  await assert.rejects(replyToThread("thread-id", "looks good"), UnconfirmedWriteError);
  assert.equal(sent.length, 1);
});

test("a write answered with neither data nor errors is reported unconfirmed", async () => {
  const sent = respondWith(emptyBody());
  await assert.rejects(addComment("pr-node-id", "looks good"), UnconfirmedWriteError);
  assert.equal(sent.length, 1);
});

test("a write whose result GitHub left out is reported unconfirmed", async () => {
  const sent = respondWith(json({ addComment: { commentEdge: { node: null } } }));
  await assert.rejects(addComment("pr-node-id", "looks good"), UnconfirmedWriteError);
  assert.equal(sent.length, 1, "the write must not be replayed");

  const reply = respondWith(json({ addPullRequestReviewThreadReply: null }));
  await assert.rejects(replyToThread("thread-id", "looks good"), UnconfirmedWriteError);
  assert.equal(reply.length, 1);
});

test("a write answered with an error and no result is reported unconfirmed", async () => {
  const sent = respondWith(
    payload({
      data: { addComment: null },
      errors: [{ message: "Something went wrong while executing your query." }],
    }),
  );
  await assert.rejects(addComment("pr-node-id", "looks good"), error => {
    assert.ok(error instanceof UnconfirmedWriteError);
    assert.match(error.message, /Something went wrong/);
    assert.match(error.message, /check the pull request on GitHub/);
    return true;
  });
  assert.equal(sent.length, 1, "the write must not be replayed");
});

test("a partial result counts as posted, since the comment is on the pull request", async () => {
  const sent = respondWith(
    payload({
      data: { addComment: { commentEdge: { node: { author: null, bodyText: null, createdAt: null } } } },
      errors: [{ message: "Something went wrong while executing your query." }],
    }),
  );
  const posted = await addComment("pr-node-id", "looks good");
  assert.equal(posted.body, "looks good", "the text that was sent stands in for the field GitHub dropped");
  assert.equal(posted.author, "");
  assert.ok(Date.parse(posted.createdAt) > 0);
  assert.equal(sent.length, 1);
});

test("a write GitHub refused before running it stays an ordinary failure", async () => {
  const sent = respondWith(
    payload({
      data: { addComment: null },
      errors: [{ type: "NOT_FOUND", message: "Could not resolve to a node with the global id of 'pr-node-id'." }],
    }),
  );
  await assert.rejects(replyToThread("thread-id", "looks good"), error => {
    assert.equal(error.name, "GraphQLError");
    assert.doesNotMatch(error.message, /did not confirm/);
    return true;
  });
  assert.equal(sent.length, 1);
});

test("a write answered with a bare JSON null is reported unconfirmed", async () => {
  const sent = respondWith(payload(null));
  await assert.rejects(addComment("pr-node-id", "looks good"), error => {
    assert.ok(error instanceof UnconfirmedWriteError, "valid JSON is not the same as a GraphQL result");
    assert.match(error.message, /check the pull request on GitHub/);
    return true;
  });
  assert.equal(sent.length, 1, "the write must not be replayed");

  const list = respondWith(payload([]));
  await assert.rejects(replyToThread("thread-id", "looks good"), UnconfirmedWriteError);
  assert.equal(list.length, 1);
});

test("an error raised after the mutation ran leaves the write unconfirmed", async () => {
  // Same NOT_FOUND that rejects a bad node id, but raised deeper in the
  // selection — execution had already begun, so the comment may exist.
  const sent = respondWith(
    payload({
      data: { addComment: null },
      errors: [
        {
          type: "NOT_FOUND",
          message: "Could not resolve to a User.",
          path: ["addComment", "commentEdge", "node", "author"],
        },
      ],
    }),
  );
  await assert.rejects(addComment("pr-node-id", "looks good"), UnconfirmedWriteError);
  assert.equal(sent.length, 1);
});

test("a write answered with a malformed errors list is reported unconfirmed", async () => {
  // An entry that can't be read establishes nothing about the write, and
  // reading `.message` off it must not become the failure itself.
  const sent = respondWith(payload({ data: { addComment: null }, errors: [null] }));
  await assert.rejects(addComment("pr-node-id", "looks good"), error => {
    assert.ok(error instanceof UnconfirmedWriteError);
    assert.match(error.message, /check the pull request on GitHub/);
    return true;
  });
  assert.equal(sent.length, 1, "the write must not be replayed");

  const empty = respondWith(payload({ data: { addComment: null }, errors: [] }));
  await assert.rejects(replyToThread("thread-id", "looks good"), UnconfirmedWriteError);
  assert.equal(empty.length, 1);
});

test("a read answered with partial data and an error still fails", async () => {
  respondWith(payload({ data: { viewer: null }, errors: [{ message: "Something went wrong" }] }));
  await assert.rejects(graphql("query { viewer { login } }"), error => {
    assert.equal(error.name, "GraphQLError");
    return true;
  });
});

test("an unreadable response to a read stays an ordinary failure", async () => {
  const sent = respondWith(unreadableBody());
  await assert.rejects(graphql("query { viewer { login } }"), error => {
    assert.equal(error.name, "GraphQLError");
    assert.doesNotMatch(error.message, /did not confirm/);
    return true;
  });
  assert.equal(sent.length, 1);
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
  const sent = respondWith(
    json({
      repositoryOwner: { repositories: { pageInfo: {}, nodes: [{ name: "dotfiles", owner: { login: "tester" } }] } },
    }),
  );
  assert.deepEqual(await ownerRepos("tester"), [{ owner: "tester", name: "dotfiles" }]);
  assert.match(sent[0].query, /repositoryOwner\(login: \$owner\)/);
  assert.doesNotMatch(sent[0].query, /organization\(login:/);
  assert.equal(sent[0].variables.owner, "tester");
});

test("an owner GitHub cannot resolve yields nothing instead of failing the whole scope", async () => {
  respondWith(json({ repositoryOwner: null }));
  assert.deepEqual(await ownerRepos("no-such-login"), []);
});
