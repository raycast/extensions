import test from "node:test";
import assert from "node:assert/strict";
import { extractArticleMarkdownFromHtml } from "../src/lib/extract";

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
    "https://example.com/posts/main",
  );

  assert.ok(article);
  assert.match(article.bodyMarkdown, /Useful paragraph/);
  assert.match(article.bodyMarkdown, /https:\/\/example\.com\/related/);
});

