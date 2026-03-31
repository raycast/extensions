import { displayName, isKeyboardSource, parseSources, searchTerms } from "../src/sources";
import type { InputSource } from "../src/sources";

// Fixtures
const belarusian: InputSource = {
  id: "com.apple.keylayout.Byelorussian",
  name: "Byelorussian",
  kind: "public.keyboard-layout",
};

const pinyin: InputSource = {
  id: "com.apple.inputmethod.SCIM.ITABC",
  name: "Pinyin - Simplified",
  kind: "public.keyboard-input-method-mode-enabled",
};

const unknown: InputSource = {
  id: "com.example.keylayout.Unknown",
  name: "Klingon",
  kind: "public.keyboard-layout",
};

const palette: InputSource = {
  id: "com.apple.CharacterPaletteIM",
  name: "Character Palette",
  kind: "CharacterPalette",
};

describe("parseSources", () => {
  it("parses a valid JSON array into InputSource objects", () => {
    const json = JSON.stringify([
      { id: "com.apple.keylayout.Russian", name: "Russian", kind: "public.keyboard-layout" },
    ]);
    const result = parseSources(json);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "com.apple.keylayout.Russian",
      name: "Russian",
      kind: "public.keyboard-layout",
    });
  });

  it("returns an empty array for an empty JSON array", () => {
    expect(parseSources("[]")).toEqual([]);
  });

  it("throws SyntaxError for malformed JSON", () => {
    expect(() => parseSources("{not json}")).toThrow(SyntaxError);
  });

  it("throws TypeError if the top-level value is not an array", () => {
    expect(() => parseSources('{"id":"x"}')).toThrow(TypeError);
  });

  it("throws TypeError if an item has a missing field", () => {
    const json = JSON.stringify([{ id: "x", name: "X" }]); // missing kind
    expect(() => parseSources(json)).toThrow(TypeError);
  });
});

describe("isKeyboardSource", () => {
  it("returns true for a keyboard layout kind", () => {
    expect(isKeyboardSource(belarusian)).toBe(true);
  });

  it("returns true for an input method kind", () => {
    expect(isKeyboardSource(pinyin)).toBe(true);
  });

  it("returns false for CharacterPalette kind", () => {
    expect(isKeyboardSource(palette)).toBe(false);
  });

  it("returns false for PressAndHold kind", () => {
    const pressAndHold: InputSource = {
      id: "com.apple.PressAndHold",
      name: "Press and Hold",
      kind: "PressAndHold",
    };
    expect(isKeyboardSource(pressAndHold)).toBe(false);
  });
});

describe("displayName", () => {
  it("returns the override name for Byelorussian → Belarusian", () => {
    expect(displayName(belarusian)).toBe("Belarusian");
  });

  it("returns the override name for SCIM ITABC → Pinyin — Simplified Chinese", () => {
    expect(displayName(pinyin)).toBe("Pinyin — Simplified Chinese");
  });

  it("falls back to the raw name field for an unknown source", () => {
    expect(displayName(unknown)).toBe("Klingon");
  });
});

describe("searchTerms", () => {
  it("includes the display name for Belarusian", () => {
    const terms = searchTerms(belarusian);
    expect(terms).toContain("belarusian");
  });

  it("includes the archaic raw name for Belarusian", () => {
    const terms = searchTerms(belarusian);
    expect(terms).toContain("byelorussian");
  });

  it("includes short aliases for Belarusian (by, bel)", () => {
    const terms = searchTerms(belarusian);
    expect(terms).toContain("by");
    expect(terms).toContain("bel");
  });

  it("includes pinyin aliases for SCIM ITABC", () => {
    const terms = searchTerms(pinyin);
    expect(terms).toContain("pinyin");
    expect(terms).toContain("zh");
    expect(terms).toContain("chinese");
    expect(terms).toContain("cn");
  });

  it("falls back to just the lowercased name for an unknown source", () => {
    const terms = searchTerms(unknown);
    expect(terms).toContain("klingon");
    expect(terms).toHaveLength(1);
  });

  it("returns no duplicate terms", () => {
    const terms = searchTerms(belarusian);
    expect(terms.length).toBe(new Set(terms).size);
  });
});
