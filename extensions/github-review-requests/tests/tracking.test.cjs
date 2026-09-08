const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { state, reset, api } = require("./harness.cjs");
const { search } = require("../src/attention/lib/github.ts");
const { agingOf } = require("../src/attention/lib/aging.ts");
const { loadConfig, saveConfig, orgQualifier } = require("../src/attention/lib/config.ts");
const { authorIgnoredBy } = require("../src/attention/lib/config.ts");
const {
  diffCandidates,
  recordActivity,
  loadActivity,
  markAllActivityRead,
} = require("../src/attention/lib/activity.ts");
const watch = require("../src/attention/watch.ts").default;
beforeEach(reset);
const comment = (author, createdAt, viewerDidAuthor = false) => ({
  author: { login: author },
  createdAt,
  viewerDidAuthor,
  url: `https://github.com/acme/repo/pull/1#${author}`,
});
function node(overrides = {}) {
  return {
    number: 1,
    title: "Test PR",
    url: "https://github.com/acme/repo/pull/1",
    author: { login: "me" },
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-09-08T00:00:00Z",
    repository: { nameWithOwner: "acme/repo" },
    labels: { nodes: [] },
    assignees: { nodes: [] },
    reviewRequests: { nodes: [] },
    reviewThreads: { nodes: [] },
    reviews: { nodes: [] },
    comments: { nodes: [], totalCount: 0 },
    ...overrides,
  };
}
async function evaluate(pr) {
  global.fetch = async () =>
    new Response(
      JSON.stringify({ data: { search: { nodes: [pr], issueCount: 1, pageInfo: { hasNextPage: false } } } }),
    );
  return (await search("is:pr", "me", 1, ["bot"])).prs[0];
}
test("conversation replies include review bodies and ignore later bot messages", async () => {
  const pr = await evaluate(
    node({
      comments: { nodes: [comment("bot", "2026-09-08T00:00:00Z")], totalCount: 1 },
      reviews: { nodes: [comment("reviewer", "2026-09-01T00:00:00Z")] },
    }),
  );
  assert.equal(pr.awaitingReply, 1);
  assert.equal(pr.awaitingUrl, "https://github.com/acme/repo/pull/1#reviewer");
});
test("our reply clears the conversation signal", async () => {
  const pr = await evaluate(
    node({
      comments: {
        nodes: [comment("reviewer", "2026-09-01T00:00:00Z"), comment("me", "2026-09-02T00:00:00Z", true)],
        totalCount: 2,
      },
    }),
  );
  assert.equal(pr.awaitingReply, 0);
});
test("inline bot comments do not hide an unanswered human reply; resolved threads do not count", async () => {
  const pr = await evaluate(
    node({
      reviewThreads: {
        nodes: [
          {
            isResolved: false,
            comments: { nodes: [comment("reviewer", "2026-09-01T00:00:00Z"), comment("bot", "2026-09-08T00:00:00Z")] },
          },
          { isResolved: true, comments: { nodes: [comment("other", "2026-08-01T00:00:00Z")] } },
        ],
      },
    }),
  );
  assert.equal(pr.awaitingReply, 1);
  assert.equal(pr.latestReplier, "reviewer");
});
test("ageing retains oldest unanswered wait even when a newer thread has activity", async () => {
  const pr = await evaluate(
    node({
      reviewThreads: {
        nodes: [
          { isResolved: false, comments: { nodes: [comment("old", "2026-08-01T00:00:00Z")] } },
          { isResolved: false, comments: { nodes: [comment("new", "2026-09-08T00:00:00Z")] } },
        ],
      },
    }),
  );
  assert.equal(pr.awaitingSince, "2026-08-01T00:00:00Z");
  assert.equal(pr.latestReplier, "new");
  assert.equal(agingOf(pr, Date.parse("2026-09-08T12:00:00Z")).level, "stalled");
});
test("existing owner scope seeds tracking; explicitly clearing it is preserved", async () => {
  state.preferences.owners = "acme, personal-owner";
  const config = await loadConfig();
  assert.deepEqual(config.activeOrgs, ["acme", "personal-owner"]);
  assert.equal(orgQualifier(config), " org:acme org:personal-owner");
  await saveConfig({ ...config, activeOrgs: [] });
  assert.deepEqual((await loadConfig()).activeOrgs, []);
});
test("ignored authors use the same normalization for classic and attention menus", () => {
  assert.equal(authorIgnoredBy(["dependabot"], "dependabot[bot]"), true);
  assert.equal(authorIgnoredBy(["app/renovate"], "renovate[bot]"), true);
});
test("watcher makes zero requests when scheduled tracking is disabled", async () => {
  global.fetch = async () => {
    throw new Error("must not request");
  };
  await watch();
  assert.equal(state.storage.size, 0);
});
test("first run is silent, failed writes remain detectable, and committed events are deduplicated", async () => {
  const pr = {
    repository: "acme/repo",
    number: 1,
    lastActivity: new Date().toISOString(),
    comments: 0,
    unresolved: 0,
    awaitingReply: 0,
    reviewDecision: "",
  };
  const candidates = [{ kind: "review-requested", pr }];
  assert.equal((await diffCandidates(candidates)).changes.length, 0);
  pr.comments = 1;
  let diff = await diffCandidates(candidates);
  assert.equal(diff.changes.length, 1);
  const event = { id: "event-1", at: new Date().toISOString(), read: false };
  state.failWrite = "gh-review.activity";
  await assert.rejects(recordActivity([event]), /storage unavailable/);
  diff = await diffCandidates(candidates);
  assert.equal(diff.changes.length, 1);
  state.failWrite = undefined;
  await recordActivity([event]);
  await diff.commit();
  assert.equal((await diffCandidates(candidates)).changes.length, 0);
  assert.equal((await recordActivity([event])).length, 0);
  await markAllActivityRead();
  assert.equal((await loadActivity())[0].read, true);
});
