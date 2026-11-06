import assert from "node:assert/strict";
import { test } from "node:test";
import {
  exportHtml,
  exportMarkdown,
  normalizeUrl,
  parseOpenGraph,
  previewText,
  resolveHttpUrl,
  validateOpenGraph,
} from "../src/util.ts";

test("keeps all social tags and pairs dimensions with each image in document order", () => {
  const graph = parseOpenGraph(
    `<title>Page &amp; title</title>
     <meta name="DESCRIPTION" content="Page description">
     <meta property="og:site_name" content="Example">
     <meta property="og:image" content="../one.png">
     <meta property="og:image:width" content="1200">
     <meta property="og:image:height" content="630">
     <meta property="og:image:alt" content="First image">
     <meta property="og:image" content="//cdn.example.com/two.png">
     <meta property="og:image:height" content="400">
     <meta name="twitter:creator" content="@example">
     <meta property="twitter:image" content="/twitter.png">
     <meta name="twitter:image" content="/twitter2.png">`,
    "https://example.com/articles/page",
  );
  assert.equal(graph.title, "Page & title");
  assert.equal(graph.description, "Page description");
  assert.equal(graph.tags.find((tag) => tag.name === "og:site_name")?.content, "Example");
  assert.equal(graph.tags.find((tag) => tag.name === "twitter:creator")?.content, "@example");
  assert.deepEqual(
    graph.images.map(({ resolvedUrl, width, height, alt }) => ({ resolvedUrl, width, height, alt })),
    [
      { resolvedUrl: "https://example.com/one.png", width: 1200, height: 630, alt: "First image" },
      { resolvedUrl: "https://cdn.example.com/two.png", width: undefined, height: 400, alt: undefined },
      { resolvedUrl: "https://example.com/twitter.png", width: undefined, height: undefined, alt: undefined },
      { resolvedUrl: "https://example.com/twitter2.png", width: undefined, height: undefined, alt: undefined },
    ],
  );
});

test("resolves images against the document base and preserves unknown and repeated tags", () => {
  const graph = parseOpenGraph(
    `<base href="../assets/"><meta property="og:image:url" content="one.png"><meta name="twitter:custom" content="a"><meta name="twitter:custom" content="b">`,
    "https://example.com/pages/redirected",
  );
  assert.equal(graph.images[0].resolvedUrl, "https://example.com/assets/one.png");
  assert.deepEqual(
    graph.tags.slice(1).map((tag) => tag.content),
    ["a", "b"],
  );
});

test("represents missing metadata without sentinel strings", () => {
  const graph = parseOpenGraph("<html><body>No metadata</body></html>");
  assert.equal(graph.title, undefined);
  assert.equal(graph.description, undefined);
  assert.deepEqual(graph.tags, []);
  assert.deepEqual(graph.images, []);
});

test("uses OG, then Twitter, then page metadata for preview without hiding validation issues", () => {
  const html = '<title>Page</title><meta name="description" content="Page description">';
  assert.deepEqual(previewText(parseOpenGraph(html)), { title: "Page", description: "Page description" });
  const twitter =
    html +
    '<meta name="twitter:title" content="Twitter"><meta property="twitter:description" content="Twitter description">';
  assert.deepEqual(previewText(parseOpenGraph(twitter)), { title: "Twitter", description: "Twitter description" });
  assert.deepEqual(
    previewText(
      parseOpenGraph(
        twitter + '<meta property="og:title" content="OG"><meta property="og:description" content="OG description">',
      ),
    ),
    { title: "OG", description: "OG description" },
  );
  assert.deepEqual(validateOpenGraph(parseOpenGraph(html)), [
    "Missing og:title",
    "Missing og:type",
    "Missing og:image",
    "Missing og:url",
  ]);
});

test("validates the first required tags, including URL schemes and blank values", () => {
  const html =
    '<meta property="og:title" content="Title"><meta property="og:type" content="website"><meta property="og:image:url" content="https://example.com/image.png"><meta property="og:url" content="https://example.com">';
  assert.deepEqual(validateOpenGraph(parseOpenGraph(html)), []);
  assert.deepEqual(
    validateOpenGraph(parseOpenGraph(html.replace('content="https://example.com/image.png"', 'content="/image.png"'))),
    ["og:image must be an absolute HTTP or HTTPS URL"],
  );
  assert.deepEqual(
    validateOpenGraph(parseOpenGraph(html.replace('content="https://example.com"', 'content="javascript:alert(1)"'))),
    ["og:url must be an absolute HTTP or HTTPS URL"],
  );
  assert.deepEqual(validateOpenGraph(parseOpenGraph('<meta property="og:title" content=" ">' + html)), [
    "Missing og:title",
  ]);
});

test("normalizes URL input while rejecting unsupported schemes and prose", () => {
  assert.equal(normalizeUrl(" example.com/path?q=a#fragment "), "https://example.com/path?q=a#fragment");
  assert.equal(normalizeUrl("//example.com/image.png"), "https://example.com/image.png");
  assert.equal(normalizeUrl("localhost:3000/path"), "https://localhost:3000/path");
  assert.equal(normalizeUrl("my-app:3000/page"), "https://my-app:3000/page");
  assert.equal(normalizeUrl("devbox:8080?q=1"), "https://devbox:8080/?q=1");
  assert.equal(normalizeUrl("my-app:80"), "https://my-app:80/");
  assert.equal(normalizeUrl("http://localhost:3000/path"), "http://localhost:3000/path");
  assert.equal(normalizeUrl("EXAMPLE.com:8080?q=1"), "https://example.com:8080/?q=1");
  for (const value of [
    "",
    "some copied text",
    "ftp://example.com",
    "file:///tmp/page.html",
    "javascript:123",
    "mailto:123",
    "data:123",
    "ftp:3000/page",
    "https://",
  ]) {
    assert.throws(() => normalizeUrl(value));
  }
  assert.equal(resolveHttpUrl("//cdn.example.com/a.png", "http://example.com/page"), "http://cdn.example.com/a.png");
  assert.equal(resolveHttpUrl("data:image/png;base64,abc", "https://example.com"), undefined);
  assert.equal(resolveHttpUrl("javascript:alert(1)", "https://example.com"), undefined);
});

test("does not treat malformed image dimensions as valid sizes", () => {
  const graph = parseOpenGraph(
    '<meta property="og:image" content="/a"><meta property="og:image:width" content="1200px"><meta property="og:image:height" content="-1"><meta property="og:image" content="/b"><meta property="og:image:width" content="0">',
    "https://example.com",
  );
  for (const image of graph.images) {
    assert.equal(image.width, undefined);
    assert.equal(image.height, undefined);
  }
});

test("exports repeated tags in order and safely escapes HTML and Markdown", () => {
  const graph = parseOpenGraph(
    '<meta property="og:title" content="A &quot;quote&quot; &amp; &lt;tag&gt;"><meta property="og:image" content="/one.png"><meta property="og:image" content="/two.png"><meta name="twitter:description" content="a|b&#10;![image](https://example.com)">',
    "https://example.com",
  );
  const html = exportHtml(graph);
  assert.match(html, /&quot;quote&quot; &amp; &lt;tag&gt;/);
  assert.deepEqual(parseOpenGraph(html).tags, graph.tags);
  const markdown = exportMarkdown(graph, "https://example.com");
  assert.match(markdown, /\| --- \| --- \|\n\| og:title/);
  assert.match(markdown, /one\.png \|\n\| og:image \| \/two\.png/);
  assert.ok(markdown.includes("a\\|b<br>\\!\\[image\\]\\(https://example.com\\)"));
  const exported = JSON.parse(JSON.stringify(graph));
  assert.deepEqual(exported.tags, graph.tags);
  assert.deepEqual(exported.images, graph.images);
});
