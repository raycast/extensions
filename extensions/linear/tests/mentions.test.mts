import assert from "node:assert/strict";
import test from "node:test";

import {
  getProjectMentionFilter,
  getUserMentionFilter,
  mergeMentionProjects,
  hexIconColor,
  readMentionResource,
  tintIconSvg,
  toIssueMentions,
  toProjectMentions,
  toUserMentions,
} from "../src/helpers/mentions.ts";

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

const avatarOr = (fallback: string) => (u: { avatarUrl?: string }) => u.avatarUrl || fallback;

test("issue rows take their icon from the issue itself, so each shows its own status", () => {
  const [mention] = toIssueMentions([issue], (i) => `${i.state.type}:${i.state.color}`);
  assert.equal(mention.icon, "started:#ff0000");
});

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

test("user mentions carry stable IDs, the name, and avatars without SDK methods", () => {
  const sdkUser = { ...user, _request: () => assert.fail("SDK method must not run") };
  const [mention] = toUserMentions([sdkUser], avatarOr("person"));
  assert.deepEqual(mention, {
    title: "Alice",
    uri: `linear://users/${userId}`,
    icon: user.avatarUrl,
  });
  assert.deepEqual(structuredClone(mention), mention);
  const [fallback] = toUserMentions(
    [{ ...user, displayName: " ", title: undefined, avatarUrl: undefined }],
    avatarOr("person"),
  );
  assert.equal(fallback.title, "Alice Smith");
  assert.equal("description" in fallback, false);
  assert.equal(fallback.icon, "person");
});

test("issue mentions show the title with the identifier beside it", () => {
  const [mention] = toIssueMentions([issue], () => "document");
  assert.deepEqual(mention, {
    title: "Fix sign-in",
    uri: `linear://issues/${issueId}`,
    description: "ENG-42",
    icon: "document",
  });
  const [unassigned] = toIssueMentions([{ ...issue, assignee: undefined, project: undefined }], () => "document");
  assert.equal(unassigned.description, "ENG-42");
});

test("both mention lists are bounded and support no matches", () => {
  assert.equal(
    toUserMentions(
      Array.from({ length: 60 }, () => user),
      avatarOr("person"),
    ).length,
    50,
  );
  assert.equal(
    toIssueMentions(
      Array.from({ length: 60 }, () => issue),
      () => "document",
    ).length,
    50,
  );
  assert.deepEqual(toUserMentions([], avatarOr("person")), []);
  assert.deepEqual(
    toIssueMentions([], () => "document"),
    [],
  );
});

test("user and issue search URIs route to fresh details without reading the other entity", async () => {
  const [userMention] = toUserMentions([user], avatarOr("person"));
  const [issueMention] = toIssueMentions([issue], () => "document");
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
    `linear://teams/${issueId}`,
    "linear://issues/ENG-42",
    "linear://users/me",
    "linear://users/%2e%2e",
    `linear://issues/${issueId}/extra`,
    `linear://issues/${issueId}?query=other`,
    `linear://users/${userId}#fragment`,
  ]) {
    await assert.rejects(
      readMentionResource(uri, { users: unavailable, issues: unavailable, projects: unavailable }),
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

const projectId = "33333333-3333-4333-8333-333333333333";
const project = {
  id: projectId,
  name: "Desktop",
  icon: "Rocket",
  color: "#F2994A",
  status: { name: "In Progress", type: "started" },
};
const iconOf = (p: { icon?: string | null; color: string }) => `${p.icon}:${p.color}`;

test("project mentions show the name, the status, and the project's own icon", () => {
  const [mention] = toProjectMentions([project], iconOf);
  assert.deepEqual(mention, {
    title: "Desktop",
    uri: `linear://projects/${projectId}`,
    description: "In Progress",
    icon: "Rocket:#F2994A",
  });
  const [bare] = toProjectMentions([{ ...project, status: null }], iconOf);
  assert.equal(bare.description, "");
  assert.equal(
    toProjectMentions(
      Array.from({ length: 60 }, () => project),
      iconOf,
    ).length,
    50,
  );
});

test("project icons take the project's color on every painted fill and stroke, keeping transparency", () => {
  const svg =
    '<svg style="--icon-color: #5e5e5f;" fill="#5e5e5f"><path fill="none" stroke="#C3C4C6"/><path fill="#c3c4c6"/><path fill="black"/></svg>';
  assert.equal(
    tintIconSvg(svg, "#f2994a"),
    '<svg style="--icon-color: #f2994a;" fill="#f2994a"><path fill="none" stroke="#f2994a"/><path fill="#f2994a"/><path fill="#f2994a"/></svg>',
  );
});

test("only a hex project color reaches an SVG", () => {
  assert.equal(hexIconColor("#F2994A"), "#f2994a");
  for (const color of [undefined, null, "", "orange", '#fff" onload="x', "#12"]) {
    assert.equal(hexIconColor(color), undefined);
  }
});

test("a project name search needs every word, in any status or team", () => {
  assert.deepEqual(getProjectMentionFilter("  desk   app "), {
    and: [{ name: { containsIgnoreCase: "desk" } }, { name: { containsIgnoreCase: "app" } }],
  });
});

test("the default project list puts yours first, then the others, without repeats", () => {
  const ids = (projects: { id: string }[]) => projects.map((p) => p.id);
  const merged = mergeMentionProjects([{ id: "b" }, { id: "a" }], [{ id: "a" }, { id: "c" }, { id: "b" }]);
  assert.deepEqual(ids(merged), ["b", "a", "c"]);
  assert.deepEqual(ids(mergeMentionProjects([], [{ id: "c" }])), ["c"]);
});

test("project URIs read the project alone", async () => {
  const [mention] = toProjectMentions([project], iconOf);
  const resource = await readMentionResource(mention.uri, {
    users: async () => assert.fail("Must not read a user"),
    issues: async () => assert.fail("Must not read an issue"),
    projects: async (id: string) => ({ id, name: "Desktop", members: [{ id: userId, name: "Alice Smith" }] }),
  });
  assert.equal(JSON.parse(resource.text).members[0].name, "Alice Smith");
});
