const { test } = require("node:test");
const assert = require("node:assert/strict");
const { join } = require("node:path");
const { searchApps, memoExcerpt } = require(
  join(process.env.VESSLO_TEST_BUILD, "utils/search-filter.js"),
);
const base = require("./fixtures/current-app.json");
const app = {
  ...base,
  name: "Editor",
  bundleId: "com.example.ink",
  developer: "Example Studio",
  tags: ["Writing"],
  memo: "Bought for manuscript proofreading.",
};

test("Bundle ID and memo-only matches survive custom search independently of names", () => {
  assert.equal(searchApps([app], " COM.EXAMPLE.INK ")[0].app.id, app.id);
  assert.deepEqual(searchApps([app], "proofreading")[0].matchedFields, [
    "memo",
  ]);
  assert.equal(
    searchApps([app], "proofreading")[0].matchDescription,
    "Memo: Bought for manuscript proofreading.",
  );
  assert.equal(
    searchApps([app], "ink")[0].matchDescription,
    `Bundle ID: ${app.bundleId}`,
  );
});
test("each search scope restricts matching to its selected field", () => {
  const samples = {
    name: "editor",
    bundleId: "ink",
    developer: "studio",
    tag: "writing",
    memo: "proofreading",
  };
  for (const [scope, query] of Object.entries(samples)) {
    for (const selected of Object.keys(samples)) {
      assert.equal(
        searchApps([app], query, selected).length,
        selected === scope ? 1 : 0,
        `${query}/${selected}`,
      );
    }
  }
});
test("blank query includes installed entries and never resurrects deleted history", () => {
  const deleted = { ...app, id: "deleted", isDeleted: true };
  assert.deepEqual(
    searchApps([app, deleted], "  ", "memo").map((r) => r.app.id),
    [app.id],
  );
  assert.deepEqual(searchApps([deleted], "editor"), []);
  assert.equal(
    searchApps(
      [{ ...app, memo: null, bundleId: null, developer: null, tags: [] }],
      "none",
    ).length,
    0,
  );
});
test("memo excerpts retain the matching context with bounded Unicode-safe output", () => {
  const memo = `${"📚".repeat(160)}\n\t proofreading ${"끝".repeat(160)}`;
  const excerpt = memoExcerpt(memo, "proofreading");
  assert.ok(excerpt.includes("proofreading"));
  assert.ok(excerpt.startsWith("…") && excerpt.endsWith("…"));
  assert.ok(Array.from(excerpt).length <= 120);
  assert.ok(!/[\n\t\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(excerpt));
  assert.equal(memoExcerpt(" short\n memo ", "short"), "short memo");
  const repeatedSpace = `${"a".repeat(160)} needle  phrase ${"z".repeat(160)}`;
  assert.ok(
    memoExcerpt(repeatedSpace, "needle  phrase").includes("needle phrase"),
  );
});

test("matching name, developer, and tags explain the match in visible text", () => {
  assert.deepEqual(searchApps([app], "editor")[0].matchedFields, ["name"]);
  assert.equal(searchApps([app], "editor")[0].matchDescription, "Name: Editor");
  assert.equal(
    searchApps([app], "studio")[0].matchDescription,
    "Developer: Example Studio",
  );
  assert.equal(
    searchApps([app], "writing")[0].matchDescription,
    "Tag: #Writing",
  );
  const multi = { ...app, name: "Example Editor", tags: ["Example", "Other"] };
  const result = searchApps([multi], "example")[0];
  assert.deepEqual(result.matchedFields, [
    "name",
    "bundleId",
    "developer",
    "tag",
  ]);
  assert.match(result.matchDescription, /Name: Example Editor/);
  assert.match(result.matchDescription, /Bundle ID: com.example.ink/);
  assert.match(result.matchDescription, /Developer: Example Studio/);
  assert.match(result.matchDescription, /Tag: #Example/);
  assert.ok(!result.matchDescription.includes("#Other"));
});
