import assert from "node:assert/strict";
import { test } from "node:test";
import { getStoryPubDate, storyParser } from "../src/utils.ts";

function feed(items: string) {
  return `<?xml version="1.0" encoding="utf-8"?><rss version="2.0"><channel><title>Test</title>${items}</channel></rss>`;
}

function torrent(pubDate: string, xmlns = "https://mikanani.me/0.1/") {
  return `<torrent xmlns="${xmlns}"><contentLength>1</contentLength><pubDate>${pubDate}</pubDate></torrent>`;
}

async function parseDates(items: string) {
  const parsed = await storyParser.parseString(feed(items));
  return parsed.items.map(getStoryPubDate);
}

test("reads a Mikan torrent date without an offset as UTC+8", async () => {
  const [seconds, micros] = await parseDates(
    `<item><title>A</title>${torrent("2026-01-01T12:00:00")}</item>` +
      `<item><title>B</title>${torrent("2026-01-01T00:01:01.169142")}</item>`,
  );
  assert.equal(seconds, "2026-01-01T12:00:00+08:00");
  assert.equal(new Date(seconds!).toISOString(), "2026-01-01T04:00:00.000Z");
  assert.equal(new Date(micros!).toISOString(), "2025-12-31T16:01:01.169Z");
});

test("prefers the item's own pubDate", async () => {
  const [date] = await parseDates(
    `<item><title>A</title><pubDate>Thu, 01 Jan 2026 03:00:00 GMT</pubDate>${torrent("2026-01-01T12:00:00")}</item>`,
  );
  assert.equal(date, "Thu, 01 Jan 2026 03:00:00 GMT");
});

test("keeps a torrent date that already has an offset", async () => {
  const [date] = await parseDates(`<item><title>A</title>${torrent("2026-01-01T12:00:00Z")}</item>`);
  assert.equal(date, "2026-01-01T12:00:00Z");
});

test("adds no offset to torrent dates from other namespaces", async () => {
  const [date] = await parseDates(
    `<item><title>A</title>${torrent("2026-01-01T12:00:00", "https://example.com/torrent")}</item>`,
  );
  assert.equal(date, "2026-01-01T12:00:00");
});

test("returns undefined when an item has no date", async () => {
  const [date] = await parseDates(`<item><title>A</title></item>`);
  assert.equal(date, undefined);
});
