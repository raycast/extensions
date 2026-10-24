import { describe, expect, it } from "vitest";

import manifest from "../../../package.json";
import { languageItemList } from "./consts";
import {
  getLangCode,
  getLanguageFromProviderCode,
  getLanguageItem,
  isLanguageCode,
  isSourceLanguage,
  lookupLanguageItem,
  parseSourceLanguage,
} from "./utils";

describe("language boundaries", () => {
  it("distinguishes known languages, automatic source detection, and unknown codes", () => {
    expect(isLanguageCode("en")).toBe(true);
    expect(isLanguageCode("auto")).toBe(false);
    expect(isSourceLanguage("auto")).toBe(true);
    for (const value of ["", "never-a-language", "toString", 1, null]) {
      expect(isSourceLanguage(value)).toBe(false);
      expect(isLanguageCode(value)).toBe(false);
    }
    expect(getLangCode("unknown", "bingLangCode")).toBeUndefined();
    expect(getLanguageFromProviderCode("unknown", "bingLangCode")).toBeUndefined();
    expect(lookupLanguageItem("unknown")).toBeUndefined();
    expect(() => getLanguageItem("unknown")).toThrow("Unknown language");
  });

  it("keeps the existing source/target mappings and ambiguous reverse-map choices", () => {
    expect(getLangCode("zh-CHT", "deepLSourceId")).toBe("ZH");
    expect(getLangCode("zh-CHT", "deepLTargetId")).toBe("ZH-HANT");
    expect(getLanguageFromProviderCode("ZH", "deepLSourceId")).toBe("zh-CHS");
    expect(getLanguageFromProviderCode("cmn", "francLangCode")).toBe("zh-CHS");
    expect(getLanguageFromProviderCode("jp", "tencentDetectCode")).toBe("ja");
    expect(getLanguageFromProviderCode("zh", "baiduLangCode")).toBe("zh-CHS");
  });

  it.each([
    { alias: "fil", canonical: "tl" },
    { alias: "sr", canonical: "sr-Latn" },
  ])("resolves the manifest $alias alias without changing the persisted $canonical code", ({ alias, canonical }) => {
    expect(parseSourceLanguage(alias)).toBe(canonical);
    expect(getLanguageItem(alias)).toBe(getLanguageItem(canonical));
    expect(getLangCode(alias, "googleLangCode")).toBe(getLangCode(canonical, "googleLangCode"));
    expect(languageItemList.filter((item) => item.youdaoLangCode === canonical)).toHaveLength(1);
  });

  it.each(manifest.preferences.filter(({ name }) => name === "language1" || name === "language2"))(
    "resolves every $name preference option to a supported language",
    ({ data }) => {
      expect(data).toBeDefined();
      for (const { value } of data ?? []) {
        expect(isLanguageCode(getLanguageItem(value).youdaoLangCode), value).toBe(true);
      }
    },
  );
});
