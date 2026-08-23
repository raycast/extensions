import { strict as assert } from "node:assert";
import { test } from "node:test";
import { applyDiscovery, decodeKeyEquivalent, parseAppPreferences, SOURCE_DISCOVER } from "../src/discover";
import { normalizeShortcut } from "../src/schema";

test("decodeKeyEquivalent maps modifiers and keys", () => {
  assert.equal(decodeKeyEquivalent("@^k"), "Cmd + Ctrl + K");
  assert.equal(decodeKeyEquivalent("~$d"), "Opt + Shift + D");
  assert.equal(decodeKeyEquivalent("@2"), "Cmd + 2");
  assert.equal(decodeKeyEquivalent("$a"), "Shift + A");
  assert.equal(decodeKeyEquivalent("#8"), "Keypad + 8");
});

test("decodeKeyEquivalent handles special keys", () => {
  assert.equal(decodeKeyEquivalent("@\uF700"), "Cmd + Up");
  assert.equal(decodeKeyEquivalent("\uF703"), "Right");
  assert.equal(decodeKeyEquivalent("@\u00A0"), "Cmd + Space");
  assert.equal(decodeKeyEquivalent("^\r"), "Ctrl + Return");
  assert.equal(decodeKeyEquivalent("@\uF704"), "Cmd + F1");
  assert.equal(decodeKeyEquivalent("@\uF70F"), "Cmd + F12");
});

test("decodeKeyEquivalent rejects garbage", () => {
  assert.equal(decodeKeyEquivalent(""), null);
  assert.equal(decodeKeyEquivalent("@"), null);
  assert.equal(decodeKeyEquivalent("@ab"), null);
  assert.equal(decodeKeyEquivalent("\uFFFF"), null);
});

test("parseAppPreferences extracts valid entries with app category", () => {
  const json = {
    NSUserKeyEquivalents: {
      "Toggle Sidebar": "@^s",
      "Zoom In": "@=",
      broken: "@zz",
      ignored: 42,
    },
  };
  const items = parseAppPreferences(json, "Terminal");
  assert.deepEqual(
    items.map((s) => [s.title, s.keys]),
    [
      ["Toggle Sidebar", "Cmd + Ctrl + S"],
      ["Zoom In", "Cmd + ="],
    ],
  );
  for (const s of items) {
    assert.equal(s.category, "Terminal");
    assert.equal(s.source, SOURCE_DISCOVER);
  }
});

test("parseAppPreferences returns empty for missing/garbage payload", () => {
  assert.deepEqual(parseAppPreferences({}, "X"), []);
  assert.deepEqual(parseAppPreferences({ NSUserKeyEquivalents: "nope" }, "X"), []);
  assert.deepEqual(parseAppPreferences(null, "X"), []);
});

function disc(title: string, keys: string): ReturnType<typeof normalizeShortcut> {
  return normalizeShortcut({ category: "Terminal", title, keys, source: SOURCE_DISCOVER });
}

test("applyDiscovery sweep replaces changed keys and drops vanished entries", () => {
  const existing = [
    disc("Toggle Sidebar", "Cmd + Ctrl + S"),
    disc("Old Menu", "Cmd + O"),
    normalizeShortcut({ category: "Manual", title: "Handmade", keys: "Hyper + H" }),
    normalizeShortcut({ category: "Terminal", title: "User Edited", keys: "F1", source: SOURCE_DISCOVER }),
  ];
  // simulate user edit detaching entry
  existing[3] = { ...existing[3], source: undefined };

  const incoming = [disc("Toggle Sidebar", "Cmd + Shift + S"), disc("New Menu", "Cmd + N")];
  const { next, added, removed } = applyDiscovery(existing, incoming, true);

  assert.deepEqual(
    added.map((s) => s.title).sort(),
    ["New Menu", "Toggle Sidebar"],
  );
  assert.deepEqual(
    removed.map((s) => s.title),
    ["Toggle Sidebar", "Old Menu"],
  );

  const titles = next.map((s) => s.title);
  assert.ok(titles.includes("Old Menu") === false);
  assert.ok(titles.includes("User Edited"), "detached entry survives");
  assert.ok(titles.includes("Handmade"), "manual entry untouched");

  const sidebar = next.find((s) => s.title === "Toggle Sidebar")!;
  assert.equal(sidebar.keys, "Cmd + Shift + S");
  assert.equal(next.filter((s) => s.title === "Toggle Sidebar").length, 1, "no stale copy left behind");
});

test("applyDiscovery single import only touches same title pair", () => {
  const existing = [disc("A", "Cmd + A"), disc("B", "Cmd + B")];
  const incoming = [disc("A", "Cmd + Shift + A")];
  const { next, added, removed } = applyDiscovery(existing, incoming, false);

  assert.equal(added.length, 1);
  assert.deepEqual(removed.map((s) => s.title), ["A"]);
  assert.deepEqual(next.map((s) => s.keys).sort(), ["Cmd + B", "Cmd + Shift + A"]);
});

test("applyDiscovery skips exact duplicates already present", () => {
  const existing = [disc("Same", "Cmd + K")];
  const { next, added, removed } = applyDiscovery(existing, [disc("Same", "Cmd + K")], true);
  assert.deepEqual({ added: added.length, removed: removed.length }, { added: 0, removed: 0 });
  assert.equal(next.length, 1);
});

test("applyDiscovery sweep spares protected categories", () => {
  const up = normalizeShortcut({ category: "UpNote", title: "Sidebar", keys: "Cmd + Shift + S", source: SOURCE_DISCOVER });
  const zombie = normalizeShortcut({ category: "OldApp", title: "Zombie", keys: "Cmd + Z", source: SOURCE_DISCOVER });
  // UpNote's plist was unreadable this run and is protected; OldApp is not.
  const incoming = [normalizeShortcut({ category: "OldApp", title: "Zombie", keys: "Cmd + Shift + Z" })];
  const { next, removed } = applyDiscovery([up, zombie], incoming, true, ["UpNote"]);

  assert.deepEqual(removed.map((s) => s.title), ["Zombie"]);
  assert.ok(next.some((s) => s.title === "Sidebar"), "protected category survives sweep");
});
