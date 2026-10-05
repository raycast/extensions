import { describe, expect, it } from "vitest";

import { asMarkdownCodeBlock, formatResult } from "./markdown";

describe("translation result markdown", () => {
  it("keeps user-controlled text inside code blocks", () => {
    const result = formatResult(
      {
        text: "# translated\n[open link](https://example.com)\n```\nraw",
        sourceLanguage: "en",
        targetLanguage: "ru",
        provider: "google-web",
      },
      "Source\n![image](https://example.com/image.png)\n```\nraw",
    );

    expect(result).toContain(
      "````\n# translated\n[open link](https://example.com)\n```\nraw\n````",
    );
    expect(result).toContain(
      "````\nSource\n![image](https://example.com/image.png)\n```\nraw\n````",
    );
  });

  it("chooses a fence longer than any backtick run in the text", () => {
    const text = "````\ncontent\n````";

    expect(asMarkdownCodeBlock(text)).toBe("`````\n" + text + "\n`````");
  });
});
