import { describe, it, expect } from "vitest";
import {
  transliterate,
  removeAccents,
  hasNonAscii,
  hasAccents,
  sanitizeFilename,
  getTransliterationPreview,
} from "../lib/template/transliterate";

describe("transliterate", () => {
  describe("accented characters", () => {
    it("converts caf\u00e9 to cafe", () => {
      expect(transliterate("caf\u00e9")).toBe("cafe");
    });

    it("converts na\u00efve to naive", () => {
      expect(transliterate("na\u00efve")).toBe("naive");
    });

    it("converts r\u00e9sum\u00e9 to resume", () => {
      expect(transliterate("r\u00e9sum\u00e9")).toBe("resume");
    });

    it("converts \u00c5ngstr\u00f6m to Angstrom", () => {
      expect(transliterate("\u00c5ngstr\u00f6m")).toBe("Angstrom");
    });

    it("converts M\u00fcller to Muller", () => {
      expect(transliterate("M\u00fcller")).toBe("Muller");
    });

    it("converts Se\u00f1or to Senor", () => {
      expect(transliterate("Se\u00f1or")).toBe("Senor");
    });

    it("converts \u00d1o\u00f1o to Nono", () => {
      expect(transliterate("\u00d1o\u00f1o")).toBe("Nono");
    });
  });

  describe("German characters", () => {
    it("converts \u00df to ss", () => {
      expect(transliterate("Stra\u00dfe")).toBe("Strasse");
    });

    it("converts \u00fc to u", () => {
      expect(transliterate("\u00fcber")).toBe("uber");
    });

    it("converts \u00f6 to o", () => {
      expect(transliterate("sch\u00f6n")).toBe("schon");
    });
  });

  describe("French characters", () => {
    it("converts \u00e7 to c", () => {
      expect(transliterate("gar\u00e7on")).toBe("garcon");
    });

    it("converts \u0153 to oe", () => {
      expect(transliterate("c\u0153ur")).toBe("coeur");
    });

    it("converts \u00e6 to ae", () => {
      expect(transliterate("C\u00e6sar")).toBe("Caesar");
    });
  });

  describe("Nordic characters", () => {
    it("converts \u00f8 to o", () => {
      expect(transliterate("S\u00f8ren")).toBe("Soren");
    });

    it("converts \u00e5 to a", () => {
      expect(transliterate("\u00c5lborg")).toBe("Alborg");
    });
  });

  describe("Polish characters", () => {
    it("converts \u0142 to l", () => {
      expect(transliterate("\u0141\u00f3d\u017a")).toBe("Lodz");
    });

    it("converts \u0105 to a", () => {
      expect(transliterate("ksi\u0105\u017cka")).toBe("ksiazka");
    });
  });

  describe("Czech characters", () => {
    it("converts \u0161 to s", () => {
      expect(transliterate("\u0160koda")).toBe("Skoda");
    });

    it("converts \u010d to c", () => {
      expect(transliterate("\u010cech")).toBe("Cech");
    });

    it("converts \u0159 to r", () => {
      expect(transliterate("Dvo\u0159\u00e1k")).toBe("Dvorak");
    });
  });

  describe("special symbols", () => {
    it("converts smart quotes to regular quotes", () => {
      expect(transliterate("\u201cHello\u201d")).toBe('"Hello"');
      expect(transliterate("\u2018Hello\u2019")).toBe("'Hello'");
    });

    it("converts em/en dashes to regular dashes", () => {
      expect(transliterate("word\u2014word")).toBe("word--word"); // em-dash (double dash)
      expect(transliterate("word\u2013word")).toBe("word-word"); // en-dash
    });

    it("converts ellipsis to three dots", () => {
      expect(transliterate("wait\u2026")).toBe("wait...");
    });

    it("converts copyright/trademark symbols", () => {
      expect(transliterate("Apple\u00a9")).toBe("Apple(c)");
      expect(transliterate("Brand\u2122")).toBe("Brand(tm)");
      expect(transliterate("Product\u00ae")).toBe("Product(r)");
    });
  });

  describe("ASCII passthrough", () => {
    it("preserves plain ASCII", () => {
      expect(transliterate("Hello World 123")).toBe("Hello World 123");
    });

    it("preserves punctuation", () => {
      expect(transliterate("file_name-v2.txt")).toBe("file_name-v2.txt");
    });
  });

  describe("CJK transliteration", () => {
    it("transliterates CJK characters to romanized form", () => {
      expect(transliterate("\u65e5\u672c\u8a9e")).toBe("Ri Ben Yu");
    });

    it("transliterates CJK mixed with ASCII", () => {
      expect(transliterate("\u65e5\u672c\u8a9etest")).toBe("Ri Ben Yu test");
    });

    it("transliterates Chinese characters", () => {
      expect(transliterate("Hello \u4e16\u754c")).toBe("Hello Shi Jie");
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      expect(transliterate("")).toBe("");
    });

    it("handles single character", () => {
      expect(transliterate("\u00e9")).toBe("e");
    });

    it("handles multiple accents on same character", () => {
      // Combined character with multiple diacritics
      expect(transliterate("\u1ec7")).toBe("e");
    });
  });
});

describe("removeAccents", () => {
  it("removes accents from caf\u00e9", () => {
    expect(removeAccents("caf\u00e9")).toBe("cafe");
  });

  it("removes accents from na\u00efve", () => {
    expect(removeAccents("na\u00efve")).toBe("naive");
  });

  it("preserves non-accented characters", () => {
    expect(removeAccents("hello")).toBe("hello");
  });

  it("preserves case", () => {
    expect(removeAccents("CAF\u00c9")).toBe("CAFE");
  });

  it("handles empty string", () => {
    expect(removeAccents("")).toBe("");
  });
});

describe("hasNonAscii", () => {
  it("returns true for strings with non-ASCII characters", () => {
    expect(hasNonAscii("caf\u00e9")).toBe(true);
    expect(hasNonAscii("\u65e5\u672c\u8a9e")).toBe(true);
    expect(hasNonAscii("na\u00efve")).toBe(true);
  });

  it("returns false for pure ASCII strings", () => {
    expect(hasNonAscii("hello")).toBe(false);
    expect(hasNonAscii("file_name.txt")).toBe(false);
    expect(hasNonAscii("")).toBe(false);
  });
});

describe("hasAccents", () => {
  it("returns true for strings with accented characters", () => {
    expect(hasAccents("caf\u00e9")).toBe(true);
    expect(hasAccents("na\u00efve")).toBe(true);
    expect(hasAccents("\u00fcber")).toBe(true);
  });

  it("returns false for strings without accents", () => {
    expect(hasAccents("hello")).toBe(false);
    expect(hasAccents("123")).toBe(false);
  });

  it("handles non-Latin characters", () => {
    // Japanese has no combining diacritics
    expect(hasAccents("\u65e5\u672c\u8a9e")).toBe(false);
  });
});

describe("sanitizeFilename", () => {
  describe("invalid character removal", () => {
    it("removes forward slashes", () => {
      expect(sanitizeFilename("path/to/file")).toBe("pathtofile");
    });

    it("removes backslashes", () => {
      expect(sanitizeFilename("path\\to\\file")).toBe("pathtofile");
    });

    it("removes colons", () => {
      expect(sanitizeFilename("file:name")).toBe("filename");
    });

    it("removes asterisks", () => {
      expect(sanitizeFilename("file*name")).toBe("filename");
    });

    it("removes question marks", () => {
      expect(sanitizeFilename("file?name")).toBe("filename");
    });

    it("removes quotes", () => {
      expect(sanitizeFilename('file"name')).toBe("filename");
    });

    it("removes angle brackets", () => {
      expect(sanitizeFilename("file<name>")).toBe("filename");
    });

    it("removes pipes", () => {
      expect(sanitizeFilename("file|name")).toBe("filename");
    });
  });

  describe("transliteration", () => {
    it("transliterates by default", () => {
      expect(sanitizeFilename("caf\u00e9")).toBe("cafe");
    });

    it("still removes accents when transliteration disabled but removeAccents defaults true", () => {
      expect(sanitizeFilename("caf\u00e9", { transliterate: false })).toBe("cafe");
    });

    it("can skip both transliteration and accent removal", () => {
      expect(sanitizeFilename("caf\u00e9", { transliterate: false, removeAccents: false })).toBe("caf\u00e9");
    });
  });

  describe("space handling", () => {
    it("preserves spaces by default", () => {
      expect(sanitizeFilename("hello world")).toBe("hello world");
    });

    it("replaces spaces with underscore when requested", () => {
      expect(sanitizeFilename("hello world", { replaceSpaces: true })).toBe("hello_world");
    });

    it("uses custom space replacement", () => {
      expect(
        sanitizeFilename("hello world", {
          replaceSpaces: true,
          spaceReplacement: "-",
        }),
      ).toBe("hello-world");
    });
  });

  describe("edge cases", () => {
    it("returns 'unnamed' for empty result", () => {
      expect(sanitizeFilename("///")).toBe("unnamed");
    });

    it("trims leading/trailing spaces", () => {
      expect(sanitizeFilename("  hello  ")).toBe("hello");
    });

    it("removes leading/trailing dots", () => {
      expect(sanitizeFilename("...file...")).toBe("file");
    });
  });
});

describe("getTransliterationPreview", () => {
  it("shows changes for accented text", () => {
    const preview = getTransliterationPreview("caf\u00e9");
    expect(preview.original).toBe("caf\u00e9");
    expect(preview.transliterated).toBe("cafe");
    expect(preview.changed).toBe(true);
    expect(preview.changedChars).toHaveLength(1);
    expect(preview.changedChars[0]).toEqual({ original: "\u00e9", replacement: "e" });
  });

  it("shows no changes for ASCII text", () => {
    const preview = getTransliterationPreview("hello");
    expect(preview.original).toBe("hello");
    expect(preview.transliterated).toBe("hello");
    expect(preview.changed).toBe(false);
    expect(preview.changedChars).toHaveLength(0);
  });

  it("shows multiple changes", () => {
    const preview = getTransliterationPreview("na\u00efve caf\u00e9");
    expect(preview.changed).toBe(true);
    expect(preview.changedChars.length).toBeGreaterThan(1);
  });
});
