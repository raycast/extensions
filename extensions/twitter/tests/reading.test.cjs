const { test } = require("node:test");
const assert = require("node:assert/strict");
const { TwitterV2IncludesHelper } = require("twitter-api-v2");
const { load } = require("./load.cjs");

const fullText = `${"Long post content. ".repeat(30)}Devs: this works automatically with MCP. @tailmention`;
const author = { id: "1", name: "Author", username: "author" };
const longPost = {
  id: "100",
  author_id: "1",
  text: "Long post content… https://t.co/preview",
  note_tweet: { text: fullText, entities: { mentions: [{ id: "2", username: "tailmention" }] } },
};

function fixture(posts = [longPost], referenced = []) {
  const calls = [];
  const response = { data: posts, includes: { users: [author], tweets: referenced } };
  const page = { tweets: posts, includes: new TwitterV2IncludesHelper(response), meta: { next_token: "next" } };
  const v2 = Object.fromEntries(
    ["search", "homeTimeline", "userTimeline", "userMentionTimeline", "bookmarks", "quotes", "tweets"].map((name) => [
      name,
      async (...args) => {
        calls.push({ name, options: args.at(-1) });
        return name === "tweets" ? response : page;
      },
    ]),
  );
  v2.get = async () => ({ data: [{ id: "100" }], meta: { next_token: "next" } });
  const { ClientV2 } = load("src/v2/lib/twitterapi_v2.ts", {
    "./oauth": {},
    "./read_cache": { readCache: {} },
    "../../utils": {},
  });
  const client = new ClientV2();
  client.cachedRead = async (_key, operation) => operation({ v2 });
  client.me = async () => author;
  return { client, calls, page };
}

test("every post-reading path requests and preserves long-form text", async () => {
  const { client, calls } = fixture();
  const readers = [
    () => client.searchPosts("MCP"),
    () => client.homeTimeline(),
    () => client.getTweetsFromAuthor("1"),
    () => client.getMyTweets(),
    () => client.mentions(),
    () => client.bookmarks(),
    () => client.bookmarksInFolder("10"),
    () => client.quotedPosts("100"),
    async () => ({ items: await client.refreshTweets([{ id: "100" }]) }),
  ];
  for (const read of readers) {
    const result = await read();
    assert.equal(result.items[0].text, fullText);
  }
  assert.equal(calls.length, readers.length);
  for (const { options } of calls) assert.ok(options["tweet.fields"].includes("note_tweet"));
});

test("personal history and bookmark search match content beyond the preview", async () => {
  const { client, page } = fixture();
  page.meta = {};
  const result = await client.searchMyPosts(["MCP", "tailmention"]);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].text, fullText);
  assert.equal(result.reachedEnd, true);
  const { filterBookmarks } = load("src/v2/lib/bookmark_search.ts", {});
  assert.equal(filterBookmarks(result.items, "MCP tailmention").length, 1);
});

test("the AI search tool returns the complete body", async () => {
  const { client } = fixture();
  const { default: searchPosts } = load("src/tools/search-posts.ts", {
    "../v2/lib/twitterapi_v2": { clientV2: client },
  });
  const result = await searchPosts({ query: "MCP" });
  assert.equal(result.items[0].text, fullText);
  assert.equal(result.nextToken, "next");
});

test("personal search includes long-form mention entities", async () => {
  const post = { ...longPost, note_tweet: { ...longPost.note_tweet, text: "Text without the username" } };
  const { client, page } = fixture([post]);
  page.meta = {};
  assert.equal((await client.searchMyPosts(["tailmention"])).items.length, 1);
});

test("short posts and unavailable expansions retain their original text", async () => {
  for (const post of [
    { id: "100", author_id: "1", text: "An ordinary short post" },
    {
      id: "100",
      author_id: "1",
      text: "RT @missing: unavailable…",
      referenced_tweets: [{ type: "retweeted", id: "99" }],
    },
  ]) {
    const { client } = fixture([post]);
    assert.equal((await client.searchPosts("post")).items[0].text, post.text);
  }
});

test("reposts use expanded original text while quotes keep their own commentary", async () => {
  for (const original of [longPost, { ...longPost, note_tweet: undefined, text: "Complete ordinary post" }]) {
    const repost = {
      id: "101",
      author_id: "1",
      text: "RT @author: Long post…",
      referenced_tweets: [{ type: "retweeted", id: "100" }],
    };
    const { client } = fixture([repost], [original]);
    const result = (await client.homeTimeline()).items[0];
    assert.equal(result.id, "101");
    assert.equal(result.text, `RT @author: ${original.note_tweet?.text ?? original.text}`);
  }
  const quote = {
    id: "102",
    author_id: "1",
    text: "My commentary",
    referenced_tweets: [{ type: "quoted", id: "100" }],
  };
  const { client } = fixture([quote], [longPost]);
  assert.equal((await client.homeTimeline()).items[0].text, "My commentary");
});

function dmFixture(events, users) {
  const calls = [];
  const response = { data: events, includes: { users } };
  const page = { events, includes: new TwitterV2IncludesHelper(response), meta: { next_token: "dm-next" } };
  const lookups = { 300: { id: "300", name: "Quiet", username: "quiet" } };
  const v2 = {
    listDmEvents: async (options) => (calls.push({ name: "listDmEvents", options }), page),
    listDmEventsWithParticipant: async (id, options) => (calls.push({ name: "with", id, options }), page),
    listDmEventsOfConversation: async (id, options) => (calls.push({ name: "of", id, options }), page),
    users: async (ids) => (calls.push({ name: "users", ids }), { data: ids.map((id) => lookups[id]).filter(Boolean) }),
  };
  const { ClientV2 } = load("src/v2/lib/twitterapi_v2.ts", {
    "./oauth": {},
    "./read_cache": { readCache: {} },
    "../../utils": {},
  });
  const client = new ClientV2();
  client.cachedRead = async (_key, operation) => operation({ v2 });
  client.me = async () => ({ id: "100", name: "Me", username: "me" });
  client.getUserByUsername = async (username) => ({ id: "200", name: "Casey", username });
  return { client, calls };
}

test("DM conversations group events, exclude the user, and resolve silent participants", async () => {
  const events = [
    {
      id: "e1",
      event_type: "MessageCreate",
      text: "Latest",
      dm_conversation_id: "100-200",
      sender_id: "200",
      created_at: "2026-10-27T10:00:00Z",
    },
    {
      id: "e2",
      event_type: "MessageCreate",
      text: "Older",
      dm_conversation_id: "100-200",
      sender_id: "100",
      created_at: "2026-10-26T10:00:00Z",
    },
    { id: "e3", event_type: "MessageCreate", text: "Only me", dm_conversation_id: "100-300", sender_id: "100" },
    { id: "e4", event_type: "ParticipantsJoin", dm_conversation_id: "999", participant_ids: ["100", "200", "400"] },
  ];
  const users = [
    { id: "100", name: "Me", username: "me" },
    { id: "200", name: "Casey", username: "casey", profile_image_url: "https://pbs.twimg.com/casey_normal.jpg" },
  ];
  const { client, calls } = dmFixture(events, users);
  const result = await client.directMessageConversations();

  assert.equal(result.eventsRead, 4);
  assert.equal(result.nextToken, "dm-next");
  assert.deepEqual(
    result.items.map((item) => [item.conversationId, item.type, item.participantIds]),
    [
      ["100-200", "one_to_one", ["200"]],
      ["100-300", "one_to_one", ["300"]],
      ["999", "group", ["200", "400"]],
    ],
  );
  assert.equal(result.items[0].lastMessageText, "Latest");
  assert.equal(result.items[0].lastMessageFromMe, false);
  assert.equal(result.items[0].participants[0].profile_image_url, "https://pbs.twimg.com/casey_normal.jpg");
  assert.equal(result.items[1].participants[0].username, "quiet");
  // Unresolvable accounts stay in participantIds without inventing a profile.
  assert.deepEqual(
    result.items[2].participants.map((user) => user.id),
    ["200"],
  );
  assert.deepEqual(calls.find((call) => call.name === "users").ids, ["300", "400"]);
  assert.ok(calls[0].options.expansions.includes("participant_ids"));
});

test("DM messages read one conversation by username or conversation ID", async () => {
  const events = [
    { id: "e1", event_type: "MessageCreate", text: "Hi", dm_conversation_id: "100-200", sender_id: "100" },
  ];
  const { client, calls } = dmFixture(events, [{ id: "100", name: "Me", username: "me" }]);

  const byUser = await client.directMessages({ username: "@Casey" });
  assert.equal(calls.at(-1).name, "with");
  assert.equal(calls.at(-1).id, "200");
  assert.equal(byUser.conversationId, "100-200");
  assert.equal(byUser.items[0].fromMe, true);
  assert.equal(byUser.items[0].sender.username, "me");

  await client.directMessages({ conversationId: "100-200" }, "dm-next");
  assert.equal(calls.at(-1).name, "of");
  assert.equal(calls.at(-1).options.pagination_token, "dm-next");

  await assert.rejects(client.directMessages({}), /exactly one/);
  await assert.rejects(client.directMessages({ conversationId: "100-200", username: "casey" }), /exactly one/);
  await assert.rejects(client.directMessages({ conversationId: "../me" }), /conversation ID/);
});

function dmPage(id, text) {
  const events = [
    {
      id,
      event_type: "MessageCreate",
      text,
      dm_conversation_id: "100-200",
      sender_id: "100",
      created_at: "2026-10-28T00:00:00Z",
    },
  ];
  return {
    events,
    includes: new TwitterV2IncludesHelper({
      data: events,
      includes: { users: [{ id: "100", name: "Me", username: "me" }] },
    }),
    meta: {},
  };
}

function cacheFixture() {
  const store = new Map();
  const calls = { messages: 0 };
  let releaseStalePage;
  let markPageEntered;
  const pageEntered = new Promise((resolve) => {
    markPageEntered = resolve;
  });
  const stalePage = new Promise((resolve) => {
    releaseStalePage = resolve;
  });
  const v2 = {
    me: async () => ({ data: { id: "100", name: "Me", username: "me" } }),
    listDmEventsOfConversation: async () => {
      calls.messages += 1;
      if (calls.messages === 1) {
        markPageEntered();
        await stalePage;
        return dmPage("old", "before");
      }
      return dmPage("new", "sent");
    },
    sendDmToParticipant: async () => ({ dm_conversation_id: "100-200", dm_event_id: "sent-event" }),
  };
  class TwitterApi {
    constructor(token) {
      this.token = token;
      this.v2 = v2;
    }
    getActiveTokens() {
      return { type: "oauth2", bearerToken: this.token };
    }
  }
  const { ClientV2 } = load("src/v2/lib/twitterapi_v2.ts", {
    "./oauth": {
      authorize: async () => "token",
      getOAuthTokens: async () => ({ accessToken: "token" }),
      resetOAuthTokens: async () => {},
    },
    "./read_cache": {
      readCache: {
        get: (key) => store.get(key),
        set: (key, value) => store.set(key, value),
        remove: (key) => store.delete(key),
        clear: () => store.clear(),
      },
    },
    "../../utils": { getErrorMessage: (error) => error.message, sleep: async () => {} },
    "twitter-api-v2": { TwitterApi, ApiResponseError: class ApiResponseError extends Error {} },
  });
  return {
    client: new ClientV2(),
    calls,
    pageEntered,
    releaseStalePage: () => releaseStalePage(),
  };
}

test("a DM read that started before sending cannot put the old page back", async () => {
  const { client, calls, pageEntered, releaseStalePage } = cacheFixture();
  const staleRead = client.directMessages({ conversationId: "100-200" });
  await pageEntered;
  await client.sendDirectMessage(["200"], "hello");
  releaseStalePage();

  const stale = await staleRead;
  assert.equal(stale.items[0].text, "before");
  const fresh = await client.directMessages({ conversationId: "100-200" });
  assert.equal(fresh.items[0].text, "sent");
  assert.equal(calls.messages, 2);
  const cached = await client.directMessages({ conversationId: "100-200" });
  assert.equal(cached.items[0].text, "sent");
  assert.equal(calls.messages, 2);
});
