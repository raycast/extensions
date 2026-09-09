const { test } = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./load.cjs");

function fixture() {
  const storage = new Map();
  const mocks = {
    "@raycast/api": {
      LocalStorage: {
        getItem: async (key) => storage.get(key),
        setItem: async (key, value) => storage.set(key, value),
        removeItem: async (key) => storage.delete(key),
      },
    },
    "./oauth": {},
    "./read_cache": { readCache: { clear() {} } },
    "../../utils": { getErrorMessage: (error) => error.message },
  };
  const api = load("src/v2/lib/twitterapi_v2.ts", mocks);
  return { ...api, mocks, client: new api.ClientV2(), drafts: load("src/v2/lib/drafts.ts", mocks) };
}

const longURL = "https://example.com/" + "a".repeat(400);

test("weighted validation handles URLs, CJK, emoji sequences and normalization", () => {
  const { normalizePostInput, postInputError } = fixture();
  const { requirePostText } = load("src/tools/inputs.ts", {});
  const { postLength } = load("src/v2/lib/post_text.ts", {});
  for (const text of [longURL, "界".repeat(140), "👨‍👩‍👧‍👦".repeat(140), "e\u0301".repeat(280)]) {
    assert.equal(normalizePostInput({ text }).text, text);
    assert.equal(requirePostText(text), text);
    assert.equal(postInputError({ text }), undefined);
  }
  assert.equal(postLength(longURL), 23);
  for (const text of ["界".repeat(141), "a".repeat(281), "a".repeat(258) + " " + longURL]) {
    assert.throws(() => normalizePostInput({ text }), /Post length is .*280/);
    assert.throws(() => requirePostText(text), /Post length is .*280/);
    assert.match(postInputError({ text }), /Post length/);
  }
});

test("composer and API share poll, quote and media validity", () => {
  const { postInputError } = fixture();
  const poll = { options: ["One", "Two", "", ""], durationMinutes: 1440 };
  for (const input of [
    { poll: { ...poll, options: ["One", " "] } },
    { poll: { ...poll, options: ["a".repeat(26), "Two"] } },
    { poll: { ...poll, durationMinutes: NaN } },
    { poll: { ...poll, durationMinutes: 4 } },
    { quotePostId: "abc" },
    { poll, mediaPaths: ["a.png"] },
    { poll, quotePostId: "123" },
    { mediaPaths: ["a.png", "b.gif"] },
    { mediaPaths: ["a.mp4", "b.mov"] },
    { mediaPaths: ["a.png", "b.png", "c.png", "d.png", "e.png"] },
    { mediaPaths: ["a.txt"] },
  ])
    assert.ok(postInputError({ text: "Hello", ...input }), JSON.stringify(input));
  for (const input of [
    { poll },
    { quotePostId: "123" },
    { mediaPaths: ["a.png", "b.jpg"] },
    { mediaPaths: ["a.gif"] },
  ]) {
    assert.equal(postInputError({ text: "Hello", ...input }), undefined);
  }
});

test("thread failure records confirmed progress and reload resumes after the published prefix", async () => {
  const { client, drafts, ThreadPublishError } = fixture();
  const posts = [{ text: "first" }, { text: "second" }, { text: "third" }];
  const calls = [];
  client.createPost = async (input) => {
    calls.push(input);
    if (input.text === "third") throw new Error("rate limit");
    return { id: String(calls.length), text: input.text };
  };
  await assert.rejects(
    client.createThread(posts, async (created) => {
      const remaining = posts.slice(created.length);
      if (remaining.length) remaining[0] = { ...remaining[0], replyToPostId: created.at(-1).id };
      await drafts.saveThreadDraft(remaining);
    }),
    (error) => {
      assert.ok(error instanceof ThreadPublishError);
      assert.deepEqual(
        error.created.map(({ id }) => id),
        ["1", "2"],
      );
      return true;
    },
  );
  const draft = await drafts.loadThreadDraft();
  assert.deepEqual(draft.tweets, [{ text: "third", replyToPostId: "2" }]);
  client.createPost = async (input) => {
    calls.push(input);
    return { id: "3", text: input.text };
  };
  await client.createThread(draft.tweets);
  assert.equal(calls.at(-1).replyToPostId, "2");
  assert.deepEqual(
    calls.map(({ text }) => text),
    ["first", "second", "third", "third"],
  );
});

test("thread preflight prevents publishing a prefix when a later post is invalid", async () => {
  const { client } = fixture();
  client.createPost = async () => assert.fail("No post should be published");
  await assert.rejects(client.createThread([{ text: "valid" }, { text: "界".repeat(141) }]), /Post 2: Post length/);
});

test("progress persistence failure stops publishing and retains confirmed IDs", async () => {
  const { client, ThreadPublishError } = fixture();
  let calls = 0;
  client.createPost = async ({ text }) => ({ id: String(++calls), text });
  await assert.rejects(
    client.createThread([{ text: "first" }, { text: "second" }], async () => {
      throw new Error("storage unavailable");
    }),
    (error) => error instanceof ThreadPublishError && error.created[0].id === "1",
  );
  assert.equal(calls, 1);
});

test("AI thread partial result is cloneable and resumes with only remaining text", async () => {
  const { client, ThreadPublishError } = fixture();
  const tool = load("src/tools/post-thread.ts", {
    "@raycast/api": {},
    "../v2/lib/twitterapi_v2": { clientV2: client, ThreadPublishError },
  }).default;
  client.createPost = async ({ text }) => {
    if (text === "second") throw new Error("failed");
    return { id: "123", text };
  };
  const result = structuredClone(await tool({ posts: ["first", "second"] }));
  assert.equal(result.posted, false);
  assert.deepEqual(result.remainingPosts, ["second"]);
  assert.deepEqual(result.postIds, ["123"]);
  client.createPost = async (input) => {
    assert.equal(input.replyToPostId, "123");
    assert.equal(input.text, "second");
    return { id: "124", text: input.text };
  };
  assert.equal((await tool({ posts: result.remainingPosts, replyToPostId: result.replyToPostId })).posted, true);
});

test("selected text accepts long URLs and rejects overweight Unicode before sending", async () => {
  let selected = longURL;
  const sent = [],
    errors = [];
  const command = load("src/post-selected-text.ts", {
    "@raycast/api": {
      getSelectedText: async () => selected,
      showHUD: async () => {},
      showToast: async ({ message }) => errors.push(message),
      Toast: { Style: { Failure: "failure" } },
    },
    "./utils": { getErrorMessage: (error) => error.message },
    "./v2/lib/twitterapi_v2": { clientV2: { sendTweet: async (text) => sent.push(text) } },
  }).default;
  await command();
  selected = "界".repeat(141);
  await command();
  assert.deepEqual(sent, [longURL]);
  assert.match(errors[0], /Post length is 282/);
});
