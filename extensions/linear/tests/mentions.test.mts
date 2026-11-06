import assert from "node:assert/strict";
import test from "node:test";

import { getUserMentionFilter, readMentionResource, toIssueMentions, toUserMentions } from "../src/helpers/mentions.ts";

const userId = "11111111-1111-4111-8111-111111111111";
const issueId = "22222222-2222-4222-8222-222222222222";
const user = {
  id: userId,
  name: "Alice Smith",
  displayName: "Alice",
  email: "alice@example.com",
  title: "Engineer",
  avatarUrl: "https://example.com/alice.png",
};
const issue = {
  id: issueId,
  identifier: "ENG-42",
  title: "Fix sign-in",
  state: { id: "state", name: "In Progress", type: "started", color: "#ff0000" },
  project: { id: "project", name: "Desktop", icon: undefined, color: "#ff0000" },
  assignee: { id: userId, displayName: "Alice", email: user.email, avatarUrl: user.avatarUrl },
};

test("user searches exclude inactive accounts and apps, including the empty default search", () => {
  assert.deepEqual(getUserMentionFilter("  "), { active: { eq: true }, app: { eq: false } });
});

test("each query word can match a different name or email field in the server-side user filter", () => {
  const filter = getUserMentionFilter("  Alice   example.com  ");
  assert.deepEqual(filter.and, [
    {
      or: [
        { name: { containsIgnoreCase: "Alice" } },
        { displayName: { containsIgnoreCase: "Alice" } },
        { email: { containsIgnoreCase: "Alice" } },
      ],
    },
    {
      or: [
        { name: { containsIgnoreCase: "example.com" } },
        { displayName: { containsIgnoreCase: "example.com" } },
        { email: { containsIgnoreCase: "example.com" } },
      ],
    },
  ]);
});

test("user mentions carry stable IDs, profile context, and avatars without SDK methods", () => {
  const sdkUser = { ...user, _request: () => assert.fail("SDK method must not run") };
  const [mention] = toUserMentions([sdkUser], "person");
  assert.deepEqual(mention, {
    title: "Alice",
    uri: `linear://users/${userId}`,
    description: "alice@example.com · Engineer",
    icon: user.avatarUrl,
  });
  assert.deepEqual(structuredClone(mention), mention);
  const [fallback] = toUserMentions([{ ...user, displayName: " ", title: undefined, avatarUrl: undefined }], "person");
  assert.equal(fallback.title, "Alice Smith");
  assert.equal(fallback.description, "alice@example.com");
  assert.equal(fallback.icon, "person");
});

test("issue mentions show identifiers, status, project, and assignee", () => {
  const [mention] = toIssueMentions([issue], "document");
  assert.deepEqual(mention, {
    title: "ENG-42 · Fix sign-in",
    uri: `linear://issues/${issueId}`,
    description: "In Progress · Desktop · Alice",
    icon: "document",
  });
  const [unassigned] = toIssueMentions([{ ...issue, assignee: undefined, project: undefined }], "document");
  assert.equal(unassigned.description, "In Progress");
});

test("both mention lists are bounded and support no matches", () => {
  assert.equal(
    toUserMentions(
      Array.from({ length: 60 }, () => user),
      "person",
    ).length,
    50,
  );
  assert.equal(
    toIssueMentions(
      Array.from({ length: 60 }, () => issue),
      "document",
    ).length,
    50,
  );
  assert.deepEqual(toUserMentions([], "person"), []);
  assert.deepEqual(toIssueMentions([], "document"), []);
});

test("user and issue search URIs route to fresh details without reading the other entity", async () => {
  const [userMention] = toUserMentions([user], "person");
  const [issueMention] = toIssueMentions([issue], "document");
  const calls: string[] = [];
  const readers = {
    users: async (id: string) => {
      calls.push(`user:${id}`);
      return { ...user, active: true, app: false };
    },
    issues: async (id: string) => {
      calls.push(`issue:${id}`);
      return { id, identifier: "ENG-42", description: `Updated description ${calls.length}` };
    },
  };
  const userResource = await readMentionResource(userMention.uri, readers);
  assert.equal(userResource.mimeType, "application/json");
  assert.equal(JSON.parse(userResource.text).email, user.email);
  assert.deepEqual(calls, [`user:${userId}`]);
  const issueResource = await readMentionResource(issueMention.uri, readers);
  const refreshedIssue = await readMentionResource(issueMention.uri, readers);
  assert.equal(JSON.parse(issueResource.text).description, "Updated description 2");
  assert.equal(JSON.parse(refreshedIssue.text).description, "Updated description 3");
  assert.deepEqual(calls, [`user:${userId}`, `issue:${issueId}`, `issue:${issueId}`]);
});

test("malformed or unrelated URIs fail before a Linear request", async () => {
  const unavailable = async () => {
    assert.fail("Invalid URI must not reach Linear");
  };
  for (const uri of [
    `https://example.com/issues/${issueId}`,
    `linear://projects/${issueId}`,
    "linear://issues/ENG-42",
    "linear://users/me",
    "linear://users/%2e%2e",
    `linear://issues/${issueId}/extra`,
    `linear://issues/${issueId}?query=other`,
    `linear://users/${userId}#fragment`,
  ]) {
    await assert.rejects(
      readMentionResource(uri, { users: unavailable, issues: unavailable }),
      /Invalid Linear resource URI/,
    );
  }
});

test("a URI cannot resolve to a different resource", async () => {
  await assert.rejects(
    readMentionResource(`linear://issues/${issueId}`, {
      users: async () => assert.fail("Must not read a user"),
      issues: async () => ({ id: userId }),
    }),
    /no longer available/,
  );
});

test("users deactivated or converted to apps since searching are unavailable", async () => {
  for (const profile of [
    { active: false, app: false },
    { active: true, app: true },
    { active: true, app: false, archivedAt: "2026-10-27T00:00:00Z" },
  ]) {
    await assert.rejects(
      readMentionResource(`linear://users/${userId}`, {
        users: async () => ({ id: userId, ...profile }),
        issues: async () => assert.fail("Must not read an issue"),
      }),
      /user is no longer available/,
    );
  }
});

test("resource read failures propagate instead of returning empty content", async () => {
  const failure = new Error("Linear request failed");
  await assert.rejects(
    readMentionResource(`linear://issues/${issueId}`, {
      users: async () => assert.fail("Must not read a user"),
      issues: async () => {
        throw failure;
      },
    }),
    (error) => error === failure,
  );
});
