import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  containsHtmlHyperlinks,
  containsHtmlMarkup,
  containsMarkdownHyperlinks,
  extractHtmlFragment,
  htmlLinksToMarkdown,
  htmlToDisplayText,
  htmlToPlainText,
  markdownLinksToHtml,
  prepareFromText,
  prepareTranslationPayload,
  toRichClipboardContent,
} from "../src/hyperlinks.ts";

describe("extractHtmlFragment", () => {
  it("prefers the StartFragment block", () => {
    const html = `<html><body><!--StartFragment-->Visit <a href="https://example.com">this site</a><!--EndFragment--></body></html>`;
    assert.equal(extractHtmlFragment(html), `Visit <a href="https://example.com">this site</a>`);
  });

  it("falls back to body content", () => {
    const html = `<html><body><a href="https://example.com">Docs</a></body></html>`;
    assert.equal(extractHtmlFragment(html), `<a href="https://example.com">Docs</a>`);
  });

  it("strips CF_HTML headers", () => {
    const html = `Version:0.9\nStartHTML:0000\n<html><body><a href="https://a.com">A</a></body></html>`;
    assert.equal(extractHtmlFragment(html), `<a href="https://a.com">A</a>`);
  });
});

describe("link detection", () => {
  it("detects HTML and markdown hyperlinks", () => {
    assert.equal(containsHtmlHyperlinks(`see <a href="https://x.com">x</a>`), true);
    assert.equal(containsHtmlHyperlinks("see https://x.com"), false);
    assert.equal(containsMarkdownHyperlinks("[x](https://x.com)"), true);
    assert.equal(containsMarkdownHyperlinks("![x](https://x.com/a.png)"), false);
  });

  it("detects Gmail-style markup without treating autolinks as tags", () => {
    assert.equal(containsHtmlMarkup(`<div dir="ltr">Hello <a href="https://x.com">x</a></div>`), true);
    assert.equal(containsHtmlMarkup(`<span style="font-family:Arial">Hi</span>`), true);
    assert.equal(containsHtmlMarkup("see <https://example.com>"), false);
  });
});

describe("markdown and HTML conversion", () => {
  it("converts markdown links to anchors and back", () => {
    const markdown = "Read [the docs](https://example.com/docs) please";
    const html = markdownLinksToHtml(markdown);
    assert.equal(html, `Read <a href="https://example.com/docs">the docs</a> please`);
    assert.equal(htmlLinksToMarkdown(html), markdown);
  });

  it("keeps inner anchor text when stripping tags", () => {
    const html = `<a href="https://example.com"><strong>Click here</strong></a>`;
    assert.equal(htmlLinksToMarkdown(html), "[Click here](https://example.com)");
    assert.equal(htmlToPlainText(html), "Click here");
    assert.equal(htmlToDisplayText(html), "[Click here](https://example.com)");
  });

  it("does not convert image markdown", () => {
    const text = "Logo ![alt](https://example.com/logo.png)";
    assert.equal(markdownLinksToHtml(text), text);
  });
});

describe("prepareFromText", () => {
  it("enables HTML handling for anchors and markdown links only", () => {
    assert.deepEqual(prepareFromText("hello"), { text: "hello", isHtml: false });
    assert.deepEqual(prepareFromText(`see <a href="https://x.com">x</a>`), {
      text: `see <a href="https://x.com">x</a>`,
      isHtml: true,
    });
    assert.deepEqual(prepareFromText("see [x](https://x.com)"), {
      text: `see <a href="https://x.com">x</a>`,
      isHtml: true,
    });
  });
});

describe("prepareTranslationPayload", () => {
  it("uses source HTML only when it is provided", () => {
    const html = `<html><body><!--StartFragment-->Visit <a href="https://example.com">this site</a><!--EndFragment--></body></html>`;
    assert.deepEqual(prepareTranslationPayload("Visit this site", html), {
      text: `Visit <a href="https://example.com">this site</a>`,
      isHtml: true,
    });
  });

  it("does not apply unrelated HTML when none was provided with the source", () => {
    assert.deepEqual(prepareTranslationPayload("Visit this site"), {
      text: "Visit this site",
      isHtml: false,
    });
  });

  it("does not infer HTML from matching plain text alone", () => {
    assert.deepEqual(prepareTranslationPayload("Visit this site", undefined), {
      text: "Visit this site",
      isHtml: false,
    });
  });

  it("preserves non-link HTML formatting when it is provided", () => {
    assert.deepEqual(prepareTranslationPayload("hello", "<p>hello</p>"), {
      text: "<p>hello</p>",
      isHtml: true,
    });
  });

  it("still converts markdown links in the source text", () => {
    assert.deepEqual(prepareTranslationPayload("see [docs](https://example.com)"), {
      text: `see <a href="https://example.com">docs</a>`,
      isHtml: true,
    });
  });
});

describe("toRichClipboardContent", () => {
  it("publishes an HTML fragment without a plain-text flavor", () => {
    assert.deepEqual(
      toRichClipboardContent(
        `<html><body><!--StartFragment--><a href="https://example.com">Docs</a><!--EndFragment--></body></html>`,
      ),
      { html: `<a href="https://example.com">Docs</a>` },
    );
  });
});
