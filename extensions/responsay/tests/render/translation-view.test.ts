import { describe, expect, it } from "vitest";
import { renderTranslationMarkdown } from "../../src/render/translation";

describe("renderTranslationMarkdown", () => {
  it("renders source and translation", () => {
    const out = renderTranslationMarkdown("Could you turn it off?", {
      translation: "请把它关掉好吗？",
      targetLanguageTitle: "Chinese Simplified",
    });

    expect(out).toContain("# Translation");
    expect(out).toContain("> Could you turn it off?");
    expect(out).toContain("## Chinese Simplified");
    expect(out).toContain("请把它关掉好吗？");
  });

  it("shows failed state without losing the source", () => {
    const out = renderTranslationMarkdown("hello", {
      failed: true,
      errorMessage: "Chat API 429: quota exceeded",
    });

    expect(out).toContain("> hello");
    expect(out).toContain("Could not translate");
    expect(out).toContain("Chat API 429: quota exceeded");
  });

  it("keeps the previous translation visible when refresh fails", () => {
    const out = renderTranslationMarkdown("hello", {
      translation: "你好",
      targetLanguageTitle: "Chinese Simplified",
      failed: true,
      errorMessage: "Chat API 503: overloaded",
    });

    expect(out).toContain("你好");
    expect(out).toContain("Refresh failed");
    expect(out).toContain("Chat API 503: overloaded");
  });

  it("renders intent-expression labels", () => {
    const out = renderTranslationMarkdown(
      "我想委婉地催一下文件。",
      {
        translation: "Could you send me the file when you get a chance?",
        coaching: "- `Could you` keeps the request polite and direct.",
        targetLanguageTitle: "English",
      },
      {
        title: "Expression Coach",
        sourceTitle: "What You Mean",
      },
    );

    expect(out).toContain("# Expression Coach");
    expect(out).toContain("## What You Mean");
    expect(out).toContain("## English");
    expect(out).toContain("## Why This Works");
    expect(out).toContain("keeps the request polite");
  });
});
