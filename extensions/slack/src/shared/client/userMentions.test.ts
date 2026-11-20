import assert from "node:assert/strict";
import test from "node:test";
import { readUserMention, toUserMentions } from "./userMentions";
import type { SlackMember } from "./slackTypes";

const user = {
  id: "U12345678",
  teamId: "T12345678",
  name: "Alice Smith",
  username: "alice",
  title: "Engineer",
  icon: { source: "https://example.com/alice.png" },
};

const member: SlackMember = {
  id: user.id,
  team_id: user.teamId,
  name: user.username,
  tz: "Europe/Paris",
  profile: {
    first_name: "Alice",
    last_name: "Smith",
    real_name: "Alice Smith",
    email: "alice@example.com",
    title: "Engineer",
    status_text: "Available",
    phone: "not part of the mention",
  },
};

test("mention results carry user and workspace IDs, preserve avatars, and are capped at 50", () => {
  const results = toUserMentions([
    user,
    { ...user, id: "W12345678", title: "", icon: "person" },
    ...Array.from({ length: 60 }, (_, i) => ({ ...user, id: `U${String(i).padStart(8, "0")}` })),
  ]);
  assert.equal(results.length, 50);
  assert.deepEqual(results[0], {
    title: "Alice Smith",
    uri: "slack://users/T12345678/U12345678",
    description: "@alice · Engineer",
    icon: "https://example.com/alice.png",
  });
  assert.equal(results[1].icon, "person");
  assert.equal(results[1].description, "@alice");
  assert.deepEqual(toUserMentions([]), []);
});

for (const id of ["U12345678", "W12345678"]) {
  test(`a ${id[0]} user mention round-trips to a fresh, compact profile`, async () => {
    const [mention] = toUserMentions([{ ...user, id }]);
    let reads = 0;
    const getUser = async (userId: string) => {
      assert.equal(userId, id);
      reads++;
      return { ok: true, user: { ...member, id, profile: { ...member.profile, status_text: `Status ${reads}` } } };
    };
    const first = await readUserMention(mention.uri, getUser);
    const second = await readUserMention(mention.uri, getUser);
    assert.equal(first.mimeType, "application/json");
    assert.deepEqual(JSON.parse(first.text), {
      id,
      teamId: "T12345678",
      username: "alice",
      displayName: "Alice Smith",
      realName: "Alice Smith",
      email: "alice@example.com",
      jobTitle: "Engineer",
      status: "Status 1",
      timezone: "Europe/Paris",
      mention: `<@${id}>`,
      url: `slack://user?team=T12345678&id=${id}`,
    });
    assert.equal(JSON.parse(second.text).status, "Status 2");
  });
}

test("invalid mention URIs are rejected before making a Slack request", async () => {
  for (const uri of [
    "https://example.com/users/T12345678/U12345678",
    "slack://users/U12345678",
    "slack://users/T12345678/C12345678",
    "slack://users/T12345678/U12345678/extra",
    "slack://users/T12345678/U12345678?team=T87654321",
    "slack://users/T12345678/U12345678#fragment",
    "slack://users/T12345678/%2e%2e",
    "slack://users/T12345678/U12345678\n",
  ]) {
    await assert.rejects(
      readUserMention(uri, async () => {
        assert.fail("Invalid URI must not reach Slack");
      }),
      /Invalid Slack user URI/,
    );
  }
});

test("a mention cannot resolve to another user or workspace", async () => {
  for (const changedUser of [
    { ...member, id: "U87654321" },
    { ...member, team_id: "T87654321" },
  ]) {
    await assert.rejects(
      readUserMention("slack://users/T12345678/U12345678", async () => ({ user: changedUser })),
      /no longer available|different workspace/,
    );
  }
});

test("missing, deactivated, and bot profiles are unavailable when a mention is read", async () => {
  for (const unavailable of [
    undefined,
    { ...member, deleted: true },
    { ...member, is_bot: true },
    { ...member, is_workflow_bot: true },
  ]) {
    await assert.rejects(
      readUserMention("slack://users/T12345678/U12345678", async () => ({ user: unavailable })),
      /no longer available/,
    );
  }
});

test("Slack errors propagate instead of returning stale or empty profile content", async () => {
  const uri = "slack://users/T12345678/U12345678";
  await assert.rejects(
    readUserMention(uri, async () => ({ error: "missing_scope", user: member })),
    /missing_scope/,
  );
  await assert.rejects(
    readUserMention(uri, async () => ({ ok: false })),
    /Could not read the Slack user/,
  );
  const failure = new Error("request failed");
  await assert.rejects(
    readUserMention(uri, async () => {
      throw failure;
    }),
    (error) => error === failure,
  );
});
