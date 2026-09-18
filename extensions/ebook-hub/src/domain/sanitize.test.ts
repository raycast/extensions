import { describe, expect, it } from "vitest";

import { sanitizeMarkdown } from "./sanitize";

describe("sanitizeMarkdown", () => {
  it("removes raw HTML, comments, images, and unsafe links", () => {
    const markdown = [
      "# Title",
      "<div>block</div>",
      "<!-- hidden -->",
      "![cover](cover.png)",
      "![logo][ref]",
      "[click](javascript:alert(1))",
      "[keep](https://example.org)",
    ].join("\n");

    // Tags are removed but the text they wrapped is kept.
    expect(sanitizeMarkdown(markdown)).toBe("# Title\nblock\n\nclick\n[keep](https://example.org)");
  });

  it("removes reference-style definitions that point at an unsafe scheme", () => {
    const markdown = [
      "See [the note][x] and [the doc][ok].",
      "",
      "[x]: javascript:alert(1)",
      "[ok]: https://example.org",
    ].join("\n");

    expect(sanitizeMarkdown(markdown)).toBe("See [the note][x] and [the doc][ok].\n\n[ok]: https://example.org");
  });

  it("keeps fenced code verbatim", () => {
    const markdown = "```html\n<div>example</div>\n![x](y)\n```";

    expect(sanitizeMarkdown(markdown)).toBe(markdown);
  });
});
