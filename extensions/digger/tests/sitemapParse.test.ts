import assert from "node:assert/strict";
import { test } from "node:test";
import { gzipSync } from "node:zlib";
import { decodeSitemapBody, filterEntries, formatLastmod, pageTitle, parseSitemap } from "../src/utils/sitemapParse.ts";

const URLSET = `<?xml version="1.0" encoding="UTF-8"?>
<!-- generated -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-08-07</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/search?q=a&amp;b=c</loc>
  </url>
  <url>
    <loc><![CDATA[https://example.com/caf%C3%A9]]></loc>
    <image:image><image:loc>https://example.com/i.png</image:loc><image:title>Espresso machine</image:title></image:image>
  </url>
</urlset>`;

const INDEX = `<?xml version="1.0"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://example.com/sitemap-pages.xml</loc><lastmod>2026-01-02T03:04:05Z</lastmod></sitemap>
  <sitemap><loc>https://example.com/sitemap-posts.xml.gz</loc></sitemap>
</sitemapindex>`;

test("a urlset yields its pages with metadata and decoded locs", () => {
  const parsed = parseSitemap(URLSET);
  assert.equal(parsed.kind, "urlset");
  if (parsed.kind !== "urlset") return;
  assert.equal(parsed.pages.length, 3);
  assert.deepEqual(
    parsed.pages.map((p) => p.loc),
    ["https://example.com/", "https://example.com/search?q=a&b=c", "https://example.com/caf%C3%A9"],
  );
  assert.equal(parsed.pages[0].lastmod, "2026-08-07");
  assert.equal(parsed.pages[0].changefreq, "daily");
  assert.equal(parsed.pages[0].priority, "1.0");
  assert.equal(parsed.pages[1].lastmod, undefined);
  assert.equal(parsed.capped, false);
});

test("an image:loc inside a <url> is not mistaken for the page's <loc>", () => {
  const xml = `<urlset><url><image:image><image:loc>https://example.com/i.png</image:loc></image:image><loc>https://example.com/real</loc></url></urlset>`;
  const parsed = parseSitemap(xml);
  assert.equal(parsed.kind, "urlset");
  if (parsed.kind === "urlset") assert.equal(parsed.pages[0].loc, "https://example.com/real");
});

test("full-text search reaches extension fields, not just the loc", () => {
  const parsed = parseSitemap(URLSET);
  if (parsed.kind !== "urlset") throw new Error("expected urlset");
  const { items, total } = filterEntries(parsed.pages, "espresso", 10);
  assert.equal(total, 1);
  assert.equal(items[0].loc, "https://example.com/caf%C3%A9");
});

test("search matches the percent-decoded form of a URL", () => {
  const parsed = parseSitemap(URLSET);
  if (parsed.kind !== "urlset") throw new Error("expected urlset");
  assert.equal(filterEntries(parsed.pages, "café", 10).total, 1);
});

test("search is case-insensitive and every token must match", () => {
  const parsed = parseSitemap(URLSET);
  if (parsed.kind !== "urlset") throw new Error("expected urlset");
  assert.equal(filterEntries(parsed.pages, "EXAMPLE daily", 10).total, 1);
  assert.equal(filterEntries(parsed.pages, "example nothing-here", 10).total, 0);
});

test("search reports the full match count while returning at most `limit` items", () => {
  const xml = `<urlset>${Array.from({ length: 50 }, (_, i) => `<url><loc>https://example.com/p/${i}</loc></url>`).join("")}</urlset>`;
  const parsed = parseSitemap(xml);
  if (parsed.kind !== "urlset") throw new Error("expected urlset");
  const all = filterEntries(parsed.pages, "", 20);
  assert.equal(all.items.length, 20);
  assert.equal(all.total, 50);
  const some = filterEntries(parsed.pages, "/p/1", 5);
  assert.equal(some.total, 11); // 1, 10..19
  assert.equal(some.items.length, 5);
});

test("a sitemap index yields its child sitemaps", () => {
  const parsed = parseSitemap(INDEX);
  assert.equal(parsed.kind, "index");
  if (parsed.kind !== "index") return;
  assert.deepEqual(
    parsed.sitemaps.map((s) => s.loc),
    ["https://example.com/sitemap-pages.xml", "https://example.com/sitemap-posts.xml.gz"],
  );
  assert.equal(parsed.sitemaps[0].lastmod, "2026-01-02T03:04:05Z");
});

test("a namespace-prefixed urlset is parsed, not reported as empty", () => {
  const xml = `<sm:urlset xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9"><sm:url><sm:loc>https://example.com/a</sm:loc></sm:url></sm:urlset>`;
  const parsed = parseSitemap(xml);
  assert.equal(parsed.kind, "urlset");
  if (parsed.kind === "urlset")
    assert.deepEqual(
      parsed.pages.map((p) => p.loc),
      ["https://example.com/a"],
    );
});

test("an HTML app shell is invalid, not an empty sitemap", () => {
  const parsed = parseSitemap("<!doctype html><html><head><title>App</title></head><body></body></html>");
  assert.equal(parsed.kind, "invalid");
});

test("an empty urlset is a valid sitemap with no pages", () => {
  const parsed = parseSitemap(`<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>`);
  assert.equal(parsed.kind, "urlset");
  if (parsed.kind === "urlset") assert.equal(parsed.pages.length, 0);
});

test("a body cut off mid-entry keeps every complete entry", () => {
  const cut = URLSET.slice(0, URLSET.indexOf("<url>", URLSET.indexOf("search?q")) + 12);
  const parsed = parseSitemap(cut);
  assert.equal(parsed.kind, "urlset");
  if (parsed.kind === "urlset") assert.equal(parsed.pages.length, 2);
});

test("the parse limit is reported as capped rather than silently dropping entries", () => {
  const xml = `<urlset>${Array.from({ length: 30 }, (_, i) => `<url><loc>https://example.com/${i}</loc></url>`).join("")}</urlset>`;
  const parsed = parseSitemap(xml, 10);
  if (parsed.kind !== "urlset") throw new Error("expected urlset");
  assert.equal(parsed.pages.length, 10);
  assert.equal(parsed.capped, true);
});

test("a gzipped body is decompressed by its magic bytes, whatever the URL says", () => {
  const { text, truncated } = decodeSitemapBody(gzipSync(Buffer.from(INDEX)), 1024 * 1024, false);
  assert.equal(text, INDEX);
  assert.equal(truncated, false);
});

test("a plain body passes through, and the download cap is carried as truncation", () => {
  const { text, truncated } = decodeSitemapBody(Buffer.from(URLSET), 1024 * 1024, true);
  assert.equal(text, URLSET);
  assert.equal(truncated, true);
});

test("a gzip stream cut short decodes what arrived and is marked truncated", () => {
  const big = `<urlset>${Array.from({ length: 2000 }, (_, i) => `<url><loc>https://example.com/${i}-${Math.random()}</loc></url>`).join("")}</urlset>`;
  const gz = gzipSync(Buffer.from(big));
  const { text, truncated } = decodeSitemapBody(gz.subarray(0, Math.floor(gz.length / 2)), 10 * 1024 * 1024, true);
  assert.equal(truncated, true);
  assert.ok(text.startsWith("<urlset><url>"));
  assert.ok(text.length < big.length);
});

test("a gzip body that inflates past the cap is an error, not a quiet partial", () => {
  const big = Buffer.alloc(2 * 1024 * 1024, "a");
  assert.throws(() => decodeSitemapBody(gzipSync(big), 1024 * 1024, false), /larger than/);
});

test("a date-only lastmod is shown on its own day in every time zone", () => {
  assert.equal(formatLastmod("2026-08-07"), "Aug 7, 2026");
  assert.equal(formatLastmod("not a date"), "not a date");
});

test("page titles are the path, decoded, with the host only when it differs", () => {
  assert.equal(pageTitle("https://example.com/", "example.com"), "/");
  assert.equal(pageTitle("https://example.com/blog/intro", "example.com"), "/blog/intro");
  assert.equal(pageTitle("https://example.com/caf%C3%A9?x=1", "example.com"), "/café?x=1");
  assert.equal(pageTitle("https://cdn.example.com/a", "example.com"), "cdn.example.com/a");
  assert.equal(pageTitle("not a url", "example.com"), "not a url");
});

test("entries inside an XML comment are not entries", () => {
  const xml = `<?xml version="1.0"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/live</loc></url>
  <!-- <url><loc>https://example.com/retired</loc></url> -->
  <url><loc><![CDATA[https://example.com/a?b=<!--c-->]]></loc></url>
</urlset>`;
  const parsed = parseSitemap(xml);
  assert.equal(parsed.kind, "urlset");
  if (parsed.kind !== "urlset") return;
  assert.deepEqual(
    parsed.pages.map((p) => p.loc),
    ["https://example.com/live", "https://example.com/a?b=<!--c-->"],
  );
});

test("a prefixed root with unprefixed entries still finds the entries", () => {
  const xml = `<sm:urlset xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/one</loc><lastmod>2026-01-02</lastmod></url>
</sm:urlset>`;
  const parsed = parseSitemap(xml);
  assert.equal(parsed.kind, "urlset");
  if (parsed.kind !== "urlset") return;
  assert.deepEqual(
    parsed.pages.map((p) => [p.loc, p.lastmod]),
    [["https://example.com/one", "2026-01-02"]],
  );
});

test("a gzip file that ends early on its own is an error, not a complete sitemap", () => {
  const gz = gzipSync(Buffer.from(URLSET.repeat(50)));
  const cut = gz.subarray(0, Math.floor(gz.length / 2));
  assert.throws(() => decodeSitemapBody(cut, 1024 * 1024, false), /decompress/i);
});
