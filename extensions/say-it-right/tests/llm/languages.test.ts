import { describe, it, expect } from "vitest";
import {
  getLanguageTitle,
  resolveTargetLanguage,
} from "../../src/llm/languages";

describe("languages", () => {
  it("resolves auto Chinese to English and English to Simplified Chinese", () => {
    expect(resolveTargetLanguage("auto", "你好")).toBe("en");
    expect(resolveTargetLanguage("auto", "Hello there.")).toBe("zh-Hans");
  });

  it("honors explicit target languages and titles", () => {
    expect(resolveTargetLanguage("ja", "Hello there.")).toBe("ja");
    expect(getLanguageTitle("ja")).toBe("Japanese");
    expect(getLanguageTitle("custom-language")).toBe("custom-language");
  });
});
