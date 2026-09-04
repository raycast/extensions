const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");
const { runInThisContext } = require("node:vm");
const ts = require("typescript");

// Exercise the actual list components without launching Raycast or requesting X data.
function loadComponent(path, dependencies) {
  const filename = resolve(__dirname, "..", path);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: filename,
  });
  const module = { exports: {} };
  const requireMock = (name) => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  };
  runInThisContext(`(function(require, module, exports) { ${outputText}\n})`, { filename })(
    requireMock,
    module,
    module.exports,
  );
  return module.exports;
}

const element = (type, props, key) => ({ type, props, key });
const List = Object.assign(() => {}, { EmptyView: () => {}, Item: () => {}, Section: () => {} });
const Icon = {
  ArrowClockwise: "refresh",
  AtSymbol: "at",
  Bookmark: "bookmark",
  ExclamationMark: "error",
  Person: "person",
};
const Keyboard = { Shortcut: { Common: { Refresh: "refresh-shortcut" } } };
const SetReplyHiddenAction = () => {};
const ShowDetailV2Action = () => {};
const commonDependencies = {
  "react/jsx-runtime": { jsx: element, jsxs: element },
  react: { useState: (initial) => [typeof initial === "function" ? initial() : initial, () => {}], useEffect() {} },
  "@raycast/api": {
    List,
    Action: {},
    ActionPanel: { Section() {} },
    Icon,
    Image: { Mask: { Circle: "circle" } },
    Keyboard,
  },
};
const twitter = loadComponent("src/v2/lib/twitter.ts", {});

const { ClientV2, TwitterAPIError, TwitterUserNotFoundError } = loadComponent("src/v2/lib/twitterapi_v2.ts", {
  "@raycast/api": {
    Cache: class extends Map {
      constructor() {
        super();
      }
      remove(key) {
        return this.delete(key);
      }
    },
  },
  "node:fs/promises": require("node:fs/promises"),
  "node:path": require("node:path"),
  react: commonDependencies.react,
  "twitter-api-v2": require("twitter-api-v2"),
  "./oauth": {},
  "./twitter": twitter,
  "../../utils": {},
  "./post_search": {},
});

function folderClient(folderPage, lookupResult) {
  const calls = [];
  const client = new ClientV2();
  client.clearCache();
  client.me = async () => ({ id: "7" });
  client.request = async (operation) =>
    operation({
      v2: {
        get: async (path, options) => {
          calls.push({ path, options });
          return folderPage;
        },
        tweets: async (ids, options) => {
          calls.push({ ids, options });
          return lookupResult;
        },
      },
    });
  return { client, calls };
}

test("folder pages resolve ID-only responses in one batch and retain their cursor", async () => {
  const { client, calls } = folderClient(
    { data: [{ id: "3" }, { id: "1" }, { id: "2" }, { id: "1" }], meta: { next_token: "next" } },
    {
      data: [
        { id: "1", text: "First", author_id: "9" },
        { id: "3", text: "Third", author_id: "9" },
      ],
      includes: { users: [{ id: "9", name: "Author", username: "author", profile_image_url: "avatar" }] },
    },
  );
  const page = await client.bookmarksInFolder("42", "previous");
  assert.deepEqual(
    page.items.map((item) => item.id),
    ["3", "1"],
  );
  assert.equal(page.items[0].user.profile_image_url, "avatar");
  assert.equal(page.nextToken, "next");
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], {
    path: "users/7/bookmarks/folders/42",
    options: { max_results: 20, pagination_token: "previous" },
  });
  assert.deepEqual(calls[1].ids, ["3", "1", "2"]);
  assert.ok(calls[1].options["user.fields"].includes("profile_image_url"));
  await client.bookmarksInFolder("42", "previous");
  assert.equal(calls.length, 2, "Resolved pages should still use the read cache");
});

test("empty or entirely unavailable folder pages preserve continuation", async () => {
  for (const data of [[], [{ id: "1" }]]) {
    const { client, calls } = folderClient({ data, meta: { next_token: "next" } }, {});
    assert.deepEqual(await client.bookmarksInFolder("42"), { items: [], nextToken: "next" });
    assert.equal(calls.length, data.length === 0 ? 1 : 2);
  }
});

test("HTTP 404 username lookups become a contextual profile error", async () => {
  const client = new ClientV2();
  client.cachedRead = async (_key, operation) =>
    operation({
      v2: {
        userByUsername: async () => {
          throw new TwitterAPIError("Not Found Error: Could not find user", 404, { title: "Not Found Error" });
        },
      },
    });

  await assert.rejects(client.getUserByUsername("@Missing_User"), (error) => {
    assert.ok(error instanceof TwitterUserNotFoundError);
    assert.equal(error.username, "missing_user");
    assert.equal(error.message, "No X profile found for @missing_user. Check the username and try again.");
    return true;
  });
});

test("inline not-found payloads are handled before profile conversion", async () => {
  const client = new ClientV2();
  client.cachedRead = async (_key, operation) =>
    operation({
      v2: {
        userByUsername: async () => ({
          errors: [
            {
              resource_type: "user",
              title: "Not Found Error",
              detail: "Could not find user with username: [missing_user].",
              type: "https://api.x.com/2/problems/resource-not-found",
            },
          ],
        }),
      },
    });

  await assert.rejects(client.getUserByUsername("missing_user"), (error) => {
    assert.ok(error instanceof TwitterUserNotFoundError);
    assert.equal(error.message, "No X profile found for @missing_user. Check the username and try again.");
    assert.doesNotMatch(error.stack, /twitterUserToUser/);
    return true;
  });
});

test("missing profile data without a not-found error stays readable", async () => {
  const client = new ClientV2();
  client.cachedRead = async (_key, operation) =>
    operation({
      v2: {
        userByUsername: async () => ({
          errors: [
            {
              title: "Unexpected Error",
              detail: "Profile lookup is temporarily unavailable.",
              type: "https://api.x.com/2/problems/unavailable",
            },
          ],
        }),
      },
    });

  await assert.rejects(
    client.getUserByUsername("example"),
    /X could not load @example: Profile lookup is temporarily unavailable/,
  );
});

test("username lookup validates handles before making a billed request", async () => {
  const client = new ClientV2();
  let requested = false;
  client.cachedRead = async () => {
    requested = true;
  };

  await assert.rejects(
    client.getUserByUsername("not a username"),
    /An exact X username of 1 to 15 letters, numbers, or underscores is required/,
  );
  assert.equal(requested, false);
});

const tweetComponents = loadComponent("src/v2/components/tweet.tsx", {
  ...commonDependencies,
  "@raycast/utils": { usePromise: () => ({ data: ["eligible-reply"] }) },
  "../../common": { shouldShowListWithDetails: () => false },
  "../lib/twitter": twitter,
  "../lib/twitterapi_v2": { clientV2: {} },
  "../../utils": {
    compactNumberFormat: String,
    padStart: (text, length) => text.padStart(length),
    replaceAll: (text, pattern, replacement) => text.replaceAll(pattern, replacement),
  },
  "./actions": { SetReplyHiddenAction, ShowDetailV2Action },
  "./detail": {},
});
const pagination = { pageSize: 20, hasMore: true, onLoadMore() {} };
let profilePosts;
let profileState = { data: { id: "user-1", name: "Example", username: "example" }, isLoading: false };
const Profile = loadComponent("src/user-profile.tsx", {
  ...commonDependencies,
  "@raycast/utils": {
    usePromise: (fn) =>
      String(fn).includes("getUserByUsername")
        ? { ...profileState, revalidate: async () => {} }
        : { data: profilePosts, pagination },
  },
  "./common": { shouldShowListWithDetails: () => false },
  "./v2/components/tweet": tweetComponents,
  "./v2/lib/twitter": twitter,
  "./v2/lib/twitterapi_v2": { TwitterUserNotFoundError },
}).default;

function rows(tree) {
  if (Array.isArray(tree)) return tree.flatMap(rows);
  if (!tree || typeof tree !== "object") return [];
  if (tree.type === tweetComponents.TweetListItem) return [tree];
  return rows(tree.props?.children);
}

function post(id, text = id) {
  return Object.freeze({ id, text, user: { id: "user-1" }, like_count: 0, retweet_count: 0 });
}

function elementsOfType(tree, type) {
  if (Array.isArray(tree)) return tree.flatMap((item) => elementsOfType(item, type));
  if (!tree || typeof tree !== "object") return [];
  const matches = tree.type === type ? [tree] : [];
  return matches.concat(elementsOfType(tree.props?.children, type));
}

test("moderation actions are only rendered for eligible replies", () => {
  const tweet = post("reply");
  const ineligible = tweetComponents.TweetListItem({ tweet, canModerateReply: false });
  assert.equal(elementsOfType(ineligible.props.actions, SetReplyHiddenAction).length, 0);
  assert.equal(elementsOfType(ineligible.props.actions, ShowDetailV2Action)[0].props.canModerateReply, false);

  const eligible = tweetComponents.TweetListItem({ tweet, canModerateReply: true });
  assert.deepEqual(
    elementsOfType(eligible.props.actions, SetReplyHiddenAction).map((action) => action.props.hidden),
    [true, false],
  );
  assert.equal(elementsOfType(eligible.props.actions, ShowDetailV2Action)[0].props.canModerateReply, true);
});

const detailComponents = loadComponent("src/v2/components/detail.tsx", {
  ...commonDependencies,
  "@raycast/api": {
    ...commonDependencies["@raycast/api"],
    Detail: () => {},
    showToast() {},
    Toast: { Style: { Failure: "failure" } },
  },
  "../lib/twitter": twitter,
  "../lib/twitterapi_v2": {
    clientV2: {},
    useRefresher: () => ({ data: undefined, error: undefined, isLoading: false, fetcher: {} }),
  },
  "./actions": { SetReplyHiddenAction },
});

test("post detail only renders moderation actions for eligible replies", () => {
  const tweet = post("reply");
  const ineligible = detailComponents.TweetDetail({ tweet, canModerateReply: false });
  assert.equal(elementsOfType(ineligible.props.actions, SetReplyHiddenAction).length, 0);

  const eligible = detailComponents.TweetDetail({ tweet, canModerateReply: true });
  assert.deepEqual(
    elementsOfType(eligible.props.actions, SetReplyHiddenAction).map((action) => action.props.hidden),
    [true, false],
  );
});

test("post lists pass resolved moderation eligibility to each row", () => {
  const tree = tweetComponents.TweetList({
    tweets: [
      { ...post("eligible-reply"), conversation_id: "root" },
      { ...post("ordinary-post"), conversation_id: "ordinary-post" },
    ],
  });
  assert.deepEqual(
    rows(tree).map((row) => row.props.canModerateReply),
    [true, false],
  );
});

test("moderation eligibility follows the authenticated conversation owner", async () => {
  const client = new ClientV2();
  client.me = async () => ({ id: "current-user" });
  const lookups = [];
  client.cachedRead = async (_key, operation) =>
    operation({
      v2: {
        tweets: async (ids, options) => {
          lookups.push({ ids, options });
          return {
            data: [
              { id: "foreign-root", author_id: "someone-else" },
              { id: "owned-root", author_id: "current-user" },
            ],
          };
        },
      },
    });

  const tweets = [
    { ...post("visible-owned-root"), conversation_id: "visible-owned-root", user: { id: "current-user" } },
    { ...post("visible-owned-reply"), conversation_id: "visible-owned-root", user: { id: "someone-else" } },
    { ...post("nested-owned-reply"), conversation_id: "owned-root", user: { id: "someone-else" } },
    { ...post("foreign-reply"), conversation_id: "foreign-root", user: { id: "someone-else" } },
    { ...post("ordinary-post"), conversation_id: undefined, user: { id: "someone-else" } },
  ];

  assert.deepEqual(await client.getModeratableReplyIds(tweets), ["visible-owned-reply", "nested-owned-reply"]);
  assert.deepEqual(lookups, [
    {
      ids: ["foreign-root", "owned-root"],
      options: { "tweet.fields": ["author_id"] },
    },
  ]);
});

function profileEmptyView(username) {
  const tree = Profile({ arguments: { username } });
  return tree.props.children.find((child) => child?.type === List.EmptyView);
}

test("profile lookup distinguishes initial, invalid, missing, loading, and failed states", () => {
  profileState = { isLoading: false };
  assert.equal(profileEmptyView("").props.title, "Find a User Profile");
  assert.equal(profileEmptyView("not valid").props.title, "Invalid Username");

  const apiError = new TwitterAPIError("raw API response", 404, { title: "Not Found Error" });
  profileState = { error: new TwitterUserNotFoundError("missing", apiError), isLoading: false };
  const missing = profileEmptyView("missing");
  assert.equal(missing.props.title, "Profile Not Found");
  assert.equal(missing.props.description, "No X profile found for @missing. Check the username and try again.");

  profileState = { error: new Error("X is unavailable"), isLoading: false };
  const failed = profileEmptyView("example");
  assert.equal(failed.props.title, "Could Not Load Profile");
  assert.equal(failed.props.description, "X is unavailable");
  assert.equal(failed.props.icon, Icon.ExclamationMark);

  profileState = { isLoading: true };
  assert.equal(profileEmptyView("example"), undefined);

  profileState = { data: { id: "user-1", name: "Example", username: "example" }, isLoading: false };
});

test("an empty intermediate page can explicitly load more posts", () => {
  let loaded = false;
  const tree = tweetComponents.TweetList({
    tweets: [],
    emptyViewTitle: "No Bookmarks Found",
    pagination: {
      pageSize: 0,
      hasMore: true,
      onLoadMore: () => {
        loaded = true;
      },
    },
  });
  assert.equal(tree.props.pagination.pageSize, 1);
  const emptyView = tree.props.children.find((child) => child?.type === List.EmptyView);
  const loadMore = emptyView.props.actions.props.children.find((child) => child?.props?.title === "Load More Posts");
  loadMore.props.onAction();
  assert.equal(loaded, true);
});

const renderers = {
  "shared post list": (tweets) => tweetComponents.TweetList({ tweets, pagination }),
  "profile post list": (tweets) => {
    profilePosts = tweets;
    return Profile({ arguments: { username: "example" } });
  },
};

for (const [name, render] of Object.entries(renderers)) {
  test(`${name}: overlapping pages produce unique row IDs in original feed order`, () => {
    const first = post("2091064589136093573");
    const second = post("2090791895257723067");
    // Adjacent snowflake IDs must remain distinct strings (they exceed Number.MAX_SAFE_INTEGER).
    const third = post("2091064589136093574");
    const firstPage = [first, second, first];
    const nextPage = [post(second.id, "Repeated on next page"), third];
    const input = Object.freeze([...firstPage, ...nextPage]);
    const tree = render(input);
    const rendered = rows(tree);

    assert.deepEqual(
      rendered.map((row) => row.props.tweet),
      [first, second, third],
    );
    assert.deepEqual(
      rendered.map((row) => row.key),
      [first.id, second.id, third.id],
    );
    assert.deepEqual(
      rendered.map((row) => tweetComponents.TweetListItem(row.props).props.id),
      [first.id, second.id, third.id],
    );
    assert.strictEqual(tree.props.pagination, pagination);
    assert.equal(input.length, 5);
  });
}
