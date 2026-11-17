import assert from "node:assert/strict";
import { test } from "node:test";
import { getStoryPubDate, storyParser } from "../src/utils.ts";

const rss = (items: string) =>
  `<?xml version="1.0" encoding="utf-8"?><rss version="2.0"><channel><title>Test</title>${items}</channel></rss>`;

const torrent = (pubDate: string, xmlns = "https://mikanani.me/0.1/") =>
  `<torrent xmlns="${xmlns}"><contentLength>1</contentLength><pubDate>${pubDate}</pubDate></torrent>`;

async function parseItems(xml: string) {
  return (await storyParser.parseString(xml)).items;
}

async function parseDates(items: string, timeZone?: string) {
  return (await parseItems(rss(items))).map((item) => getStoryPubDate(item, timeZone));
}

test("finds a date nested in a non-standard element", async () => {
  const [mikan, other] = await parseDates(
    `<item><title>A</title>${torrent("2026-01-01T12:00:00")}</item>` +
      `<item><title>B</title>${torrent("2026-01-02T12:00:00", "https://example.com/torrent")}</item>`,
  );
  assert.equal(mikan, "2026-01-01T12:00:00");
  assert.equal(other, "2026-01-02T12:00:00");
});

test("reads a date without a zone in the feed's time zone", async () => {
  const [seconds, micros] = await parseDates(
    `<item><title>A</title>${torrent("2026-01-01T12:00:00")}</item>` +
      `<item><title>B</title>${torrent("2026-01-01T00:01:01.169142")}</item>`,
    "Asia/Shanghai",
  );
  assert.equal(seconds, "2026-01-01T04:00:00.000Z");
  assert.equal(micros, "2025-12-31T16:01:01.169Z");
});

test("follows daylight saving time in the feed's time zone", async () => {
  const [winter, summer] = await parseDates(
    `<item><title>A</title>${torrent("2026-01-15T12:00:00")}</item>` +
      `<item><title>B</title>${torrent("2026-07-15T12:00:00")}</item>`,
    "America/New_York",
  );
  assert.equal(winter, "2026-01-15T17:00:00.000Z");
  assert.equal(summer, "2026-07-15T16:00:00.000Z");
});

test("applies the time zone to a standard date without a zone", async () => {
  const [date] = await parseDates(
    `<item><title>A</title><pubDate>Thu, 01 Jan 2026 12:00:00</pubDate></item>`,
    "Asia/Shanghai",
  );
  assert.equal(date, "2026-01-01T04:00:00.000Z");
});

test("keeps dates that already have a zone", async () => {
  const [standard, nested] = await parseDates(
    `<item><title>A</title><pubDate>Thu, 01 Jan 2026 03:00:00 GMT</pubDate>${torrent("2026-01-01T12:00:00")}</item>` +
      `<item><title>B</title>${torrent("2026-01-01T12:00:00Z")}</item>`,
    "Asia/Shanghai",
  );
  assert.equal(standard, "Thu, 01 Jan 2026 03:00:00 GMT");
  assert.equal(nested, "2026-01-01T12:00:00Z");
});

test("prefers the nearest date, then publication over update names", async () => {
  const [nearest, published] = await parseDates(
    `<item><title>A</title><meta><date>2026-01-01T00:00:00Z</date><deeper><pubDate>2026-02-01T00:00:00Z</pubDate></deeper></meta></item>` +
      `<item><title>B</title><meta><updated>2026-03-01T00:00:00Z</updated><published>2026-01-01T00:00:00Z</published></meta></item>`,
  );
  assert.equal(nearest, "2026-01-01T00:00:00Z");
  assert.equal(published, "2026-01-01T00:00:00Z");
});

test("skips nested values that are not dates", async () => {
  const [date] = await parseDates(
    `<item><title>A</title><meta><date>soon</date><info><updated>2026-01-01T00:00:00Z</updated></info></meta></item>`,
  );
  assert.equal(date, "2026-01-01T00:00:00Z");
});

test("keeps Atom entry dates", async () => {
  const [item] = await parseItems(
    `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>T</title>` +
      `<entry><id>1</id><title>A</title><published>2026-01-01T00:00:00Z</published></entry></feed>`,
  );
  assert.equal(getStoryPubDate(item, "Asia/Shanghai"), "2026-01-01T00:00:00.000Z");
});

test("ignores an unknown time zone", async () => {
  const [date] = await parseDates(`<item><title>A</title>${torrent("2026-01-01T12:00:00")}</item>`, "Mars/Olympus");
  assert.equal(date, "2026-01-01T12:00:00");
});

test("returns undefined when an item has no date", async () => {
  const [date] = await parseDates(`<item><title>A</title></item>`);
  assert.equal(date, undefined);
});
