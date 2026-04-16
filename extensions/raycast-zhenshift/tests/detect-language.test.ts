import { describe, expect, it } from "vitest";
import { detectLanguageDirection } from "../src/lib/detect-language";

describe("detectLanguageDirection", () => {
  it("中文输入应识别为翻译到英文", () => {
    const result = detectLanguageDirection("你好，世界");
    expect(result).toMatchObject({
      sourceLanguage: "zh",
      targetLanguage: "en",
      directionLabel: "中文 -> English",
    });
    expect(result.status).toBe("ready");
  });

  it("英文输入应识别为翻译到中文", () => {
    const result = detectLanguageDirection("hello world");
    expect(result).toMatchObject({
      sourceLanguage: "en",
      targetLanguage: "zh",
      directionLabel: "English -> 中文",
    });
    expect(result.status).toBe("ready");
  });

  it("空输入应返回 idle", () => {
    expect(detectLanguageDirection("   ").status).toBe("idle");
  });

  it("中文与英文字符数量相等时仍认为中文源", () => {
    expect(detectLanguageDirection("Hi你好")).toMatchObject({
      sourceLanguage: "zh",
      targetLanguage: "en",
    });
  });
});
