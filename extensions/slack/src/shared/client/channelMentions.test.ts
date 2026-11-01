import assert from "node:assert/strict";
import test from "node:test";
import { readChannelMention, searchChannelMentions } from "./channelMentions";
import type { SlackConversation } from "./slackTypes";

const channel = (name: string, overrides: Partial<SlackConversation> = {}): SlackConversation => ({
  id: `C${name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .padEnd(8, "0")}`,
  name,
  context_team_id: "T12345678",
  ...overrides,
});

const pages = (...pageItems: SlackConversation[][]) => {
  const requested: Array<string | undefined> = [];
  return {
    requested,
    load: async (cursor?: string) => {
      requested.push(cursor);
      const index = cursor ? Number(cursor) : 0;
      return {
        items: pageItems[index] ?? [],
        nextCursor: index + 1 < pageItems.length ? String(index + 1) : undefined,
      };
    },
  };
};

const unused = async () => assert.fail("This source must not be loaded");

test("an empty query lists every joined channel by name, without scanning the workspace directory", async () => {
  const member = pages(
    [channel("random", { is_private: true }), channel("general", { topic: { value: "  Company\n news  " } })],
    [channel("design", { purpose: { value: "Design reviews" } })],
  );
  const results = await searchChannelMentions("  ", { loadMemberChannelsPage: member.load, loadChannelsPage: unused });

  assert.deepEqual(member.requested, [undefined, "1"]);
  assert.deepEqual(results, [
    {
      title: "#design",
      uri: `slack://channels/T12345678/${channel("design").id}`,
      description: "Design reviews",
      icon: "channel-public.png",
    },
    {
      title: "#general",
      uri: `slack://channels/T12345678/${channel("general").id}`,
      description: "Company news",
      icon: "channel-public.png",
    },
    { title: "#random", uri: `slack://channels/T12345678/${channel("random").id}`, icon: "channel-private.png" },
  ]);
});

test("a query matches channel names, ignores a leading #, and ranks joined channels first", async () => {
  const member = pages([channel("eng-desktop"), channel("marketing")]);
  const directory = pages([
    channel("eng-web"),
    channel("marketing"),
    channel("eng-archive", { is_archived: true }),
    channel("mpdm-eng--bob-1", { is_mpim: true }),
  ]);
  const results = await searchChannelMentions("#eng", {
    loadMemberChannelsPage: member.load,
    loadChannelsPage: directory.load,
  });

  assert.deepEqual(directory.requested, [undefined]);
  assert.deepEqual(
    results.map((result) => result.title),
    ["#eng-desktop", "#eng-web"],
  );
});

test("ten joined matches across member pages skip the workspace directory", async () => {
  const matches = Array.from({ length: 10 }, (_, i) => channel(`ai-${String(i).padStart(2, "0")}`));
  const member = pages([channel("billing"), ...matches.slice(0, 5)], matches.slice(5).reverse());
  const results = await searchChannelMentions("AI", {
    loadMemberChannelsPage: member.load,
    loadChannelsPage: unused,
  });

  assert.deepEqual(member.requested, [undefined, "1"]);
  assert.deepEqual(
    results.map((result) => result.title),
    matches.map((match) => `#${match.name}`),
  );
});

test("fewer than ten joined matches scan the directory only through the first matching page", async () => {
  const member = pages(Array.from({ length: 9 }, (_, i) => channel(`team-joined-${i}`)));
  const directory = pages(
    [channel("billing")],
    [],
    [channel("team-archived", { is_archived: true })],
    [channel("team-zebra"), channel("team-alpha")],
    [channel("team-later")],
  );
  const results = await searchChannelMentions("team", {
    loadMemberChannelsPage: member.load,
    loadChannelsPage: directory.load,
  });

  assert.deepEqual(directory.requested, [undefined, "1", "2", "3"]);
  assert.deepEqual(
    results.map((result) => result.title),
    [...Array.from({ length: 9 }, (_, i) => `#team-joined-${i}`), "#team-alpha", "#team-zebra"],
  );
});

test("joined channels win duplicate IDs and sort before other directory matches", async () => {
  const joined = channel("team-zebra", { topic: { value: "Joined metadata" } });
  const member = pages([joined, channel("team-beta")]);
  const directory = pages([
    channel("team-alpha"),
    { ...joined, is_member: false, topic: { value: "Directory metadata" } },
    channel("team-charlie", { is_member: true }),
    channel("team-alpha"),
  ]);
  const results = await searchChannelMentions("team", {
    loadMemberChannelsPage: member.load,
    loadChannelsPage: directory.load,
  });

  assert.deepEqual(
    results.map((result) => result.title),
    ["#team-beta", "#team-charlie", "#team-zebra", "#team-alpha"],
  );
  assert.equal(results[2].description, "Joined metadata");
});

test("search results are capped at 50 with joined matches retained before directory matches", async () => {
  const others = Array.from({ length: 60 }, (_, i) => channel(`team-${String(i).padStart(2, "0")}`));
  const directory = pages(others, [channel("team-later")]);
  const results = await searchChannelMentions("team", {
    loadMemberChannelsPage: pages([channel("team-joined")]).load,
    loadChannelsPage: directory.load,
  });

  assert.deepEqual(directory.requested, [undefined]);
  assert.equal(results.length, 50);
  assert.equal(results[0].title, "#team-joined");
});

test("joined-only searches scan all member pages, sort, and cap results at 50", async () => {
  const joined = Array.from({ length: 60 }, (_, i) => channel(`team-${String(i).padStart(2, "0")}`));
  const member = pages(joined.slice(10).reverse(), joined.slice(0, 10));
  const results = await searchChannelMentions("team", {
    loadMemberChannelsPage: member.load,
    loadChannelsPage: unused,
  });

  assert.deepEqual(member.requested, [undefined, "1"]);
  assert.deepEqual(
    results.map((result) => result.title),
    joined.slice(0, 50).map((match) => `#${match.name}`),
  );
});

test("long topics are compacted into a short description", async () => {
  const member = pages([channel("long", { topic: { value: "x".repeat(300) } })]);
  const [result] = await searchChannelMentions("", { loadMemberChannelsPage: member.load, loadChannelsPage: unused });
  assert.equal(result.description?.length, 120);
  assert.ok(result.description?.endsWith("…"));
});

const uri = "slack://channels/T12345678/C12345678";
const info: SlackConversation = {
  id: "C12345678",
  name: "general",
  internal_team_ids: ["T87654321", "T12345678"],
  is_private: false,
  num_members: 42,
  topic: { value: "Company news" },
  purpose: { value: "" },
};

test("a channel mention reads fresh, compact metadata", async () => {
  let reads = 0;
  const getChannel = async (id: string) => {
    assert.equal(id, "C12345678");
    reads++;
    return { ok: true, channel: { ...info, num_members: 41 + reads } };
  };
  const first = await readChannelMention(uri, getChannel);
  const second = await readChannelMention(uri, getChannel);

  assert.equal(first.mimeType, "application/json");
  assert.deepEqual(JSON.parse(first.text), {
    id: "C12345678",
    teamId: "T12345678",
    name: "general",
    isPrivate: false,
    isArchived: false,
    topic: "Company news",
    memberCount: 42,
    mention: "<#C12345678>",
    url: "slack://channel?team=T12345678&id=C12345678",
  });
  assert.equal(JSON.parse(second.text).memberCount, 43);
});

test("invalid channel URIs are rejected before making a Slack request", async () => {
  for (const invalid of [
    "slack://users/T12345678/U12345678",
    "slack://channels/C12345678",
    "slack://channels/T12345678/D12345678",
    "slack://channels/T12345678/C12345678/extra",
    "slack://channels/T12345678/C12345678?team=T87654321",
    "slack://channels/T12345678/C12345678\n",
  ]) {
    await assert.rejects(
      readChannelMention(invalid, async () => assert.fail("Invalid URI must not reach Slack")),
      /Invalid Slack channel URI/,
    );
  }
});

test("a channel mention cannot resolve to another channel, a DM, or another workspace", async () => {
  for (const changed of [
    undefined,
    { ...info, id: "C87654321" },
    { ...info, is_im: true },
    { ...info, is_mpim: true },
  ]) {
    await assert.rejects(
      readChannelMention(uri, async () => ({ channel: changed })),
      /no longer available/,
    );
  }
  await assert.rejects(
    readChannelMention(uri, async () => ({ channel: { ...info, internal_team_ids: ["T87654321"] } })),
    /different workspace/,
  );
});

test("Slack errors propagate instead of returning stale or empty channel content", async () => {
  await assert.rejects(
    readChannelMention(uri, async () => ({ error: "channel_not_found", channel: info })),
    /channel_not_found/,
  );
  await assert.rejects(
    readChannelMention(uri, async () => ({ ok: false })),
    /Could not read the Slack channel/,
  );
});
