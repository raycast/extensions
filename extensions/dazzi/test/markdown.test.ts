import { describe, expect, it } from "vitest";
import { detailMarkdown, escapeMarkdown } from "../src/lib/markdown";
import type { Hit } from "../src/lib/retrieve";

/** What is left once every backslash escape is taken out: CommonMark renders `\X` as the literal X. */
const unescapedPunctuation = (markdown: string): string => markdown.replace(/\\[!-/:-@[-`{-~]/gu, "").replace(/[!-/:-@[-`{-~]/gu, (c) => `«${c}»`);

const HOSTILE = [
  "![](https://x/y)",
  '![a](https://x/y "t")',
  "![a][r]\n\n[r]: https://x/y",
  "![r]\n\n[r]: https://x/y",
  '<img src="https://x/y">',
  "<IMG SRC=https://x/y onerror=alert(1)>",
  "<a href='https://x/y'>click</a><script src=//x/y></script>",
  "<https://x/y> and https://x/y and www.x/y",
  "[![a](https://x/y)](https://x/z)",
  "`![](https://x/y)` ``![](https://x/y)``",
  "\\![](https://x/y)",
  "&#33;[](https://x/y) &excl;[](https://x/y) &#x21;[](https://x/y)",
  "!\u200b[](https://x/y) !\u2060[](https://x/y) !\u00ad[](https://x/y)",
  "!\u0000[](https://x/y)",
  "![](https://x/y)\r\n![](https://x/y)\u2028![](https://x/y)",
  "    ![](https://x/y)\n\t![](https://x/y)",
];

describe("escapeMarkdown", () => {
  it.each(HOSTILE)("leaves no Markdown or HTML construct in %j", (hostile) => {
    expect(unescapedPunctuation(escapeMarkdown(hostile))).not.toMatch(/«/u);
  });

  it("keeps the text readable and its line breaks", () => {
    expect(escapeMarkdown("Hello, 세계!\nsecond line")).toBe("Hello\\, 세계\\!  \nsecond line");
  });

  it("drops control characters that would hide a construct", () => {
    expect(escapeMarkdown("a\u0000b\u0085c")).toBe("abc");
  });
});

describe("detailMarkdown", () => {
  const hit = (over: Partial<Hit>): Hit => ({
    key: "k",
    kind: "mail",
    title: "t",
    subtitle: "s",
    content: "c",
    source: "src",
    method: "m",
    ...over,
  });

  it("escapes the title, location and body of an attacker-written hit", () => {
    const markdown = detailMarkdown(
      hit({ title: "![](https://x/title)", location: "<img src=https://x/loc>", content: "![](https://x/body)\n<img src=https://x/b>" }),
    );
    // Only the heading marker and the emphasis underscores around the location are ours.
    expect(unescapedPunctuation(markdown.replace(/^### /u, "").replace(/\n\n_(.*)_\n\n/u, "\n\n$1\n\n"))).not.toMatch(/«/u);
    expect(markdown).not.toMatch(/(?<!\\)[!<]/u);
  });

  it("keeps a multi-line title on the heading line", () => {
    expect(detailMarkdown(hit({ title: "a\n# b" }))).toMatch(/^### a \\# b\n/u);
  });

  it("says when there is nothing to preview", () => {
    expect(detailMarkdown(hit({ content: "  \n" }))).toBe("### t\n\n_No preview_");
  });
});
