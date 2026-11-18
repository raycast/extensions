import { homedir } from "os";
import { describe, it, expect } from "vitest";
import { extractMarkdownLink } from "./extractMarkdownLink";

describe("extractMarkdownLink (EXT-07)", () => {
  it("extracts inline [text](url) markdown link", () => {
    const { items } = extractMarkdownLink("see [Click here](https://anthropic.com) now");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      raw: "[Click here](https://anthropic.com)",
      url: "https://anthropic.com",
      type: "web",
    });
  });

  it("classifies inner obsidian:// as custom-scheme", () => {
    const { items } = extractMarkdownLink("[Open vault](obsidian://open?vault=Notes)");
    expect(items[0].type).toBe("custom-scheme");
    expect(items[0].url).toBe("obsidian://open?vault=Notes");
  });

  it("classifies inner mailto: as mailto", () => {
    const { items } = extractMarkdownLink("[Email](mailto:foo@bar.com)");
    expect(items[0].type).toBe("mailto");
  });

  it("expands ~ in inner path", () => {
    const { items } = extractMarkdownLink("[Notes](~/Documents/notes.md)");
    expect(items[0].url).toBe(`${homedir()}/Documents/notes.md`);
    expect(items[0].type).toBe("local-path");
  });

  it("masks the markdown span in returned text", () => {
    const input = "before [text](https://a.com) after";
    const { maskedText } = extractMarkdownLink(input);
    expect(maskedText.length).toBe(input.length);
    expect(maskedText).toBe("before                       after");
    // Spaces fill exactly the span of `[text](https://a.com)` (length 21)
  });

  it("captures index of opening bracket", () => {
    const { items } = extractMarkdownLink("xx [t](https://a.com)");
    expect(items[0].index).toBe(3);
  });

  it("classifies bare allowlisted-TLD inner URL as web with https://", () => {
    const { items } = extractMarkdownLink("[link](example.com)");
    expect(items[0].type).toBe("web");
    expect(items[0].url).toBe("https://example.com");
  });

  it("keeps balanced parentheses inside the URL (Wikipedia-style)", () => {
    const { items } = extractMarkdownLink("[C](https://en.wikipedia.org/wiki/C_(programming_language))");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      raw: "[C](https://en.wikipedia.org/wiki/C_(programming_language))",
      url: "https://en.wikipedia.org/wiki/C_(programming_language)",
      type: "web",
    });
  });
});
