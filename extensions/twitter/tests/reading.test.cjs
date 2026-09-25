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
