import { describe, it, expect } from "vitest";
import { getLanguagesForModel, LANGUAGE_MAP } from "../../src/lib/languages";

describe("LANGUAGE_MAP", () => {
  it("contains auto entry", () => {
    expect(LANGUAGE_MAP["auto"]).toEqual({ label: "Auto (detect)", native: "Auto (detect)" });
  });
  it("contains standard language entries", () => {
    expect(LANGUAGE_MAP["en"]).toBeDefined();
    expect(LANGUAGE_MAP["it"]).toBeDefined();
    expect(LANGUAGE_MAP["zh"]).toBeDefined();
    expect(LANGUAGE_MAP["zh-Hans"]).toBeDefined();
    expect(LANGUAGE_MAP["zh-Hant"]).toBeDefined();
    expect(LANGUAGE_MAP["yue"]).toBeDefined();
  });
});

describe("getLanguagesForModel", () => {
  it("first entry is always auto", () => {
    expect(getLanguagesForModel(undefined)[0].code).toBe("auto");
  });

  it("returns all languages when supportedLanguages is undefined", () => {
    const langs = getLanguagesForModel(undefined);
    expect(langs.length).toBeGreaterThan(50);
  });

  it("filters to supportedLanguages when provided", () => {
    const langs = getLanguagesForModel(["en", "de", "es", "fr"]);
    const codes = langs.map(l => l.code);
    expect(codes).toContain("auto");
    expect(codes).toContain("en");
    expect(codes).toContain("de");
    expect(codes).not.toContain("it");
    expect(langs).toHaveLength(5); // auto + 4
  });

  it("returns only auto for empty supportedLanguages array", () => {
    const langs = getLanguagesForModel([]);
    expect(langs).toHaveLength(1);
    expect(langs[0].code).toBe("auto");
  });

  it("each entry has code, label, native", () => {
    const langs = getLanguagesForModel(["en"]);
    expect(langs[1]).toMatchObject({ code: "en", label: expect.any(String), native: expect.any(String) });
  });
});
