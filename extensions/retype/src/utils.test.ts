import { describe, expect, it, vi } from "vitest";

// Mock @raycast/utils so the import in utils.ts doesn't break in Node
vi.mock("@raycast/utils", () => ({ runAppleScript: vi.fn() }));

import {
  detectSourceLayout,
  getTargetOrder,
  pickNextTarget,
  transformText,
} from "./utils";
import type { LayoutKeyMap } from "./utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a 192-char keyMap: positions 0-95 = base layer, 96-191 = alt layer. */
function makeLayout(
  id: string,
  baseChars: string,
  altChars = "",
): LayoutKeyMap {
  const base = baseChars.padEnd(96, "\u0000").slice(0, 96);
  const alt = altChars.padEnd(96, "\u0000").slice(0, 96);
  return { id, title: id, active: false, keyMap: base + alt };
}

// ---------------------------------------------------------------------------
// detectSourceLayout
// ---------------------------------------------------------------------------

describe("detectSourceLayout", () => {
  const EN = makeLayout("en", "qwertyuiop");

  // Simulates the real Belarusian/Russian overlap:
  //   - RU: Russian chars in base layer only
  //   - BE: Belarusian-unique chars in base; Russian chars in alt layer
  //
  // Flat scoring (no weights) would score BE higher than RU for Russian text,
  // because BE also has extra chars in alt that happen to match the text.
  //
  // Example: text = "АБ" + "extra chars only in BE alt"
  //   Flat:     RU=2 (base), BE=2(alt)+N(extra in alt) → BE wins (WRONG)
  //   Weighted: RU=2×4=8,    BE=(2+N)×1               → RU wins if N<6 (CORRECT)
  const RU = makeLayout("ru", "АБ"); // 'А','Б' in RU base only
  const BE = makeLayout(
    "be",
    "ЎІ", // Belarusian-unique chars in BE base
    "АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклм", // Russian chars in BE alt (many!)
  );

  it("flat scoring would pick BE, weighted scoring correctly picks RU (key regression test)", () => {
    // Text: 'А','Б' (both in RU base and BE alt) → flat: RU=2, BE=2 → tie/wrong order possible
    // Adding chars ONLY in BE alt makes flat even worse: flat BE > RU, weighted RU > BE.
    // Here: text = "АБ" → flat RU=2, BE=2 → tie; but "АБВГ" → flat RU=2, BE=4 → flat picks BE
    const russianText = "АБВГ"; // 'А','Б' in RU base; 'В','Г' only in BE alt
    // flat: RU=2, BE=4 → flat INCORRECTLY picks BE
    // weighted: RU=2×4=8, BE=4×1=4 → weighted CORRECTLY picks RU
    expect(
      detectSourceLayout({ text: russianText, layouts: [BE, RU] })?.id,
    ).toBe("ru");
  });

  it("detects Belarusian when text has Belarusian-unique base chars", () => {
    // 'Ў','І' are only in BE base
    expect(detectSourceLayout({ text: "ЎІ", layouts: [RU, BE] })?.id).toBe(
      "be",
    );
  });

  it("detects English for English text", () => {
    expect(
      detectSourceLayout({ text: "qwerty", layouts: [EN, RU, BE] })?.id,
    ).toBe("en");
  });

  it("returns null for empty layout list", () => {
    expect(detectSourceLayout({ text: "hello", layouts: [] })).toBeNull();
  });

  it("ignores null chars (\\u0000) in scoring", () => {
    const result = detectSourceLayout({ text: "\u0000\u0000", layouts: [EN] });
    expect(result).toBe(EN);
  });

  it("breaks tie in favor of activeId", () => {
    // Both share same base chars → same score, active wins
    const L1 = makeLayout("l1", "abc");
    const L2 = makeLayout("l2", "abc");
    expect(
      detectSourceLayout({ text: "ab", layouts: [L1, L2], activeId: "l2" })?.id,
    ).toBe("l2");
  });

  it("breaks tie using historyOrder when no activeId", () => {
    const L1 = makeLayout("l1", "abc");
    const L2 = makeLayout("l2", "abc");
    expect(
      detectSourceLayout({
        text: "ab",
        layouts: [L1, L2],
        historyOrder: ["l2", "l1"],
      })?.id,
    ).toBe("l2");
  });

  it("activeId wins over historyOrder on tie", () => {
    const L1 = makeLayout("l1", "abc");
    const L2 = makeLayout("l2", "abc");
    expect(
      detectSourceLayout({
        text: "ab",
        layouts: [L1, L2],
        activeId: "l1",
        historyOrder: ["l2"],
      })?.id,
    ).toBe("l1");
  });

  it("does not override a clear score winner with activeId", () => {
    expect(
      detectSourceLayout({ text: "АБВГ", layouts: [BE, RU], activeId: "be" })
        ?.id,
    ).toBe("ru");
  });
});

// ---------------------------------------------------------------------------
// transformText
// ---------------------------------------------------------------------------

describe("transformText", () => {
  const from192 = "abcd".padEnd(192, "\u0000");
  const to192 = "ABCD".padEnd(192, "\u0000");

  // Alt-layer: 'e' at position 96, 'f' at position 97
  const fromWithAlt = "ab".padEnd(96, "\u0000") + "ef".padEnd(96, "\u0000");
  const toWithAlt = "AB".padEnd(96, "\u0000") + "EF".padEnd(96, "\u0000");

  it("maps base-layer chars correctly", () => {
    expect(transformText("ab", from192, to192)).toBe("AB");
  });

  it("passes through chars not found in fromMap", () => {
    expect(transformText("xyz", from192, to192)).toBe("xyz");
  });

  it("maps alt-layer chars (e.g. Polish special chars) correctly", () => {
    // 'e' is only in alt layer of fromWithAlt → should map to 'E' in toWithAlt
    expect(transformText("e", fromWithAlt, toWithAlt)).toBe("E");
  });

  it("passes \\u0000 placeholder chars through unchanged", () => {
    expect(transformText("\u0000", from192, to192)).toBe("\u0000");
  });

  it("handles mixed base and alt chars in one string", () => {
    expect(transformText("ae", fromWithAlt, toWithAlt)).toBe("AE");
  });
});

// ---------------------------------------------------------------------------
// pickNextTarget
// ---------------------------------------------------------------------------

describe("pickNextTarget", () => {
  // Source layout: "abcd" in base
  const sourceMap = "abcd".padEnd(192, "\u0000");
  // Target that transforms: "abcd" → "ABCD"
  const DIFF = makeLayout("diff", "ABCD");
  // Target with same keymap as source → transform produces identical text
  const SAME = makeLayout("same", "abcd");
  // Another different target
  const DIFF2 = makeLayout("diff2", "1234");

  it("picks the first target that produces different text", () => {
    const result = pickNextTarget("ab", sourceMap, [DIFF, DIFF2], []);
    expect(result.target.id).toBe("diff");
    expect(result.transformed).toBe("AB");
  });

  it("skips targets that produce identical text", () => {
    const result = pickNextTarget("ab", sourceMap, [SAME, DIFF], []);
    expect(result.target.id).toBe("diff");
    expect(result.transformed).toBe("AB");
    expect(result.triedTargetIds).toContain("same");
    expect(result.triedTargetIds).toContain("diff");
  });

  it("skips multiple same-text targets", () => {
    const SAME2 = makeLayout("same2", "abcd");
    const result = pickNextTarget("ab", sourceMap, [SAME, SAME2, DIFF], []);
    expect(result.target.id).toBe("diff");
    expect(result.triedTargetIds).toEqual(["same", "same2", "diff"]);
  });

  it("wraps around when all targets have been tried", () => {
    const result = pickNextTarget(
      "ab",
      sourceMap,
      [DIFF, DIFF2],
      ["diff", "diff2"],
    );
    // All tried → reset and pick first different
    expect(result.target.id).toBe("diff");
    expect(result.transformed).toBe("AB");
    expect(result.triedTargetIds).toEqual(["diff"]);
  });

  it("falls back to last candidate if all produce same text", () => {
    const SAME2 = makeLayout("same2", "abcd");
    const result = pickNextTarget("ab", sourceMap, [SAME, SAME2], []);
    expect(result.target.id).toBe("same2");
    expect(result.transformed).toBe("ab");
    expect(result.triedTargetIds).toEqual(["same", "same2"]);
  });

  it("respects already-tried targets and skips same-text in remaining", () => {
    const result = pickNextTarget(
      "ab",
      sourceMap,
      [DIFF, SAME, DIFF2],
      ["diff"],
    );
    // DIFF already tried, SAME produces same text → pick DIFF2
    expect(result.target.id).toBe("diff2");
    expect(result.transformed).toBe("12");
  });
});

// ---------------------------------------------------------------------------
// getTargetOrder
// ---------------------------------------------------------------------------

describe("getTargetOrder", () => {
  const A = makeLayout("a", "a");
  const B = makeLayout("b", "b");
  const C = makeLayout("c", "c");

  it("excludes the source layout from candidates", () => {
    const result = getTargetOrder({
      layouts: [A, B, C],
      sourceId: "a",
      historyOrder: [],
    });
    expect(result.map((l) => l.id)).not.toContain("a");
  });

  it("puts history-preferred layouts first", () => {
    const result = getTargetOrder({
      layouts: [A, B, C],
      sourceId: "a",
      historyOrder: ["c", "b"],
    });
    expect(result.map((l) => l.id)).toEqual(["c", "b"]);
  });

  it("appends non-history layouts after history ones", () => {
    const result = getTargetOrder({
      layouts: [A, B, C],
      sourceId: "a",
      historyOrder: ["b"],
    });
    expect(result.map((l) => l.id)).toEqual(["b", "c"]);
  });

  it("returns all non-source layouts in system order when history is empty", () => {
    const result = getTargetOrder({
      layouts: [A, B, C],
      sourceId: "a",
      historyOrder: [],
    });
    expect(result.map((l) => l.id)).toEqual(["b", "c"]);
  });

  it("puts active layout first, before history", () => {
    const result = getTargetOrder({
      layouts: [A, B, C],
      sourceId: "a",
      historyOrder: ["b"],
      activeId: "c",
    });
    expect(result.map((l) => l.id)).toEqual(["c", "b"]);
  });

  it("deduplicates active layout if also in history", () => {
    const result = getTargetOrder({
      layouts: [A, B, C],
      sourceId: "a",
      historyOrder: ["c", "b"],
      activeId: "c",
    });
    expect(result.map((l) => l.id)).toEqual(["c", "b"]);
  });

  it("ignores activeId when it equals sourceId", () => {
    const result = getTargetOrder({
      layouts: [A, B, C],
      sourceId: "a",
      historyOrder: [],
      activeId: "a",
    });
    expect(result.map((l) => l.id)).toEqual(["b", "c"]);
  });
});
