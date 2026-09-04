const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");
const { runInThisContext } = require("node:vm");
const ts = require("typescript");

function loadModule(path, dependencies) {
  const filename = resolve(__dirname, "..", path);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
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

const postSearch = loadModule("src/v2/lib/post_search.ts", {});
const { filterBookmarks } = loadModule("src/v2/lib/bookmark_search.ts", {
  "./twitter": {},
  "./post_search": postSearch,
});

function bookmark(id, text, name = "Example User", username = "example") {
  return { id, text, user: { id: `user-${id}`, name, username } };
}

test("bookmark search rejects loose fuzzy subsequence matches in long posts", () => {
  const unrelated = bookmark(
    "1",
    "We will give one banked reset for every day you do not have access to Astra on your paid plan.",
    "Tibo",
    "thsottiaux",
  );
  const matching = bookmark("2", "Raycast makes this workflow much faster.");

  assert.deepEqual(filterBookmarks([unrelated, matching], "raycast"), [matching]);
});

test("bookmark search matches text and author identity case-insensitively", () => {
  const textMatch = bookmark("1", "A RAYCAST extension");
  const nameMatch = bookmark("2", "A useful workflow", "Ráycast Team", "team");
  const usernameMatch = bookmark("3", "A useful workflow", "Example", "RaycastApp");
  const unrelated = bookmark("4", "A useful workflow");

  assert.deepEqual(filterBookmarks([textMatch, nameMatch, usernameMatch, unrelated], "@raycast"), [
    textMatch,
    nameMatch,
    usernameMatch,
  ]);
});

test("bookmark search requires every query term and preserves feed order", () => {
  const second = bookmark("2", "Raycast automation guide");
  const first = bookmark("1", "Automation tips", "Raycast Team", "team");
  const partial = bookmark("3", "Raycast tips");

  assert.deepEqual(filterBookmarks([second, first, partial], "raycast automation"), [second, first]);
});

test("bookmark command replaces native fuzzy filtering with the precise filter", () => {
  const matching = bookmark("1", "Building with Raycast");
  const unrelated = bookmark("2", "We will give one banked reset for access to Astra", "Tibo", "thsottiaux");
  const TweetList = () => {};
  const setQuery = () => {};
  const BookmarksCommand = loadModule("src/bookmarks.tsx", {
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }) },
    react: { useState: () => ["raycast", setQuery] },
    "@raycast/api": { Icon: { Bookmark: "bookmark" } },
    "@raycast/utils": {
      usePromise: () => ({ data: [unrelated, matching], isLoading: false, revalidate: async () => {} }),
    },
    "./v2/components/tweet": { TweetList },
    "./v2/lib/bookmark_search": { filterBookmarks },
    "./v2/lib/twitterapi_v2": { clientV2: { clearCache() {} } },
  }).default;

  const tree = BookmarksCommand();
  assert.equal(tree.type, TweetList);
  assert.deepEqual(tree.props.tweets, [matching]);
  assert.equal(tree.props.searchText, "raycast");
  assert.equal(tree.props.onSearchTextChange, setQuery);
  assert.equal(tree.props.filtering, false);
  assert.equal(tree.props.emptyViewTitle, "No Matching Bookmarks");
});
