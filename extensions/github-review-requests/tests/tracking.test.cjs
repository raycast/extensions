const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { state, reset, api } = require("./harness.cjs");
const { search } = require("../src/attention/lib/github.ts");
const { agingOf } = require("../src/attention/lib/aging.ts");
const { loadConfig, saveConfig, ownerQualifier } = require("../src/attention/lib/config.ts");
const { authorIgnoredBy } = require("../src/attention/lib/config.ts");
const {
  diffCandidates,
  recordActivity,
  loadActivity,
  markActivityRead,
  markAllActivityRead,
  clearActivity,
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
  assert.equal(ownerQualifier(config), " user:acme user:personal-owner");
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
  state.failWrite = "gh-review.activity.event-1";
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

// ---------------------------------------------------------------------------
// Overlapping checks
//
// The scheduled watcher and a check you start yourself are separate processes
// sharing storage. Neither may drop what the other just recorded.
// ---------------------------------------------------------------------------

const hoursAgo = h => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
const entry = (id, at = new Date().toISOString()) => ({ id, at, read: false, summary: id });

test("two checks running at once keep both of their entries", async () => {
  const [scheduled, manual] = await Promise.all([
    recordActivity([entry("scheduled")]),
    recordActivity([entry("manual")]),
  ]);
  assert.equal(scheduled.length, 1);
  assert.equal(manual.length, 1);

  const inbox = await loadActivity();
  assert.deepEqual(
    inbox.map(e => e.id).sort(),
    ["manual", "scheduled"],
    "an entry recorded by the other run must survive",
  );
});

test("reading the inbox while a check records does not swallow the new entry", async () => {
  await recordActivity([entry("older")]);
  await Promise.all([markActivityRead(["older"]), recordActivity([entry("newer")])]);

  const inbox = await loadActivity();
  assert.deepEqual(inbox.map(e => e.id).sort(), ["newer", "older"]);
  assert.equal(inbox.find(e => e.id === "older").read, true);
  assert.equal(inbox.find(e => e.id === "newer").read, false, "marking one entry read must not touch another");
});

test("recording the same event twice writes it once", async () => {
  await recordActivity([entry("same")]);
  assert.equal((await recordActivity([entry("same")])).length, 0);
  assert.equal((await loadActivity()).length, 1);
});

test("entries past the retention window are deleted, not just hidden", async () => {
  await recordActivity([entry("stale", hoursAgo(80))]);
  await recordActivity([entry("fresh")]);

  assert.deepEqual((await loadActivity()).map(e => e.id), ["fresh"]);
  const stored = Object.keys(await api.LocalStorage.allItems()).filter(k => k.startsWith("gh-review.activity."));
  assert.deepEqual(stored, ["gh-review.activity.fresh"], "the expired entry must leave storage too");
});

test("two checks committing at once keep both of their baselines", async () => {
  const pr = (number, comments) => ({
    repository: "acme/repo",
    number,
    lastActivity: new Date().toISOString(),
    comments,
    unresolved: 0,
    awaitingReply: 0,
    reviewDecision: "",
  });
  // Establish a baseline both runs start from, then let them diverge: the
  // scheduled watcher covers both pull requests, a check from the settings
  // screen only the one it was asked about.
  const scheduled = [
    { kind: "review-requested", pr: pr(1, 0) },
    { kind: "awaiting-reply", pr: pr(2, 0) },
  ];
  await (await diffCandidates(scheduled)).commit();

  const manual = [{ kind: "review-requested", pr: pr(1, 1) }];
  const [a, b] = await Promise.all([diffCandidates(scheduled), diffCandidates(manual)]);
  await Promise.all([a.commit(), b.commit()]);

  const after = await diffCandidates(scheduled);
  assert.deepEqual(
    after.changes.map(c => c.pr.number),
    [1],
    "only the pull request that actually changed may come back; #2's fingerprint must survive the other commit",
  );
});

test("fingerprints for pull requests no longer in scope are forgotten", async () => {
  const stale = JSON.stringify({
    "review-requested:acme/repo#9": { sig: "old", seen: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString() },
  });
  await api.LocalStorage.setItem("gh-review.watch-signatures", stale);

  const pr = {
    repository: "acme/repo",
    number: 1,
    lastActivity: new Date().toISOString(),
    comments: 0,
    unresolved: 0,
    awaitingReply: 0,
    reviewDecision: "",
  };
  await (await diffCandidates([{ kind: "review-requested", pr }])).commit();

  const saved = JSON.parse(await api.LocalStorage.getItem("gh-review.watch-signatures"));
  assert.deepEqual(Object.keys(saved), ["review-requested:acme/repo#1"], "the merged map must not grow forever");
});

test("a baseline written before entries carried a timestamp is kept", async () => {
  await api.LocalStorage.setItem(
    "gh-review.watch-signatures",
    JSON.stringify({ "review-requested:acme/repo#1": "1|0|0|0|" }),
  );
  const pr = {
    repository: "acme/repo",
    number: 1,
    lastActivity: "1",
    comments: 0,
    unresolved: 0,
    awaitingReply: 0,
    reviewDecision: "",
  };
  const diff = await diffCandidates([{ kind: "review-requested", pr }]);
  assert.deepEqual(diff.changes, [], "an upgrade must not look like a fresh install");
});

test("activity older than the retention window is not reported as recorded", async () => {
  assert.deepEqual(
    await recordActivity([entry("stale", hoursAgo(80))]),
    [],
    "reporting it would advance the baseline over activity the inbox never held",
  );
  const stored = Object.keys(await api.LocalStorage.allItems()).filter(k => k.startsWith("gh-review.activity."));
  assert.deepEqual(stored, [], "it must not be written only to be swept up in the same call");
});

test("a full inbox makes room for a new entry instead of dropping it", async () => {
  // 500 is the cap, and every one of these is newer than the entry that follows.
  const full = Array.from({ length: 500 }, (_, i) => entry(`old-${i}`, hoursAgo(1)));
  await recordActivity(full);

  const late = entry("late", hoursAgo(2));
  assert.deepEqual(await recordActivity([late]), [late], "a kept entry is reported");

  const inbox = await loadActivity();
  assert.equal(inbox.length, 500, "the cap still holds");
  assert.ok(
    inbox.some(e => e.id === "late"),
    "the entry this run reported must be in the inbox",
  );
  assert.ok(await api.LocalStorage.getItem("gh-review.activity.late"), "and in storage");
});

test("an inbox written under the old single key is carried over, once", async () => {
  await api.LocalStorage.setItem("gh-review.activity", JSON.stringify([entry("legacy")]));

  assert.deepEqual((await loadActivity()).map(e => e.id), ["legacy"]);
  assert.equal(await api.LocalStorage.getItem("gh-review.activity"), undefined, "the old key is not left behind");

  await recordActivity([entry("after")]);
  assert.deepEqual((await loadActivity()).map(e => e.id).sort(), ["after", "legacy"]);
});

test("clearing the inbox leaves nothing behind", async () => {
  await recordActivity([entry("one"), entry("two")]);
  await clearActivity();

  assert.deepEqual(await loadActivity(), []);
  const left = Object.keys(await api.LocalStorage.allItems()).filter(k => k.startsWith("gh-review.activity"));
  assert.deepEqual(left, []);
});
