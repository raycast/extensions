import { describe, it, expect, afterEach } from "vitest";
import { trimInput, convertToVertical } from "../convert";

describe("trimInput", () => {
  it("returns empty string for empty input", () => {
    expect(trimInput("")).toBe("");
  });

  it("returns empty string for whitespace only", () => {
    expect(trimInput("   ")).toBe("");
    expect(trimInput("\t\t")).toBe("");
  });

  it("returns empty string for empty lines only", () => {
    expect(trimInput("\n\n\n")).toBe("");
    expect(trimInput("  \n  \n  ")).toBe("");
  });

  it("trims leading empty lines", () => {
    expect(trimInput("\n\nA")).toBe("A");
    expect(trimInput("  \n  \nA")).toBe("A");
  });

  it("trims trailing empty lines", () => {
    expect(trimInput("A\n\n")).toBe("A");
    expect(trimInput("A\n  \n  ")).toBe("A");
  });

  it("trims both leading and trailing empty lines", () => {
    expect(trimInput("\nA\n")).toBe("A");
    expect(trimInput(" \nA\n ")).toBe("A");
  });

  it("preserves middle empty lines", () => {
    expect(trimInput("A\n\nB")).toBe("A\n\nB");
    expect(trimInput("A\n\n\nB")).toBe("A\n\n\nB");
  });

  it("handles complex case with mixed empty lines", () => {
    expect(trimInput(" \nA\n \n")).toBe("A");
    expect(trimInput("\nA\n\nB\n")).toBe("A\n\nB");
  });
});

describe("convertToVertical", () => {
  it("returns empty string for empty input", () => {
    expect(convertToVertical("", "")).toBe("");
  });

  describe("column order (right-to-left)", () => {
    it("places columns right to left", () => {
      const result = convertToVertical("AB\nCD", "");
      expect(result).toBe("C A \nD B ");
    });

    it("handles three columns", () => {
      const result = convertToVertical("A\nB\nC", "");
      expect(result).toBe("C B A ");
    });
  });

  describe("half-width character padding", () => {
    it("pads half-width ASCII characters with space", () => {
      const result = convertToVertical("A", "");
      expect(result).toBe("A ");
    });

    it("pads all half-width characters (0x20-0x7E)", () => {
      const result = convertToVertical("!", "");
      expect(result).toBe("! ");

      const result2 = convertToVertical("~", "");
      expect(result2).toBe("~ ");
    });

    it("does not pad full-width characters", () => {
      const result = convertToVertical("あ", "");
      expect(result).toBe("あ");
    });

    it("handles mixed half and full width", () => {
      const result = convertToVertical("Aあ", "");
      expect(result).toBe("A \nあ");
    });
  });

  describe("missing cell padding", () => {
    it("fills missing cells with two spaces", () => {
      const result = convertToVertical("AB\nC", "");
      expect(result).toBe("C A \n  B ");
    });

    it("fills missing cells in full-width context", () => {
      const result = convertToVertical("あい\nう", "");
      expect(result).toBe("うあ\n  い");
    });
  });

  describe("separator between columns", () => {
    it("adds no separator when empty", () => {
      const result = convertToVertical("A\nB", "");
      expect(result).toBe("B A ");
    });

    it("adds space separator between columns", () => {
      const result = convertToVertical("A\nB", " ");
      expect(result).toBe("B  A ");
    });

    it("adds tab separator between columns", () => {
      const result = convertToVertical("A\nB", "\t");
      expect(result).toBe("B \tA ");
    });

    it("does not add separator after last column", () => {
      const result = convertToVertical("A\nB\nC", " ");
      const lines = result.split("\n");
      expect(lines[0]).toBe("C  B  A ");
      expect(lines[0].endsWith(" A ")).toBe(true);
    });
  });

  describe("Unicode safety", () => {
    it("does not split ZWJ emoji", () => {
      const familyEmoji = "👨‍👩‍👧‍👦";
      const result = convertToVertical(familyEmoji, "");
      expect(result).toBe(familyEmoji);
    });

    it("does not split flag emoji", () => {
      const flagEmoji = "🇯🇵";
      const result = convertToVertical(flagEmoji, "");
      expect(result).toBe(flagEmoji);
    });

    it("does not split combining characters (dakuten)", () => {
      const result = convertToVertical("が", "");
      expect(result).toBe("が");
    });

    it("handles skin tone modifiers correctly", () => {
      const emoji = "👋🏽";
      const result = convertToVertical(emoji, "");
      expect(result).toBe(emoji);
    });
  });

  describe("preserves line-end spaces", () => {
    it("does not trim line-end spaces in output", () => {
      const result = convertToVertical("A", "");
      expect(result).toBe("A ");
      expect(result.endsWith(" ")).toBe(true);
    });
  });

  describe("Intl.Segmenter fallback", () => {
    const originalSegmenter = Intl.Segmenter;

    afterEach(() => {
      Object.defineProperty(Intl, "Segmenter", {
        value: originalSegmenter,
        writable: true,
        configurable: true,
      });
    });

    it("falls back to Array.from when Intl.Segmenter is unavailable", () => {
      Object.defineProperty(Intl, "Segmenter", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const result = convertToVertical("ABC", "");
      expect(result).toBe("A \nB \nC ");
    });
  });
});
