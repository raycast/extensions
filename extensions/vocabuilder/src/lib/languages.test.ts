import { describe, it, expect, vi } from "vitest";
import { getLanguageByCode, storageKeyPrefix, getLanguagePair, swapLanguagePair, LANGUAGES } from "./languages";
import { getPreferenceValues } from "@raycast/api";

describe("getLanguageByCode", () => {
  it("returns the language for a valid code", () => {
    const en = getLanguageByCode("en");
    expect(en).toEqual({ code: "en", name: "English" });
  });

  it("returns undefined for an unknown code", () => {
    expect(getLanguageByCode("xx")).toBeUndefined();
  });

  it("finds every language in the LANGUAGES array", () => {
    for (const lang of LANGUAGES) {
      expect(getLanguageByCode(lang.code)).toEqual(lang);
    }
  });
});

describe("storageKeyPrefix", () => {
  it("formats source-target pair", () => {
    const pair = {
      source: { code: "en", name: "English" },
      target: { code: "uk", name: "Ukrainian" },
    };
    expect(storageKeyPrefix(pair)).toBe("en-uk");
  });
});

describe("swapLanguagePair", () => {
  it("swaps source and target", () => {
    const pair = {
      source: { code: "en", name: "English" },
      target: { code: "uk", name: "Ukrainian" },
    };
    const swapped = swapLanguagePair(pair);
    expect(swapped.source).toEqual({ code: "uk", name: "Ukrainian" });
    expect(swapped.target).toEqual({ code: "en", name: "English" });
  });

  it("is its own inverse", () => {
    const pair = {
      source: { code: "de", name: "German" },
      target: { code: "fr", name: "French" },
    };
    expect(swapLanguagePair(swapLanguagePair(pair))).toEqual(pair);
  });

  it("produces a different storage key prefix", () => {
    const pair = {
      source: { code: "en", name: "English" },
      target: { code: "uk", name: "Ukrainian" },
    };
    expect(storageKeyPrefix(swapLanguagePair(pair))).toBe("uk-en");
    expect(storageKeyPrefix(pair)).toBe("en-uk");
  });
});

describe("getLanguagePair", () => {
  it("returns a valid language pair from preferences", () => {
    vi.mocked(getPreferenceValues).mockReturnValue({
      sourceLanguage: "en",
      targetLanguage: "de",
    });
    const pair = getLanguagePair();
    expect(pair.source).toEqual({ code: "en", name: "English" });
    expect(pair.target).toEqual({ code: "de", name: "German" });
  });

  it("throws when source and target are the same", () => {
    vi.mocked(getPreferenceValues).mockReturnValue({
      sourceLanguage: "en",
      targetLanguage: "en",
    });
    expect(() => getLanguagePair()).toThrow("Source and target language must be different");
  });

  it("throws when language code is invalid", () => {
    vi.mocked(getPreferenceValues).mockReturnValue({
      sourceLanguage: "en",
      targetLanguage: "xx",
    });
    expect(() => getLanguagePair()).toThrow("Invalid language configuration");
  });
});
