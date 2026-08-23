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

test("applyDiscovery partial scan never sweeps discover-sourced entries", () => {
  const up = normalizeShortcut({ category: "UpNote", title: "Sidebar", keys: "Cmd + Shift + S", source: SOURCE_DISCOVER });
  const other = normalizeShortcut({ category: "Terminal", title: "Zoom", keys: "Cmd + =", source: SOURCE_DISCOVER });
  const manual = normalizeShortcut({ category: "Manual", title: "Handmade", keys: "Hyper + H" });
  // One app unreadable → keepCategories is populated. A broken Spotlight run may
  // have stored a display name that differs from the bundle id we can see now, so
  // the destructive sweep is skipped entirely rather than risk deleting valid data.
  const incoming = [normalizeShortcut({ category: "Terminal", title: "Zoom", keys: "Cmd + Shift + Z" })];
  const { next, removed } = applyDiscovery([up, other, manual], incoming, true, ["com.example.UpNote"]);

  assert.deepEqual(removed, []);
  assert.ok(next.some((s) => s.title === "Sidebar"), "unreadable app entry survives");
  assert.ok(next.some((s) => s.title === "Zoom"), "other discover entry survives");
  assert.ok(next.some((s) => s.keys === "Cmd + Shift + Z"), "re-keyed discover entry still imported");
  assert.equal(next.length, 4);
});

test("applyDiscovery sweep removes outdated entries only on a fully healthy scan", () => {
  const stale = normalizeShortcut({ category: "Terminal", title: "Old Menu", keys: "Cmd + O", source: SOURCE_DISCOVER });
  const incoming = [normalizeShortcut({ category: "Terminal", title: "New Menu", keys: "Cmd + N" })];
  // No failed apps → sweep runs and drops the vanished discover entry.
  const { next, removed } = applyDiscovery([stale], incoming, true);

  assert.deepEqual(removed.map((s) => s.title), ["Old Menu"]);
  assert.ok(next.some((s) => s.title === "New Menu"));
});
