import test from "node:test";
import assert from "node:assert/strict";
import { buildFallbackUrl, extractArticleMarkdownFromHtml } from "../src/lib/extract";

const BASE_URL = "https://example.com/posts/main";

// Readability discards pages that look too thin, so wrap fragments in enough
// prose for the block under test to survive extraction.
const FILLER = `<p>${"Filler prose to satisfy the extractor. ".repeat(12)}</p>`;

function markdownFor(bodyHtml: string): string {
  const article = extractArticleMarkdownFromHtml(
    `<!doctype html><html><head><title>T</title></head><body><article><h1>T</h1>${FILLER}${bodyHtml}${FILLER}</article></body></html>`,
    BASE_URL,
  );
  assert.ok(article, "expected the article to be extracted");
  return article.bodyMarkdown;
}

test("extractArticleMarkdownFromHtml extracts article body and absolutizes links", () => {
  const article = extractArticleMarkdownFromHtml(
    `<!doctype html>
    <html>
      <head><title>Fallback Title</title></head>
      <body>
        <nav>Navigation noise</nav>
        <article>
          <h1>Example Article</h1>
          <p>Useful paragraph with enough signal for the extractor.</p>
          <p>Read the <a href="/related">related post</a>.</p>
        </article>
      </body>
    </html>`,
    BASE_URL,
  );

  assert.ok(article);
  assert.match(article.bodyMarkdown, /Useful paragraph/);
  assert.match(article.bodyMarkdown, /https:\/\/example\.com\/related/);
});

test("fenced code survives whitespace between <pre> and <code>", () => {
  // Pretty-printed HTML puts a text node before <code>, which defeats a
  // firstChild check and collapses the block into a one-line inline span.
  const md = markdownFor("<pre>\n  <code>const a = 1;\nconst b = 2;</code>\n</pre>");

  assert.match(md, /```\nconst a = 1;\nconst b = 2;\n```/);
});

test("fenced code preserves the language hint", () => {
  const md = markdownFor('<pre><code class="language-ts">const x: number = 1;</code></pre>');

  assert.match(md, /```ts\nconst x: number = 1;\n```/);
});

test("fenced code lengthens the fence when the content contains a fence", () => {
  const md = markdownFor('<pre><code>echo "hi"\n```\nstill inside the block</code></pre>');

  // A 3-backtick fence would terminate early and leave the rest of the
  // document inside an unterminated code block.
  assert.match(md, /````\necho "hi"\n```\nstill inside the block\n````/);
  assert.match(md, /Filler prose[\s\S]*````[\s\S]*Filler prose/);
});

test("fenced code keeps content that follows the <code> element", () => {
  const md = markdownFor("<pre><code>line one</code><span> TRAILING</span></pre>");

  assert.match(md, /TRAILING/);
});

test("lazy-loaded and srcset images get absolute URLs", () => {
  // Readability promotes data-src to src after our own absolutize pass, so
  // these only come out absolute if the document has a usable base URI.
  const md = markdownFor(
    '<p><img src="/img/plain.png" alt="plain"></p>' +
      '<p><img data-src="/img/lazy.png" alt="lazy"></p>' +
      '<p><img srcset="/img/set.png 1x" alt="setonly"></p>',
  );

  assert.match(md, /!\[plain\]\(https:\/\/example\.com\/img\/plain\.png\)/);
  assert.match(md, /!\[lazy\]\(https:\/\/example\.com\/img\/lazy\.png\)/);
  assert.doesNotMatch(md, /\(\/img\//, "no relative image paths should remain");
});

test("GFM tables are still converted", () => {
  const md = markdownFor(
    "<table><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody><tr><td>a</td><td>1</td></tr></tbody></table>",
  );

  assert.match(md, /\| Key \| Value \|/);
  assert.match(md, /\| a \| 1 \|/);
});

test("buildFallbackUrl does not double the scheme for a scheme-ending prefix", () => {
  // The shape reader services document, and that users paste verbatim.
  assert.equal(
    buildFallbackUrl("https://r.jina.ai/https://", "https://example.com/post"),
    "https://r.jina.ai/https://example.com/post",
  );
  assert.equal(
    buildFallbackUrl("https://r.jina.ai/http://", "http://example.com/post"),
    "https://r.jina.ai/http://example.com/post",
  );
});

test("buildFallbackUrl appends the whole URL for a plain prefix", () => {
  assert.equal(
    buildFallbackUrl("https://r.jina.ai/", "https://example.com/post"),
    "https://r.jina.ai/https://example.com/post",
  );
});
