import { strict as assert } from "node:assert";
import test from "node:test";
import { parseLinkPreview } from "./link-preview-parser";

test("parseLinkPreview resolves og images and metadata", () => {
  const preview = parseLinkPreview(
    `
      <html>
        <head>
          <meta property="og:title" content="Linear" />
          <meta property="og:description" content="Plan and build products" />
          <meta property="og:site_name" content="Linear" />
          <meta property="og:image" content="/og.png" />
        </head>
      </html>
    `,
    "https://linear.app/docs",
  );

  assert.equal(preview.title, "Linear");
  assert.equal(preview.description, "Plan and build products");
  assert.equal(preview.siteName, "Linear");
  assert.equal(preview.imageUrl, "https://linear.app/og.png");
});

test("parseLinkPreview falls back to twitter image and title tag", () => {
  const preview = parseLinkPreview(
    `
      <html>
        <head>
          <title>Fallback Title</title>
          <meta name="twitter:image" content="https://cdn.example.com/card.jpg" />
        </head>
      </html>
    `,
    "https://example.com/post",
  );

  assert.equal(preview.title, "Fallback Title");
  assert.equal(preview.imageUrl, "https://cdn.example.com/card.jpg");
});
