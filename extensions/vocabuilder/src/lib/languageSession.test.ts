import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalStorage } from "@raycast/api";
import {
  getActiveLanguagePair,
  getRecentLanguagePairChoices,
  getSearchLanguagePairChoices,
  languagePairTitle,
  languagePairValue,
  parseLanguagePairValue,
  setActiveLanguagePair,
  setActiveLanguagePairValue,
} from "./languageSession";
import { LanguagePair } from "./languages";

const enUk: LanguagePair = {
  source: { code: "en", name: "English" },
  target: { code: "uk", name: "Ukrainian" },
};

const deFr: LanguagePair = {
  source: { code: "de", name: "German" },
  target: { code: "fr", name: "French" },
};

const enPl: LanguagePair = {
  source: { code: "en", name: "English" },
  target: { code: "pl", name: "Polish" },
};

describe("language session helpers", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await LocalStorage.clear();
  });

  it("serializes and parses a valid language pair", () => {
    expect(languagePairValue(enUk)).toBe("en-uk");
    expect(languagePairTitle(enUk)).toBe("English → Ukrainian");
    expect(parseLanguagePairValue("uk-pl")).toEqual({
      source: { code: "uk", name: "Ukrainian" },
      target: { code: "pl", name: "Polish" },
    });
  });

  it("rejects malformed, unknown, and same-language pair values", () => {
    expect(parseLanguagePairValue("en")).toBeNull();
    expect(parseLanguagePairValue("en-uk-pl")).toBeNull();
    expect(parseLanguagePairValue("en-en")).toBeNull();
    expect(parseLanguagePairValue("en-xx")).toBeNull();
  });

  it("uses the active or default pair as the initial recent choice", async () => {
    await expect(getRecentLanguagePairChoices(deFr)).resolves.toMatchObject([{ value: "de-fr", isDefault: true }]);
  });

  it("includes the active pair when no recent pairs have been persisted", async () => {
    const choices = await getRecentLanguagePairChoices(deFr, {
      source: { code: "fr", name: "French" },
      target: { code: "de", name: "German" },
    });
    expect(choices).toMatchObject([
      {
        value: "fr-de",
        isRecent: false,
        isDefault: false,
      },
    ]);
  });

  it("searches by language code or name and creates a pair from the default source", () => {
    expect(getSearchLanguagePairChoices("PL", enUk).map((choice) => choice.value)).toContain("en-pl");
    expect(getSearchLanguagePairChoices("Polish", enUk).map((choice) => choice.value)).toContain("en-pl");
  });

  it("prioritizes single-language matches as the source side", () => {
    expect(
      getSearchLanguagePairChoices("pt", enUk)
        .map((choice) => choice.value)
        .slice(0, 4),
    ).toEqual(["pt-en", "pt-uk", "pt-ru", "pt-be"]);
    expect(
      getSearchLanguagePairChoices("Polish", enUk)
        .map((choice) => choice.value)
        .slice(0, 4),
    ).toEqual(["pl-en", "pl-uk", "pl-ru", "pl-be"]);
  });

  it("searches Ukrainian by the user-facing UA alias as well as the internal UK code", () => {
    expect(getSearchLanguagePairChoices("UA", enPl).map((choice) => choice.value)).toContain("en-uk");
    expect(getSearchLanguagePairChoices("uk", enPl).map((choice) => choice.value)).toContain("en-uk");
  });

  it("creates source-target pairs from codes, names, and dash separators", () => {
    expect(getSearchLanguagePairChoices("PL-UA", enUk).map((choice) => choice.value)).toContain("pl-uk");
    expect(getSearchLanguagePairChoices("en-pl", enUk).map((choice) => choice.value)).toContain("en-pl");
    expect(getSearchLanguagePairChoices("en - pl", enUk).map((choice) => choice.value)).toContain("en-pl");
    expect(getSearchLanguagePairChoices("English-Polish", enUk).map((choice) => choice.value)).toContain("en-pl");
    expect(getSearchLanguagePairChoices("English → Polish", enUk).map((choice) => choice.value)).toContain("en-pl");
  });

  it("requires a delimiter for pair expressions", () => {
    expect(getSearchLanguagePairChoices("enpl", enUk).map((choice) => choice.value)).not.toContain("en-pl");
  });

  it("keeps partial pair searches populated after a trailing separator", () => {
    expect(getSearchLanguagePairChoices("en-", enUk).map((choice) => choice.value)).toContain("en-pl");
    expect(getSearchLanguagePairChoices("pl-", enUk).map((choice) => choice.value)).toContain("pl-uk");
    expect(getSearchLanguagePairChoices("-pl", enUk).map((choice) => choice.value)).toContain("en-pl");
  });

  it("returns no pair choices when a delimited target language is unknown", () => {
    expect(getSearchLanguagePairChoices("it-pb", enUk)).toEqual([]);
  });

  it("loads the stored active pair when it is valid", async () => {
    await setActiveLanguagePairValue("pl-uk");

    await expect(getActiveLanguagePair(enUk)).resolves.toEqual({
      source: { code: "pl", name: "Polish" },
      target: { code: "uk", name: "Ukrainian" },
    });
  });

  it("falls back to the preference default and clears invalid stored values", async () => {
    await LocalStorage.setItem("vocabuilder-active-language-pair", "bad-value");

    await expect(getActiveLanguagePair(enUk)).resolves.toEqual(enUk);
    expect(await LocalStorage.getItem("vocabuilder-active-language-pair")).toBeUndefined();
  });

  it("does not persist invalid dropdown values", async () => {
    await expect(setActiveLanguagePairValue("uk-uk")).resolves.toBeNull();
    expect(LocalStorage.setItem).not.toHaveBeenCalledWith("vocabuilder-active-language-pair", "uk-uk");
  });

  it("persists a concrete language pair", async () => {
    await setActiveLanguagePair(deFr);
    expect(await LocalStorage.getItem("vocabuilder-active-language-pair")).toBe("de-fr");
  });

  it("tracks recently selected pairs as an LRU list", async () => {
    await setActiveLanguagePair(enUk);
    await setActiveLanguagePair(deFr);
    await setActiveLanguagePair(enUk);

    const choices = await getRecentLanguagePairChoices(enPl);
    expect(choices.map((choice) => choice.value)).toEqual(["en-uk", "de-fr"]);
    expect(choices.every((choice) => choice.isRecent)).toBe(true);
  });

  it("clears invalid recent-pair storage and falls back to the active pair", async () => {
    await LocalStorage.setItem("vocabuilder-recent-language-pairs", "not json");

    const choices = await getRecentLanguagePairChoices(enUk, deFr);

    expect(choices.map((choice) => choice.value)).toEqual(["de-fr"]);
    expect(await LocalStorage.getItem("vocabuilder-recent-language-pairs")).toBeUndefined();
  });
});
