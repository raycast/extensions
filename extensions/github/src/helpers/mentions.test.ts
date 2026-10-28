import assert from "node:assert/strict";
import { resolve } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

type Mentions = typeof import("./mentions");

async function load(): Promise<Mentions> {
  return (await import(pathToFileURL(resolve("src/helpers/mentions.ts")).href)) as Mentions;
}

const issue = {
  number: 42,
  title: "Crash on launch",
  closed: false,
  stateReason: null,
  repository: { nameWithOwner: "raycast/extensions" },
  author: { login: "octocat" },
};

const pullRequest = {
  number: 7,
  title: "Add mentions",
  closed: false,
  merged: false,
  isDraft: false,
  repository: { nameWithOwner: "raycast/extensions" },
  author: { login: "octocat" },
};

const repository = {
  nameWithOwner: "raycast/extensions",
  description: "  Everything\n you need  ",
  isPrivate: false,
  isArchived: false,
  owner: { avatarUrl: "https://avatars.githubusercontent.com/u/1?s=64" },
};

test("issues, pull requests, and repositories map to mention rows with stable URIs", async () => {
  const { toIssueMention, toPullRequestMention, toRepositoryMention } = await load();

  assert.deepEqual(toIssueMention(issue), {
    title: "Crash on launch",
    uri: "github://issues/raycast/extensions/42",
    description: "raycast/extensions#42 · Open · octocat",
    icon: "issue-open.svg",
  });
  assert.deepEqual(toIssueMention({ ...issue, closed: true, stateReason: "NOT_PLANNED", author: null }), {
    title: "Crash on launch",
    uri: "github://issues/raycast/extensions/42",
    description: "raycast/extensions#42 · Closed as not planned",
    icon: "issue-closed.svg",
  });

  assert.deepEqual(toPullRequestMention(pullRequest), {
    title: "Add mentions",
    uri: "github://pulls/raycast/extensions/7",
    description: "raycast/extensions#7 · Open · octocat",
    icon: "pull-request-open.svg",
  });
  assert.equal(toPullRequestMention({ ...pullRequest, isDraft: true }).icon, "pull-request-draft.svg");
  assert.equal(toPullRequestMention({ ...pullRequest, closed: true, merged: true }).icon, "pull-request-merged.svg");
  assert.equal(
    toPullRequestMention({ ...pullRequest, closed: true }).description,
    "raycast/extensions#7 · Closed · octocat",
  );

  assert.deepEqual(toRepositoryMention(repository), {
    title: "raycast/extensions",
    uri: "github://repos/raycast/extensions",
    description: "Everything you need",
    icon: "https://avatars.githubusercontent.com/u/1?s=64",
  });
  assert.equal(
    toRepositoryMention({ ...repository, isPrivate: true, isArchived: true, description: null }).description,
    "Private · Archived",
  );
});

test("search nodes of other types are dropped, duplicates removed, and results capped at 50", async () => {
  const { mentionNodes, toMentions, toIssueMention } = await load();
  const nodes = [{}, null, issue, issue, ...Array.from({ length: 60 }, (_, i) => ({ ...issue, number: i + 100 }))];
  const mentions = toMentions(mentionNodes<typeof issue>(nodes, "number"), toIssueMention);

  assert.equal(mentions.length, 50);
  assert.equal(mentions[0].uri, "github://issues/raycast/extensions/42");
  assert.equal(mentions[1].uri, "github://issues/raycast/extensions/100");
});

test("an empty query lists open items you're involved in, a typed query searches everything", async () => {
  const { buildItemSearchQuery } = await load();

  assert.equal(buildItemSearchQuery("issue", "  "), "is:issue is:open archived:false involves:@me sort:updated-desc");
  assert.equal(buildItemSearchQuery("pr", ""), "is:pr is:open archived:false involves:@me sort:updated-desc");
  assert.equal(buildItemSearchQuery("issue", "crash #123 repo:a/b"), "is:issue archived:false crash 123 repo:a/b");
  assert.equal(buildItemSearchQuery("pr", "is:merged mentions"), "is:pr archived:false is:merged mentions");
});

test("typed repository search includes forks unless the query already sets fork:", async () => {
  const { buildRepositorySearchQuery } = await load();

  assert.equal(buildRepositorySearchQuery("raycast"), "raycast fork:true");
  assert.equal(buildRepositorySearchQuery("  raycast/extensions  "), "raycast/extensions fork:true");
  assert.equal(buildRepositorySearchQuery("gitx fork:true"), "gitx fork:true");
  assert.equal(buildRepositorySearchQuery("gitx fork:only"), "gitx fork:only");
  assert.equal(buildRepositorySearchQuery("gitx fork:false"), "gitx fork:false");
  assert.equal(buildRepositorySearchQuery("-fork:true gitx"), "-fork:true gitx");
});

test("references and GitHub URLs resolve to an exact item", async () => {
  const { parseItemReference } = await load();
  const expected = { owner: "raycast", name: "extensions", number: 32894 };

  assert.deepEqual(parseItemReference("raycast/extensions#32894"), expected);
  assert.deepEqual(parseItemReference(" https://github.com/raycast/extensions/pull/32894 "), expected);
  assert.deepEqual(parseItemReference("https://github.com/raycast/extensions/issues/32894#issuecomment-1"), expected);
  assert.deepEqual(parseItemReference("https://github.com/raycast/extensions/pull/32894/files"), expected);
  for (const query of ["crash", "#32894", "raycast/extensions", "raycast/extensions#0", "raycast/..#1", "a b/c#1"]) {
    assert.equal(parseItemReference(query), undefined, query);
  }
});

test("mention URIs are validated before any GitHub request", async () => {
  const { parseMentionUri } = await load();

  assert.deepEqual(parseMentionUri("github://issues/raycast/extensions/42"), {
    kind: "issue",
    owner: "raycast",
    name: "extensions",
    number: 42,
  });
  assert.deepEqual(parseMentionUri("github://pulls/raycast/ray.so/7"), {
    kind: "pullRequest",
    owner: "raycast",
    name: "ray.so",
    number: 7,
  });
  assert.deepEqual(parseMentionUri("github://repos/raycast/extensions"), {
    kind: "repository",
    owner: "raycast",
    name: "extensions",
  });

  for (const uri of [
    "https://github.com/raycast/extensions/issues/42",
    "github://issues/raycast/extensions",
    "github://issues/raycast/extensions/042",
    "github://issues/raycast/extensions/42/comments",
    "github://pulls/raycast/../7",
    "github://repos/raycast/..",
    "github://repos/-raycast/extensions",
    "github://repos/raycast/extensions?ref=main",
    "github://repos/raycast/extensions\n",
    "github://repos/raycast%2Fextensions",
  ]) {
    assert.throws(() => parseMentionUri(uri), /Invalid GitHub mention URI/, uri);
  }
});

test("the resource provider returns compact JSON with a bounded body", async () => {
  const { serializeIssue, serializePullRequest, serializeRepository } = await load();

  const issueJson = serializeIssue("raycast/extensions", {
    number: 42,
    title: "Crash on launch",
    state: "closed",
    state_reason: "not_planned",
    html_url: "https://github.com/raycast/extensions/issues/42",
    body: "x".repeat(9000),
    user: { login: "octocat" },
    assignees: [{ login: "mona" }, null],
    labels: ["bug", { name: "extension: github" }, {}],
    comments: 3,
  });
  assert.equal(issueJson.mimeType, "application/json");
  const parsedIssue = JSON.parse(issueJson.text);
  assert.equal(parsedIssue.status, "Closed as not planned");
  assert.deepEqual(parsedIssue.assignees, ["mona"]);
  assert.deepEqual(parsedIssue.labels, ["bug", "extension: github"]);
  assert.ok(parsedIssue.body.length < 8100 && parsedIssue.body.endsWith("[Truncated]"));

  const parsedPullRequest = JSON.parse(
    serializePullRequest("raycast/extensions", {
      number: 7,
      title: "Add mentions",
      state: "closed",
      merged: false,
      merged_at: "2026-10-28T12:00:00Z",
      html_url: "https://github.com/raycast/extensions/pull/7",
      base: { ref: "main" },
      head: { ref: "tpm/github-mentions" },
      requested_reviewers: [{ login: "mona" }],
      additions: 10,
      deletions: 2,
      changed_files: 3,
    }).text,
  );
  assert.equal(parsedPullRequest.status, "Merged");
  assert.equal(parsedPullRequest.head, "tpm/github-mentions");
  assert.deepEqual(parsedPullRequest.requestedReviewers, ["mona"]);
  assert.equal(parsedPullRequest.body, undefined);

  assert.deepEqual(
    JSON.parse(
      serializeRepository({
        full_name: "raycast/extensions",
        description: "Everything you need",
        html_url: "https://github.com/raycast/extensions",
        homepage: "",
        default_branch: "main",
        topics: ["raycast"],
        stargazers_count: 1,
      }).text,
    ),
    {
      name: "raycast/extensions",
      description: "Everything you need",
      url: "https://github.com/raycast/extensions",
      private: false,
      archived: false,
      fork: false,
      defaultBranch: "main",
      topics: ["raycast"],
      stars: 1,
    },
  );
});

test("a pull request waiting only on a team lists that team as a reviewer", async () => {
  const { serializePullRequest } = await load();

  const parsed = JSON.parse(
    serializePullRequest("raycast/extensions", {
      number: 9,
      title: "Wait on a team",
      state: "open",
      html_url: "https://github.com/raycast/extensions/pull/9",
      base: { ref: "main" },
      head: { ref: "team-review" },
      requested_teams: [{ slug: "raycast" }, null, {}],
    }).text,
  );
  assert.deepEqual(parsed.requestedReviewers, ["raycast"]);
});
