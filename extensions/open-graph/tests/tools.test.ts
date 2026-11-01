import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildSync } from "esbuild";

const require = createRequire(import.meta.url);

test("AI tools use the shared metadata pipeline and return serializable results", async (t) => {
  const output = mkdtempSync(join(tmpdir(), "open-graph-tools-"));
  t.after(() => rmSync(output, { recursive: true, force: true }));
  buildSync({
    entryPoints: ["src/tools/get-open-graph.ts", "src/tools/export-open-graph.ts"],
    outdir: output,
    bundle: true,
    platform: "node",
    format: "cjs",
  });
  const getOpenGraph: typeof import("../src/tools/get-open-graph").default = require(
    join(output, "get-open-graph.js"),
  ).default;
  const exportOpenGraph: typeof import("../src/tools/export-open-graph").default = require(
    join(output, "export-open-graph.js"),
  ).default;
  const server = createServer((request, response) => {
    if (request.url === "/redirect") {
      response.writeHead(302, { Location: "/nested/article" });
      response.end();
      return;
    }
    if (request.url === "/error") {
      response.writeHead(503, "Service Unavailable");
      response.end();
      return;
    }
    response.writeHead(200, { "Content-Type": "text/html" });
    if (request.url === "/plain") {
      response.end('<title>Page fallback</title><meta name="description" content="Page description">');
      return;
    }
    response.end(`<title>Page title</title>
      <meta property="og:title" content="Social &amp; title">
      <meta property="og:type" content="website">
      <meta property="og:url" content="${base}/canonical">
      <meta property="og:image" content="./one.png">
      <meta property="og:image:width" content="1200">
      <meta property="og:image:height" content="630">
      <meta property="og:image" content="//cdn.example.com/two.png">
      <meta property="twitter:creator" content="@example">
      <meta name="twitter:image" content="/twitter.png">`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;

  await t.test("inspects repeated images, redirects, Twitter tags, and validation", async () => {
    const result = await getOpenGraph({ url: ` ${base}/redirect ` });
    assert.equal(result.requestedUrl, `${base}/redirect`);
    assert.equal(result.finalUrl, `${base}/nested/article`);
    assert.equal(result.preview.title, "Social & title");
    assert.deepEqual(
      result.metadata.images.map((image) => image.resolvedUrl),
      [`${base}/nested/one.png`, "http://cdn.example.com/two.png", `${base}/twitter.png`],
    );
    assert.equal(result.metadata.images[0].width, 1200);
    assert.equal(result.metadata.images[0].height, 630);
    assert.ok(result.metadata.tags.some((tag) => tag.name === "twitter:creator" && tag.content === "@example"));
    assert.deepEqual(result.validation, { valid: false, issues: ["og:image must be an absolute HTTP or HTTPS URL"] });
    assert.deepEqual(structuredClone(result), result);
    assert.deepEqual(JSON.parse(JSON.stringify(result)).metadata.tags, result.metadata.tags);
  });
  await t.test("keeps fallback text separate from missing required OG tags", async () => {
    const result = await getOpenGraph({ url: `${base}/plain` });
    assert.deepEqual(result.preview, { title: "Page fallback", description: "Page description" });
    assert.deepEqual(result.validation.issues, [
      "Missing og:title",
      "Missing og:type",
      "Missing og:image",
      "Missing og:url",
    ]);
  });
  await t.test("exports JSON, Markdown, and escaped HTML while preserving duplicates", async () => {
    const json = await exportOpenGraph({ url: `${base}/redirect`, format: "json" });
    assert.equal(JSON.parse(json.content).metadata.images.length, 3);
    assert.equal(JSON.parse(json.content).finalUrl, `${base}/nested/article`);
    const markdown = await exportOpenGraph({ url: `${base}/redirect`, format: "markdown" });
    assert.ok(markdown.content.includes("| og:image | ./one.png |\n"));
    assert.ok(markdown.content.includes("| og:image | //cdn.example.com/two.png |"));
    const html = await exportOpenGraph({ url: `${base}/redirect`, format: "html" });
    assert.ok(html.content.includes('<meta property="og:title" content="Social &amp; title">'));
    assert.equal((html.content.match(/property="og:image"/g) ?? []).length, 2);
    assert.ok(html.content.includes('<meta name="twitter:creator" content="@example">'));
    assert.deepEqual(structuredClone(html), html);
  });
  await t.test("propagates URL and HTTP failures instead of returning empty metadata", async () => {
    await assert.rejects(getOpenGraph({ url: "" }), /HTTP or HTTPS URL/);
    await assert.rejects(getOpenGraph({ url: "Which URL would you like me to check?" }), /HTTP or HTTPS URL/);
    await assert.rejects(getOpenGraph({ url: "file:///tmp/page.html" }), /HTTP or HTTPS URL/);
    await assert.rejects(getOpenGraph({ url: `${base}/error` }), /HTTP 503/);
    await assert.rejects(exportOpenGraph({ url: `${base}/error`, format: "json" }), /HTTP 503/);
  });
});
