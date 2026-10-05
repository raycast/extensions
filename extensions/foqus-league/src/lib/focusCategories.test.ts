import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import {
  categoryIdFor,
  categoryTitleFor,
  findCategory,
  builtinsAsLogged,
  ownCategoryFor,
  parseCategories,
  readCategories,
  writeImportFile,
} from "./focusCategories.ts";

const MIRROR = JSON.stringify([
  {
    categoryId: "gaming",
    title: "Gaming",
    apps: ["com.valvesoftware.steam"],
    websites: ["steampowered.com"],
    kind: { builtin: "gaming" },
  },
  {
    categoryId: "foqus-block",
    title: "Foqus Block",
    apps: ["com.apple.AppStore", "company.thebrowser.Browser"],
    websites: [],
    kind: { custom: true },
  },
]);

test("parseCategories separates presets from the ones the user made", () => {
  const cats = parseCategories(MIRROR);
  assert.equal(cats.length, 2);
  assert.equal(cats[0].builtin, true);
  assert.equal(cats[1].builtin, false);
  assert.deepEqual(cats[1].apps, ["com.apple.AppStore", "company.thebrowser.Browser"]);
});

test("parseCategories skips rows it cannot make sense of instead of throwing", () => {
  assert.deepEqual(parseCategories("not json"), []);
  assert.deepEqual(parseCategories('{"nope":1}'), []);
  const partial = parseCategories(JSON.stringify([{ title: "no id" }, { categoryId: "ok" }]));
  assert.deepEqual(
    partial.map((c) => c.id),
    ["ok"],
  );
  assert.deepEqual(partial[0].apps, []);
});

test("categoryTitleFor strips the goal's emoji, which would slugify into noise", () => {
  assert.equal(categoryTitleFor("🏄 Break"), "Foqus Break");
  assert.equal(categoryTitleFor("🚀 SiteRocket"), "Foqus SiteRocket");
  assert.equal(categoryTitleFor("Deep  Work"), "Foqus Deep Work");
});

test("a goal with letters Raycast's ids drop gets a tag, so its category id is its own", () => {
  assert.match(categoryTitleFor("🎯"), /^Foqus Focus [0-9a-f]{6}$/);
  assert.match(categoryTitleFor("写作"), /^Foqus 写作 [0-9a-f]{6}$/);
  assert.equal(categoryTitleFor("🚀 SiteRocket"), "Foqus SiteRocket", "plain Latin titles stay as they are");
  const ids = ["写作", "阅读", "Работа", "🎯", "📚", "写作 v2", "阅读 v2", "Café", "Cafè"].map(
    (g) => ownCategoryFor(g).id,
  );
  assert.equal(new Set(ids).size, ids.length, `ids collide: ${ids.join(", ")}`);
  assert.equal(categoryTitleFor("写作"), categoryTitleFor(" 写作 "), "the tag is stable for one goal");
});

test("categoryIdFor gives the id Raycast 2 gives a category it creates from a title", () => {
  assert.equal(categoryIdFor("Foqus SiteRocket"), "foqus-siterocket");
  assert.equal(categoryIdFor("  Foqus Deep  Work "), "foqus-deep-work");
  assert.equal(categoryIdFor("Foqus Café"), "foqus-caf");
  assert.equal(categoryIdFor("🎯"), "focus-category");
});

test("ownCategoryFor names a goal's category the way its import file and Raycast 2 do", () => {
  assert.deepEqual(ownCategoryFor("🚀 SiteRocket"), { id: "foqus-siterocket", title: "Foqus SiteRocket" });
});

test("builtinsAsLogged keeps only built-ins, with only installed apps, as Raycast 2 logs them", () => {
  const [streaming, ...rest] = builtinsAsLogged(
    [
      {
        id: "streaming",
        title: "Streaming",
        apps: ["com.apple.TV", "com.plexapp.plexmediaserver"],
        websites: ["netflix.com"],
        builtin: true,
      },
      { id: "0F1D-UUID", title: "Foqus Block", apps: ["com.apple.AppStore"], websites: [], builtin: false },
    ],
    new Set(["com.apple.TV", "com.apple.AppStore"]),
  );
  assert.deepEqual(streaming.apps, ["com.apple.TV"]);
  assert.deepEqual(rest, [], "a custom category in the old Raycast 1 mirror may not exist, or differ, in Raycast 2");
});

test("findCategory matches on title, since Raycast generates the id", () => {
  const cats = parseCategories(MIRROR);
  assert.equal(findCategory(cats, "foqus block")?.id, "foqus-block");
  assert.equal(findCategory(cats, "Foqus Missing"), undefined);
});

test("readCategories reads this machine's real mirror without throwing", async () => {
  const cats = await readCategories();
  assert.ok(Array.isArray(cats));
  for (const c of cats) assert.equal(typeof c.id, "string");
});

test("writeImportFile emits the schema Raycast's importer accepts", async () => {
  const dir = await mkdtemp(join(tmpdir(), "foqus-import-"));
  const file = await writeImportFile(
    "🏄 Break",
    [
      { id: "com.apple.AppStore", app: true },
      { id: "company.thebrowser.Browser", app: true },
      { id: "reddit.com", app: false },
    ],
    dir,
  );
  const written = JSON.parse(await readFile(file, "utf8"));
  assert.ok(Array.isArray(written), "top level is an array");
  assert.deepEqual(written, [
    {
      title: "Foqus Break",
      iconName: "bulls-eye-16",
      apps: ["com.apple.AppStore", "company.thebrowser.Browser"],
      websites: ["reddit.com"],
    },
  ]);
  assert.equal(
    findCategory(
      [{ id: "foqus-break", title: written[0].title, apps: [], websites: [], builtin: false }],
      "Foqus Break",
    )?.id,
    "foqus-break",
  );
  await rm(dir, { recursive: true, force: true });
});

test("the import filename survives goals that leave nothing to name it after", async () => {
  const dir = await mkdtemp(join(tmpdir(), "foqus-slug-"));
  try {
    const rocket = await writeImportFile("\u{1F680}", [], dir);
    const surf = await writeImportFile("\u{1F3C4} Break", [], dir);
    const long = await writeImportFile("x".repeat(250), [], dir);
    const again = await writeImportFile("\u{1F680}", [{ id: "x.com", app: false }], dir);
    assert.equal(basename(rocket), "foqus-focus.json");
    assert.equal(again, rocket, "a repeat import replaces its own file, so the setup screen names the right one");
    assert.deepEqual(JSON.parse(await readFile(again, "utf8"))[0].websites, ["x.com"]);
    assert.equal(basename(surf), "foqus-break.json", "a stripped emoji leaves no double dash");
    assert.ok(Buffer.byteLength(basename(long)) <= 255);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
