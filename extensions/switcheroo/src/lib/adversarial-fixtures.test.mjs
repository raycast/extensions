// ─────────────────────────────────────────────────────────────────────
// adversarial-fixtures.test.mjs — reviewer adversarial repros + I/O tests.
//
// Exercises the EXPORTED production helpers in config-surgery.mjs,
// config-pure.mjs, and config.ts. Uses node:test.
// Run: node --test src/lib/adversarial-fixtures.test.mjs
// ─────────────────────────────────────────────────────────────────────
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import * as TOML from "smol-toml";
import {
  scanCanonical,
  addEntryToToml,
  deleteEntryFromToml,
  updateEntryInToml,
  serializeEntry,
  assertKnownKeysOnly,
  computeRevision,
  entryFingerprint,
} from "./config-surgery.mjs";
import { parsePositiveInt, validateChordKeys } from "./config-pure.mjs";

// ── Fixtures ───────────────────────────────────────────────────────────

const COMMENTED_MIXED_REAL = `# [[remap]]
# from = "old"
# to = "old2"

[[remap]]
from = "real"
to = "real2"

# Another comment

[[remap]]
from = "second"
to = "second2"
`;

const CRLF_MULTI_CONFIG = `[[remap]]\r
from = "a"\r
to = "b"\r
\r
[[remap]]\r
from = "c"\r
to = "d"\r
`;

const SHIPPED_CONFIG = `# switcheroo configuration

[[modifier_remap]]
from = "caps_lock"
to = "left_ctrl"

[[tap_hold]]
key = "right_ctrl"
tap = "escape"
hold = "left_ctrl"
timeout_ms = 200

[[chord]]
keys = ["left_shift", "right_shift"]
emit = "caps_lock"
window_ms = 200
`;

// ── Tests: commented blocks mixed with real ────────────────────────────

describe("adversarial: commented blocks mixed with real", () => {
  test("scanCanonical finds only real blocks, ignores commented", () => {
    const { blocks } = scanCanonical(COMMENTED_MIXED_REAL);
    const remapBlocks = blocks.filter((b) => b.section === "remap");
    assert.equal(remapBlocks.length, 2);
  });

  test("delete first real block preserves commented block", () => {
    const result = deleteEntryFromToml(COMMENTED_MIXED_REAL, "remap", 0);
    assert.ok(result.includes("# [[remap]]"), "commented block preserved");
    assert.ok(result.includes('# from = "old"'), "commented content preserved");
    const parsed = TOML.parse(result);
    assert.equal(parsed.remap.length, 1);
    assert.equal(parsed.remap[0].from, "second");
  });

  test("add entry preserves commented blocks", () => {
    const result = addEntryToToml(COMMENTED_MIXED_REAL, "remap", {
      from: "added",
      to: "added2",
    });
    assert.ok(result.includes("# [[remap]]"), "commented block preserved");
    const parsed = TOML.parse(result);
    assert.equal(parsed.remap.length, 3);
  });
});

// ── Tests: no unrelated byte loss ──────────────────────────────────────

describe("adversarial: no unrelated byte loss", () => {
  test("delete middle entry — all other lines preserved exactly (prefix)", () => {
    const original = COMMENTED_MIXED_REAL;
    const result = deleteEntryFromToml(original, "remap", 0);
    const origLines = original.split("\n");
    const resultLines = result.split("\n");
    // Commented block (lines 0-2) + blank line should be unchanged
    for (let i = 0; i < 4; i++) {
      assert.equal(resultLines[i], origLines[i], `line ${i} unchanged`);
    }
  });

  test("update entry — lines before target block unchanged", () => {
    const original = COMMENTED_MIXED_REAL;
    const { blocks } = scanCanonical(original);
    const remapBlocks = blocks.filter((b) => b.section === "remap");
    const targetIdx = 1;
    const result = updateEntryInToml(original, "remap", targetIdx, {
      from: "updated",
      to: "updated2",
    });
    const origLines = original.split("\n");
    const resultLines = result.split("\n");
    for (let i = 0; i < remapBlocks[targetIdx].startLine; i++) {
      assert.equal(resultLines[i], origLines[i], `line ${i} unchanged`);
    }
  });
});

// ── Tests: parsePositiveInt strict rejection ───────────────────────────

describe("adversarial: parsePositiveInt strict rejection", () => {
  test("rejects leading + sign", () => {
    assert.throws(() => parsePositiveInt("+5", "T"), /positive integer/);
  });

  test("rejects exponent notation (1e3)", () => {
    assert.throws(() => parsePositiveInt("1e3", "T"), /positive integer/);
  });

  test("rejects hex notation (0x10)", () => {
    assert.throws(() => parsePositiveInt("0x10", "T"), /positive integer/);
  });

  test("rejects decimal notation (1.0)", () => {
    assert.throws(() => parsePositiveInt("1.0", "T"), /positive integer/);
  });

  test("rejects trailing newline (200\\n)", () => {
    assert.throws(() => parsePositiveInt("200\n", "T"), /positive integer/);
  });

  test("rejects arrays", () => {
    assert.throws(() => parsePositiveInt([5], "T"), /positive integer/);
  });

  test("rejects number type (only strings)", () => {
    assert.throws(() => parsePositiveInt(200, "T"), /positive integer/);
  });

  test("rejects null/undefined/object", () => {
    assert.throws(() => parsePositiveInt(null, "T"), /positive integer/);
    assert.throws(() => parsePositiveInt(undefined, "T"), /positive integer/);
    assert.throws(
      () => parsePositiveInt({ value: 5 }, "T"),
      /positive integer/,
    );
  });

  test("accepts MAX_SAFE_INTEGER", () => {
    assert.equal(parsePositiveInt("9007199254740991", "T"), 9007199254740991);
  });

  test("rejects values exceeding MAX_SAFE_INTEGER", () => {
    assert.throws(
      () => parsePositiveInt("9007199254740992", "T"),
      /exceeds maximum safe integer/,
    );
  });
});

// ── Tests: validateChordKeys strict element check ─────────────────────

describe("adversarial: validateChordKeys strict elements", () => {
  test("accepts 100 keys", () => {
    const keys = Array.from({ length: 100 }, (_, i) => `key_${i}`);
    assert.deepEqual(validateChordKeys(keys), keys);
  });

  test("rejects non-string elements", () => {
    assert.throws(() => validateChordKeys([1, 2]), /non-empty string/);
  });

  test("rejects empty string elements", () => {
    assert.throws(() => validateChordKeys(["", ""]), /non-empty string/);
  });
});

// ── Tests: serializeEntry edge cases ───────────────────────────────────

describe("adversarial: serializeEntry edge cases", () => {
  test("escapes backslash", () => {
    const lines = serializeEntry("remap", { from: "a\\b", to: "c" });
    assert.equal(lines[0], 'from = "a\\\\b"');
  });

  test("serializes empty strings", () => {
    const lines = serializeEntry("remap", { from: "", to: "" });
    assert.deepEqual(lines, ['from = ""', 'to = ""']);
  });

  test("throws on null value", () => {
    assert.throws(
      () => serializeEntry("remap", { from: null, to: "b" }),
      /Cannot serialize/,
    );
  });

  test("throws on undefined value", () => {
    assert.throws(
      () => serializeEntry("remap", { from: undefined, to: "b" }),
      /Cannot serialize/,
    );
  });

  test("throws on object value", () => {
    assert.throws(
      () => serializeEntry("remap", { from: { nested: 1 }, to: "b" }),
      /Cannot serialize/,
    );
  });

  test("rejects tab in string (escaped to \\t)", () => {
    // Tab is allowed but must be escaped
    const lines = serializeEntry("remap", { from: "a\tb", to: "c" });
    assert.equal(lines[0], 'from = "a\\tb"');
  });

  test("rejects newline control character in string", () => {
    assert.throws(
      () => serializeEntry("remap", { from: "a\nb", to: "c" }),
      /control character/,
    );
  });
});

// ── Tests: entryFingerprint and computeRevision ────────────────────────

describe("adversarial: fingerprint and revision", () => {
  test("entryFingerprint is canonical (sorted keys)", () => {
    const fp1 = entryFingerprint({ from: "a", to: "b" });
    const fp2 = entryFingerprint({ to: "b", from: "a" });
    assert.equal(fp1, fp2);
  });

  test("entryFingerprint differs for different entries", () => {
    const fp1 = entryFingerprint({ from: "a", to: "b" });
    const fp2 = entryFingerprint({ from: "a", to: "c" });
    assert.notEqual(fp1, fp2);
  });

  test("computeRevision is deterministic", () => {
    const r1 = computeRevision("hello");
    const r2 = computeRevision("hello");
    assert.equal(r1, r2);
  });

  test("computeRevision differs for different content", () => {
    const r1 = computeRevision("hello");
    const r2 = computeRevision("world");
    assert.notEqual(r1, r2);
  });
});

// ── Tests: assertKnownKeysOnly ─────────────────────────────────────────

describe("adversarial: assertKnownKeysOnly", () => {
  test("passes for SHIPPED_CONFIG", () => {
    assert.doesNotThrow(() => assertKnownKeysOnly(SHIPPED_CONFIG));
  });

  test("rejects unknown top-level table [settings]", () => {
    const config = `[[remap]]
from = "a"
to = "b"

[settings]
foo = "bar"
`;
    assert.throws(() => assertKnownKeysOnly(config), /unrecognized settings/);
  });

  test("error mentions Edit Config", () => {
    const config = `[[remap]]
from = "a"
to = "b"

[settings]
foo = "bar"
`;
    try {
      assertKnownKeysOnly(config);
      assert.fail("should throw");
    } catch (e) {
      assert.match(String(e.message), /Edit Config/);
    }
  });
});

// ── Tests: CRLF consistency ─────────────────────────────────────────────

describe("adversarial: CRLF consistency", () => {
  test("delete from CRLF config preserves CRLF on remaining lines", () => {
    const result = deleteEntryFromToml(CRLF_MULTI_CONFIG, "remap", 0);
    assert.ok(result.includes('from = "c"\r'), "CRLF preserved on remaining");
    const parsed = TOML.parse(result);
    assert.equal(parsed.remap.length, 1);
  });

  test("update in CRLF config — updated block uses CRLF (consistent)", () => {
    const result = updateEntryInToml(CRLF_MULTI_CONFIG, "remap", 0, {
      from: "x",
      to: "y",
    });
    assert.ok(result.includes('from = "x"\r'), "updated block uses CRLF");
    assert.ok(result.includes('from = "c"\r'), "other block CRLF preserved");
  });

  test("add to CRLF config — new entry uses CRLF", () => {
    const result = addEntryToToml(CRLF_MULTI_CONFIG, "remap", {
      from: "e",
      to: "f",
    });
    assert.ok(result.includes('from = "a"\r'), "original CRLF preserved");
    assert.ok(result.includes('from = "e"\r'), "new entry uses CRLF");
  });
});
