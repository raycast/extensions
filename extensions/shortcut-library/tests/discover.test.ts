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
    ]
  );
  for (const s of items) {
    assert.equal(s.category, "Terminal");
    assert.equal(s.source, SOURCE_DISCOVER);
  }
});

test("parseAppPreferences stamps the source plist path", () => {
  const items = parseAppPreferences({ NSUserKeyEquivalents: { Zoom: "@=" } }, "Terminal", FILE_A);
  assert.equal(items.length, 1);
  assert.equal(items[0].sourceFile, FILE_A);
});

test("parseAppPreferences returns empty for missing/garbage payload", () => {
  assert.deepEqual(parseAppPreferences({}, "X"), []);
  assert.deepEqual(parseAppPreferences({ NSUserKeyEquivalents: "nope" }, "X"), []);
  assert.deepEqual(parseAppPreferences(null, "X"), []);
});

const FILE_A = "/Users/x/Library/Preferences/com.terminal.plist";
const FILE_B = "/Users/x/Library/Containers/terminal/Data/Library/Preferences/com.terminal.plist";
const FILE_UP = "/Users/x/Library/Containers/upnote/Data/Library/Preferences/com.example.UpNote.plist";
const FILE_MAIL = "/Users/x/Library/Preferences/com.apple.mail.plist";

function disc(title: string, keys: string, sourceFile?: string): ReturnType<typeof normalizeShortcut> {
  return normalizeShortcut({ category: "Terminal", title, keys, source: SOURCE_DISCOVER, sourceFile });
}

test("applyDiscovery sweep replaces changed keys and drops vanished entries", () => {
  const existing = [
    disc("Toggle Sidebar", "Cmd + Ctrl + S", FILE_A),
    disc("Old Menu", "Cmd + O", FILE_A),
    normalizeShortcut({ category: "Manual", title: "Handmade", keys: "Hyper + H" }),
  ];

  const incoming = [disc("Toggle Sidebar", "Cmd + Shift + S", FILE_A), disc("New Menu", "Cmd + N", FILE_A)];
  const { next, added, removed } = applyDiscovery(existing, incoming, true, [FILE_A]);

  assert.deepEqual(added.map((s) => s.title).sort(), ["New Menu", "Toggle Sidebar"]);
  assert.deepEqual(
    removed.map((s) => s.title),
    ["Toggle Sidebar", "Old Menu"]
  );

  const titles = next.map((s) => s.title);
  assert.ok(titles.includes("Old Menu") === false);
  assert.ok(titles.includes("Handmade"), "manual entry untouched");

  const sidebar = next.find((s) => s.title === "Toggle Sidebar")!;
  assert.equal(sidebar.keys, "Cmd + Shift + S");
  assert.equal(next.filter((s) => s.title === "Toggle Sidebar").length, 1, "no stale copy left behind");
});

test("applyDiscovery keeps entries from files not re-read this run", () => {
  // UpNote's plist was unreadable this run, so FILE_UP is not among the freshly
  // read files; its stored row must survive untouched even though it matches no
  // incoming item.
  const up = normalizeShortcut({
    category: "UpNote",
    title: "Sidebar",
    keys: "Cmd + Shift + S",
    source: SOURCE_DISCOVER,
    sourceFile: FILE_UP,
  });
  const incoming = [disc("Zoom", "Cmd + Shift + Z", FILE_A)];

  const { next, removed } = applyDiscovery([up], incoming, true, [FILE_A]);

  assert.deepEqual(removed, []);
  assert.equal(next.length, 2);
});

test("applyDiscovery clears rows from a file that now has no shortcuts left", () => {
  // Terminal's plist still parses but the user removed their last customization,
  // so it yields zero incoming entries. Its stale rows must be cleaned up rather
  // than lingering forever.
  const stale = disc("Old Menu", "Cmd + O", FILE_A);
  const incoming = [
    normalizeShortcut({
      category: "Mail",
      title: "Reply",
      keys: "Cmd + R",
      source: SOURCE_DISCOVER,
      sourceFile: FILE_MAIL,
    }),
  ];

  const { next, removed } = applyDiscovery([stale], incoming, true, [FILE_A, FILE_MAIL]);

  assert.deepEqual(
    removed.map((s) => s.title),
    ["Old Menu"]
  );
  assert.deepEqual(
    next.map((s) => s.title),
    ["Reply"]
  );
});

test("applyDiscovery single import only touches same title pair", () => {
  const existing = [disc("A", "Cmd + A"), disc("B", "Cmd + B")];
  const incoming = [disc("A", "Cmd + Shift + A")];
  const { next, added, removed } = applyDiscovery(existing, incoming, false);

  assert.equal(added.length, 1);
  assert.deepEqual(
    removed.map((s) => s.title),
    ["A"]
  );
  assert.deepEqual(next.map((s) => s.keys).sort(), ["Cmd + B", "Cmd + Shift + A"]);
});

test("applyDiscovery skips exact duplicates already present", () => {
  const existing = [disc("Same", "Cmd + K")];
  const { next, added, removed } = applyDiscovery(existing, [disc("Same", "Cmd + K")], true);
  assert.deepEqual({ added: added.length, removed: removed.length }, { added: 0, removed: 0 });
  assert.equal(next.length, 1);
});

test("applyDiscovery sweeps per file when one copy of a bundle reads and a sibling does not", () => {
  // Same bundle id, two files: FILE_A read fine and re-keyed Zoom; FILE_B was
  // unreadable. The readable file's stale row must be swept (no stale+updated
  // coexistence) while the unreadable file's row is retained — neither blanket
  // exemption nor blanket sweeping is correct here.
  const zoomOld = disc("Zoom", "Cmd + =", FILE_A);
  const legacyFromFileB = disc("Legacy Menu", "Cmd + L", FILE_B);
  const incoming = [disc("Zoom", "Cmd + Shift + Z", FILE_A)];

  const { next, removed } = applyDiscovery([zoomOld, legacyFromFileB], incoming, true, [FILE_A]);

  assert.deepEqual(
    removed.map((s) => s.title),
    ["Zoom"],
    "readable file's stale row swept"
  );
  assert.ok(
    next.some((s) => s.title === "Legacy Menu"),
    "unreadable file's row retained"
  );
  const zooms = next.filter((s) => s.title === "Zoom");
  assert.equal(zooms.length, 1, "exactly one Zoom, no stale+updated coexistence");
  assert.equal(zooms[0].keys, "Cmd + Shift + Z");
});

test("applyDiscovery sweep removes only entries absent from their own re-read file", () => {
  // Mail's file was also read this run but no longer customizes Old Compose,
  // while keeping another shortcut — so exactly the vanished row is removed.
  const staleMail = normalizeShortcut({
    category: "Mail",
    title: "Old Compose",
    keys: "Cmd + N",
    source: SOURCE_DISCOVER,
    sourceFile: FILE_MAIL,
  });
  const keptMail = normalizeShortcut({
    category: "Mail",
    title: "Reply",
    keys: "Cmd + R",
    source: SOURCE_DISCOVER,
    sourceFile: FILE_MAIL,
  });
  const incoming = [
    disc("New Menu", "Cmd + Shift + O", FILE_A),
    normalizeShortcut({
      category: "Mail",
      title: "Reply",
      keys: "Cmd + R",
      source: SOURCE_DISCOVER,
      sourceFile: FILE_MAIL,
    }),
  ];

  const { next, removed } = applyDiscovery([staleMail, keptMail], incoming, true, [FILE_A, FILE_MAIL]);

  assert.deepEqual(
    removed.map((s) => s.title),
    ["Old Compose"]
  );
  assert.ok(next.some((s) => s.title === "Reply"));
  assert.ok(next.some((s) => s.title === "New Menu"));
});

test("applyDiscovery keeps the same plist row when Spotlight display name changes", () => {
  const stored = normalizeShortcut({
    category: "Terminal",
    title: "Zoom",
    keys: "Cmd + =",
    source: SOURCE_DISCOVER,
    sourceFile: FILE_A,
  });
  const incoming = [
    normalizeShortcut({
      category: "com.apple.Terminal",
      title: "Zoom",
      keys: "Cmd + =",
      source: SOURCE_DISCOVER,
      sourceFile: FILE_A,
    }),
  ];

  const { next, added, removed } = applyDiscovery([stored], incoming, true, [FILE_A]);

  assert.equal(added.length, 0);
  assert.equal(removed.length, 0);
  assert.equal(next.length, 1);
  assert.equal(next[0].sourceFile, FILE_A);
});

test("applyDiscovery still drops a re-keyed binding when the display name changes", () => {
  const stored = normalizeShortcut({
    category: "Terminal",
    title: "Zoom",
    keys: "Cmd + =",
    source: SOURCE_DISCOVER,
    sourceFile: FILE_A,
  });
  const incoming = [
    normalizeShortcut({
      category: "com.apple.Terminal",
      title: "Zoom",
      keys: "Cmd + Shift + Z",
      source: SOURCE_DISCOVER,
      sourceFile: FILE_A,
    }),
  ];

  const { next, removed } = applyDiscovery([stored], incoming, true, [FILE_A]);

  assert.deepEqual(
    removed.map((s) => s.keys),
    ["Cmd + ="]
  );
  const zooms = next.filter((s) => s.title === "Zoom");
  assert.equal(zooms.length, 1, "no stale+updated coexistence after a name change");
  assert.equal(zooms[0].keys, "Cmd + Shift + Z");
});

test("applyDiscovery single import matches by source file, not display name", () => {
  const stored = normalizeShortcut({
    category: "Terminal",
    title: "Zoom",
    keys: "Cmd + =",
    source: SOURCE_DISCOVER,
    sourceFile: FILE_A,
  });
  const incoming = [
    normalizeShortcut({
      category: "com.apple.Terminal",
      title: "Zoom",
      keys: "Cmd + Shift + Z",
      source: SOURCE_DISCOVER,
      sourceFile: FILE_A,
    }),
  ];

  const { next, removed } = applyDiscovery([stored], incoming, false);

  assert.deepEqual(
    removed.map((s) => s.keys),
    ["Cmd + ="]
  );
  assert.equal(next.length, 1);
  assert.equal(next[0].keys, "Cmd + Shift + Z");
});
