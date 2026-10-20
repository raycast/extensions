// ─────────────────────────────────────────────────────────────────────
// config-surgery.test.mjs — tests for strict canonical TOML editor.
//
// Uses node:test (built-in, zero dependencies).
// Run: node --test src/lib/config-surgery.test.mjs
//
// Tests verify:
//   - scanCanonical: strict line classification, rejects non-canonical
//   - addEntryToToml: preserves comments, appends correctly, semantic verify
//   - deleteEntryFromToml: targeted removal, comments preserved
//   - updateEntryInToml: refuses comments/unknown fields, clean updates
//   - hasUnknownTopLevelKeys: detects foreign tables
//   - Semantic postconditions: deep-equal delta verification
//   - Reviewer adversarial repros (quoted/dotted/dashed keys, etc.)
// ─────────────────────────────────────────────────────────────────────
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import * as TOML from "smol-toml";
import {
  scanCanonical,
  findBlocks,
  serializeEntry,
  addEntryToToml,
  deleteEntryFromToml,
  updateEntryInToml,
  hasUnknownTopLevelKeys,
} from "./config-surgery.mjs";

// ── Fixtures ───────────────────────────────────────────────────────────

const SHIPPED_CONFIG = `# switcheroo configuration

# Kernel-level modifier remaps (applied via hidutil on startup)
# These persist across app restarts and don't depend on System Settings.
# Equivalent to System Settings → Keyboard → Modifier Keys, but reliable.
[[modifier_remap]]
from = "caps_lock"
to = "left_ctrl"

# Simple remaps: unconditionally swap one key for another
# These apply to every keypress regardless of modifiers.
# Example: swap A and B keys
# [[remap]]
# from = "a"
# to = "b"

# Tap-hold: tap a modifier for one key, hold it for another
# Tap Ctrl alone (quick press+release) → Escape
# Hold Ctrl + other key → normal Ctrl behavior
[[tap_hold]]
key = "right_ctrl"
tap = "escape"
hold = "left_ctrl"
timeout_ms = 200

# Conditional remaps: when a modifier is held, remap keys
# These fire on key-down while the modifier is active
[[conditional_remap]]
modifier = "ctrl"
from = "h"
to = "left_arrow"

[[conditional_remap]]
modifier = "ctrl"
from = "j"
to = "down_arrow"

[[conditional_remap]]
modifier = "ctrl"
from = "k"
to = "up_arrow"

[[conditional_remap]]
modifier = "ctrl"
from = "l"
to = "right_arrow"

# Chords: keys pressed simultaneously within a time window
[[chord]]
keys = ["left_shift", "right_shift"]
emit = "caps_lock"
window_ms = 200
`;

const MINIMAL_CONFIG = `[[remap]]
from = "a"
to = "b"
`;

const MULTI_ENTRY_CONFIG = `[[remap]]
from = "a"
to = "b"

[[remap]]
from = "c"
to = "d"

[[remap]]
from = "e"
to = "f"
`;

const EMPTY_CONFIG = "";

const COMMENT_ONLY_CONFIG = `# This is a comment
# Another comment
# No sections here
`;

// ── Tests for scanCanonical ────────────────────────────────────────────

describe("scanCanonical", () => {
  test("scans MINIMAL_CONFIG — finds 1 block with 2 assignments", () => {
    const { blocks } = scanCanonical(MINIMAL_CONFIG);
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].section, "remap");
    assert.equal(blocks[0].assignments.length, 2);
    assert.equal(blocks[0].assignments[0].key, "from");
    assert.equal(blocks[0].assignments[1].key, "to");
  });

  test("scans MULTI_ENTRY_CONFIG — finds 3 remap blocks", () => {
    const { blocks } = scanCanonical(MULTI_ENTRY_CONFIG);
    const remapBlocks = findBlocks(blocks, "remap");
    assert.equal(remapBlocks.length, 3);
  });

  test("scans SHIPPED_CONFIG — correct counts per section", () => {
    const { blocks } = scanCanonical(SHIPPED_CONFIG);
    assert.equal(findBlocks(blocks, "modifier_remap").length, 1);
    assert.equal(
      findBlocks(blocks, "remap").length,
      0,
      "remap is commented out",
    );
    assert.equal(findBlocks(blocks, "tap_hold").length, 1);
    assert.equal(findBlocks(blocks, "conditional_remap").length, 4);
    assert.equal(findBlocks(blocks, "chord").length, 1);
  });

  test("empty config scans to 0 blocks", () => {
    const { blocks } = scanCanonical(EMPTY_CONFIG);
    assert.equal(blocks.length, 0);
  });

  test("comment-only config scans to 0 blocks", () => {
    const { blocks } = scanCanonical(COMMENT_ONLY_CONFIG);
    assert.equal(blocks.length, 0);
  });
});

// ── Tests for serializeEntry ───────────────────────────────────────────

describe("serializeEntry", () => {
  test("serializes remap entry (two strings)", () => {
    const lines = serializeEntry("remap", { from: "a", to: "b" });
    assert.deepEqual(lines, ['from = "a"', 'to = "b"']);
  });

  test("serializes tap_hold entry with number", () => {
    const lines = serializeEntry("tap_hold", {
      key: "right_ctrl",
      tap: "escape",
      hold: "left_ctrl",
      timeout_ms: 200,
    });
    assert.deepEqual(lines, [
      'key = "right_ctrl"',
      'tap = "escape"',
      'hold = "left_ctrl"',
      "timeout_ms = 200",
    ]);
  });

  test("serializes chord entry with array of strings", () => {
    const lines = serializeEntry("chord", {
      keys: ["left_shift", "right_shift"],
      emit: "caps_lock",
      window_ms: 100,
    });
    assert.deepEqual(lines, [
      'keys = ["left_shift", "right_shift"]',
      'emit = "caps_lock"',
      "window_ms = 100",
    ]);
  });

  test("escapes quotes in string values", () => {
    const lines = serializeEntry("remap", { from: 'a"b', to: "c" });
    assert.equal(lines[0], 'from = "a\\"b"');
  });

  test("rejects non-schema keys", () => {
    assert.throws(
      () => serializeEntry("remap", { from: "a", to: "b", unknown: "x" }),
      /not valid for \[\[remap\]\]/,
    );
  });

  test("rejects control characters in string values", () => {
    assert.throws(
      () => serializeEntry("remap", { from: "a\x00b", to: "c" }),
      /control character/,
    );
  });

  test("rejects non-finite numbers", () => {
    assert.throws(
      () =>
        serializeEntry("tap_hold", {
          key: "a",
          tap: "b",
          hold: "c",
          timeout_ms: Infinity,
        }),
      /non-finite/,
    );
  });

  test("rejects non-integer numbers", () => {
    assert.throws(
      () =>
        serializeEntry("tap_hold", {
          key: "a",
          tap: "b",
          hold: "c",
          timeout_ms: 1.5,
        }),
      /non-integer/,
    );
  });

  test("rejects unsafe integers", () => {
    assert.throws(
      () =>
        serializeEntry("tap_hold", {
          key: "a",
          tap: "b",
          hold: "c",
          timeout_ms: 9007199254740992,
        }),
      /unsafe integer/,
    );
  });

  test("rejects non-string array elements", () => {
    assert.throws(
      () =>
        serializeEntry("chord", { keys: [1, 2], emit: "x", window_ms: 100 }),
      /non-string element/,
    );
  });
});

// ── Tests for addEntryToToml ───────────────────────────────────────────

describe("addEntryToToml", () => {
  test("adds entry to existing section", () => {
    const result = addEntryToToml(MINIMAL_CONFIG, "remap", {
      from: "c",
      to: "d",
    });
    const parsed = TOML.parse(result);
    assert.equal(parsed.remap.length, 2);
    assert.equal(parsed.remap[0].from, "a");
    assert.equal(parsed.remap[1].from, "c");
  });

  test("adds entry to non-existent section — appended at end with comment", () => {
    const result = addEntryToToml(MINIMAL_CONFIG, "chord", {
      keys: ["a", "b"],
      emit: "c",
      window_ms: 100,
    });
    const parsed = TOML.parse(result);
    assert.ok(parsed.remap, "original remap preserved");
    assert.ok(parsed.chord, "new chord section added");
  });

  test("preserves all original comments when adding to SHIPPED_CONFIG", () => {
    const result = addEntryToToml(SHIPPED_CONFIG, "remap", {
      from: "x",
      to: "y",
    });
    const originalComments = SHIPPED_CONFIG.split("\n").filter((l) =>
      l.trim().startsWith("#"),
    );
    for (const comment of originalComments) {
      assert.ok(result.includes(comment), `Comment preserved: ${comment}`);
    }
  });

  test("round-trip: parse SHIPPED_CONFIG, add entry, parse result — both present", () => {
    const result = addEntryToToml(SHIPPED_CONFIG, "remap", {
      from: "x",
      to: "y",
    });
    const reparsed = TOML.parse(result);
    assert.equal(reparsed.modifier_remap[0].from, "caps_lock");
    assert.equal(reparsed.tap_hold[0].key, "right_ctrl");
    assert.equal(reparsed.conditional_remap.length, 4);
    assert.equal(reparsed.remap[0].from, "x");
  });
});

// ── Tests for deleteEntryFromToml ──────────────────────────────────────

describe("deleteEntryFromToml", () => {
  test("deletes first entry from multi-entry section", () => {
    const result = deleteEntryFromToml(MULTI_ENTRY_CONFIG, "remap", 0);
    const parsed = TOML.parse(result);
    assert.equal(parsed.remap.length, 2);
    assert.equal(parsed.remap[0].from, "c");
  });

  test("deletes middle entry", () => {
    const result = deleteEntryFromToml(MULTI_ENTRY_CONFIG, "remap", 1);
    const parsed = TOML.parse(result);
    assert.equal(parsed.remap.length, 2);
    assert.equal(parsed.remap[0].from, "a");
    assert.equal(parsed.remap[1].from, "e");
  });

  test("deletes last entry", () => {
    const result = deleteEntryFromToml(MULTI_ENTRY_CONFIG, "remap", 2);
    const parsed = TOML.parse(result);
    assert.equal(parsed.remap.length, 2);
    assert.equal(parsed.remap[0].from, "a");
    assert.equal(parsed.remap[1].from, "c");
  });

  test("deleting from SHIPPED_CONFIG preserves other sections and comments", () => {
    const result = deleteEntryFromToml(SHIPPED_CONFIG, "conditional_remap", 1);
    const parsed = TOML.parse(result);
    assert.equal(parsed.conditional_remap.length, 3);
    assert.equal(parsed.modifier_remap.length, 1);
    assert.equal(parsed.tap_hold.length, 1);
    assert.ok(result.includes("# switcheroo configuration"));
  });

  test("index out of range throws", () => {
    assert.throws(
      () => deleteEntryFromToml(MULTI_ENTRY_CONFIG, "remap", 5),
      /Entry not found/,
    );
  });
});

// ── Tests for updateEntryInToml ────────────────────────────────────────

describe("updateEntryInToml", () => {
  test("updates entry in clean block", () => {
    const result = updateEntryInToml(MINIMAL_CONFIG, "remap", 0, {
      from: "x",
      to: "y",
    });
    const parsed = TOML.parse(result);
    assert.equal(parsed.remap[0].from, "x");
    assert.equal(parsed.remap[0].to, "y");
  });

  test("updates entry in multi-entry config — only target changes", () => {
    const result = updateEntryInToml(MULTI_ENTRY_CONFIG, "remap", 1, {
      from: "z",
      to: "w",
    });
    const parsed = TOML.parse(result);
    assert.equal(parsed.remap.length, 3);
    assert.equal(parsed.remap[0].from, "a");
    assert.equal(parsed.remap[1].from, "z");
    assert.equal(parsed.remap[2].from, "e");
  });

  test("index out of range throws", () => {
    assert.throws(
      () =>
        updateEntryInToml(MINIMAL_CONFIG, "remap", 5, { from: "x", to: "y" }),
      /Entry not found/,
    );
  });

  test("REFUSES update if block has unknown fields not in new entry — no silent loss", () => {
    // A block with an extra field that the new entry doesn't include.
    // This is valid TOML but the update MUST refuse.
    // Since our scanner only accepts bare [A-Za-z0-9_]+ keys, unknown_field
    // would be scanned as an assignment — so the refusal triggers.
    const configWithUnknownField = `[[remap]]
from = "a"
to = "b"
unknown_field = "precious_data"
`;
    assert.throws(
      () =>
        updateEntryInToml(configWithUnknownField, "remap", 0, {
          from: "x",
          to: "y",
        }),
      /fields that would be lost/,
    );
  });

  test("REFUSES update even if new entry includes the unknown field (schema violation)", () => {
    // Even including unknown_field in the new entry, the schema validator
    // rejects it because unknown_field is not valid for [[remap]].
    // This is correct: the user must use Edit Config for non-schema fields.
    const configWithUnknownField = `[[remap]]
from = "a"
to = "b"
unknown_field = "precious_data"
`;
    assert.throws(
      () =>
        updateEntryInToml(configWithUnknownField, "remap", 0, {
          from: "x",
          to: "y",
          unknown_field: "precious_data",
        }),
      /not valid for \[\[remap\]\]/,
    );
  });
});

// ── Tests for hasUnknownTopLevelKeys ───────────────────────────────────

describe("hasUnknownTopLevelKeys", () => {
  test("SHIPPED_CONFIG has no unknown keys", () => {
    const parsed = TOML.parse(SHIPPED_CONFIG);
    assert.equal(hasUnknownTopLevelKeys(parsed), false);
  });

  test("unknown key detected", () => {
    assert.equal(hasUnknownTopLevelKeys({ remap: [], foo: "bar" }), true);
  });

  test("empty object has no unknown keys", () => {
    assert.equal(hasUnknownTopLevelKeys({}), false);
  });
});

// ── Reviewer adversarial repros: non-canonical syntax rejected ────────

describe("reviewer adversarial: non-canonical syntax rejected", () => {
  test("rejects header with trailing comment: [[remap]] # comment", () => {
    const config = `[[remap]] # comment
from = "a"
to = "b"
`;
    assert.throws(
      () => addEntryToToml(config, "remap", { from: "x", to: "y" }),
      /not supported by the canonical editor|Edit Config/i,
    );
  });

  test('rejects quoted header: [["remap"]]', () => {
    const config = `[["remap"]]
from = "a"
to = "b"
`;
    assert.throws(
      () => addEntryToToml(config, "remap", { from: "x", to: "y" }),
      /not supported by the canonical editor|Edit Config/i,
    );
  });

  test("rejects dotted header: [[a.b]]", () => {
    const config = `[[remap]]
from = "a"
to = "b"

[[a.b]]
x = 1
`;
    assert.throws(
      () => addEntryToToml(config, "remap", { from: "x", to: "y" }),
      /not supported by the canonical editor|Edit Config/i,
    );
  });

  test("rejects header with spaces: [[ remap ]]", () => {
    const config = `[[ remap ]]
from = "a"
to = "b"
`;
    assert.throws(
      () => addEntryToToml(config, "remap", { from: "x", to: "y" }),
      /not supported by the canonical editor|Edit Config/i,
    );
  });

  test("rejects nested table header: [remap.metadata]", () => {
    const config = `[[remap]]
from = "a"
to = "b"

[remap.metadata]
note = "precious"
`;
    assert.throws(
      () => addEntryToToml(config, "remap", { from: "x", to: "y" }),
      /not supported by the canonical editor|Edit Config/i,
    );
  });

  test('rejects quoted key in assignment: "my.custom" = "val"', () => {
    const config = `[[remap]]
from = "a"
to = "b"
"my.custom" = "precious"
`;
    assert.throws(
      () => updateEntryInToml(config, "remap", 0, { from: "x", to: "y" }),
      /not supported by the canonical editor|Edit Config/i,
    );
  });

  test('rejects dotted key: extra.field = "val"', () => {
    const config = `[[remap]]
from = "a"
to = "b"
extra.field = "val"
`;
    assert.throws(
      () => updateEntryInToml(config, "remap", 0, { from: "x", to: "y" }),
      /not supported by the canonical editor|Edit Config/i,
    );
  });

  test('rejects dashed key: my-key = "val"', () => {
    const config = `[[remap]]
from = "a"
to = "b"
my-key = "val"
`;
    assert.throws(
      () => updateEntryInToml(config, "remap", 0, { from: "x", to: "y" }),
      /not supported by the canonical editor|Edit Config/i,
    );
  });

  test('rejects multiline basic string in block: """multi"""', () => {
    const config = `[[remap]]
from = "a"
to = """multi
line"""
`;
    assert.throws(
      () => addEntryToToml(config, "remap", { from: "x", to: "y" }),
      /not supported by the canonical editor|Edit Config/i,
    );
  });

  test("rejects multiline literal string: '''multi'''", () => {
    const config = `[[remap]]
from = "a"
to = '''left
ctrl'''
`;
    assert.throws(
      () => addEntryToToml(config, "remap", { from: "x", to: "y" }),
      /not supported by the canonical editor|Edit Config/i,
    );
  });

  test("rejects array spanning multiple lines", () => {
    const config = `[[chord]]
keys = ["a",
"b"]
emit = "c"
window_ms = 100
`;
    assert.throws(
      () => addEntryToToml(config, "remap", { from: "x", to: "y" }),
      /not supported by the canonical editor|Edit Config/i,
    );
  });

  test('rejects inline comment after assignment: from = "a" # comment', () => {
    const config = `[[remap]]
from = "a" # source
to = "b"
`;
    assert.throws(
      () => updateEntryInToml(config, "remap", 0, { from: "x", to: "y" }),
      /not supported by the canonical editor|Edit Config/i,
    );
  });

  test("rejects full-line comment inside block (between header and assignments)", () => {
    const config = `[[remap]]
# comment inside block
from = "a"
to = "b"
`;
    assert.throws(
      () => updateEntryInToml(config, "remap", 0, { from: "x", to: "y" }),
      /not supported by the canonical editor|Edit Config/i,
    );
  });

  test("rejects assignment outside any section", () => {
    const config = `from = "a"

[[remap]]
to = "b"
`;
    assert.throws(
      () => addEntryToToml(config, "remap", { from: "x", to: "y" }),
      /outside any|Edit Config/i,
    );
  });
});

// ── Reviewer adversarial: stale revision / duplicate entries ───────────

describe("reviewer adversarial: stale revision and duplicates", () => {
  test("semantic delta verifies correct entry changed on update", () => {
    const result = updateEntryInToml(MULTI_ENTRY_CONFIG, "remap", 1, {
      from: "z",
      to: "w",
    });
    const parsed = TOML.parse(result);
    // Entry 0 and 2 must be unchanged; only entry 1 changed
    assert.equal(parsed.remap[0].from, "a");
    assert.equal(parsed.remap[1].from, "z");
    assert.equal(parsed.remap[2].from, "e");
  });

  test("semantic delta verifies correct entry deleted", () => {
    const result = deleteEntryFromToml(MULTI_ENTRY_CONFIG, "remap", 1);
    const parsed = TOML.parse(result);
    assert.equal(parsed.remap.length, 2);
    assert.equal(parsed.remap[0].from, "a");
    assert.equal(parsed.remap[1].from, "e");
  });

  test("duplicate entries are handled correctly — delete removes only one", () => {
    const config = `[[remap]]
from = "a"
to = "b"

[[remap]]
from = "a"
to = "b"
`;
    const result = deleteEntryFromToml(config, "remap", 0);
    const parsed = TOML.parse(result);
    assert.equal(parsed.remap.length, 1);
    assert.equal(parsed.remap[0].from, "a");
  });
});

// ── CRLF tests ─────────────────────────────────────────────────────────

describe("CRLF handling", () => {
  test("addEntryToToml preserves CRLF on original lines", () => {
    const crlfConfig = MINIMAL_CONFIG.replace(/\n/g, "\r\n");
    const result = addEntryToToml(crlfConfig, "remap", { from: "c", to: "d" });
    assert.ok(result.includes('from = "a"\r'), "original CRLF preserved");
  });

  test("addEntryToToml uses CRLF on new lines for CRLF files", () => {
    const crlfConfig = MINIMAL_CONFIG.replace(/\n/g, "\r\n");
    const result = addEntryToToml(crlfConfig, "remap", { from: "c", to: "d" });
    assert.ok(result.includes('from = "c"\r'), "new entry uses CRLF");
  });
});
