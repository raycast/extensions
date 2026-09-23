import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  buildFaviconIndex,
  faviconForUrl,
  loadFaviconRows,
  pngDataUriFromHex,
  type FaviconRow,
} from "../src/lib/favicons";

const pngA = "89504E470D0A1A0A0102030449454E44AE426082";
const pngB = "89504E470D0A1A0A0506070849454E44AE426082";
const pngC = "89504E470D0A1A0A090A0B0C49454E44AE426082";

function row(overrides: Partial<FaviconRow> = {}): FaviconRow {
  return {
    pageUrl: "https://example.com/docs",
    imageHex: pngA,
    width: 16,
    height: 16,
    lastUpdated: "1",
    ...overrides,
  };
}

test("converts valid PNG hex and rejects malformed image data", () => {
  assert.equal(
    pngDataUriFromHex(pngA),
    `data:image/png;base64,${Buffer.from(pngA, "hex").toString("base64")}`,
  );
  assert.equal(pngDataUriFromHex(""), undefined);
  assert.equal(pngDataUriFromHex("FFD8FFE0"), undefined);
  assert.equal(pngDataUriFromHex("89504E470D0A1A0A0"), undefined);
});

test("prefers the largest bitmap and then the newest equally sized bitmap", () => {
  const index = buildFaviconIndex([
    row({ imageHex: pngA, width: 16, height: 16, lastUpdated: "300" }),
    row({ imageHex: pngB, width: 32, height: 32, lastUpdated: "100" }),
    row({ imageHex: pngC, width: 32, height: 32, lastUpdated: "200" }),
  ]);

  assert.equal(faviconForUrl(index, "https://example.com/docs"), pngDataUriFromHex(pngC));
});

test("uses an exact URL before falling back to the best icon for its origin", () => {
  const index = buildFaviconIndex([
    row({ pageUrl: "https://example.com/account", imageHex: pngA, lastUpdated: "1" }),
    row({ pageUrl: "https://example.com/other", imageHex: pngB, lastUpdated: "2" }),
  ]);

  assert.equal(faviconForUrl(index, "https://example.com/account"), pngDataUriFromHex(pngA));
  assert.equal(faviconForUrl(index, "https://example.com/missing"), pngDataUriFromHex(pngB));
});

test("keeps schemes and non-default ports isolated", () => {
  const index = buildFaviconIndex([
    row({ pageUrl: "https://example.com/", imageHex: pngA }),
    row({ pageUrl: "http://example.com/", imageHex: pngB }),
    row({ pageUrl: "https://example.com:8443/", imageHex: pngC }),
  ]);

  assert.equal(faviconForUrl(index, "https://example.com/new"), pngDataUriFromHex(pngA));
  assert.equal(faviconForUrl(index, "http://example.com/new"), pngDataUriFromHex(pngB));
  assert.equal(faviconForUrl(index, "https://example.com:8443/new"), pngDataUriFromHex(pngC));
  assert.equal(faviconForUrl(index, "not a URL"), undefined);
});

test("loads favicon rows from an immutable read-only Chromium database", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ego-favicons-"));
  const databasePath = join(directory, "Favicons");
  const database = new DatabaseSync(databasePath);
  database.exec(`
    CREATE TABLE icon_mapping(id INTEGER PRIMARY KEY, page_url TEXT NOT NULL, icon_id INTEGER NOT NULL);
    CREATE TABLE favicon_bitmaps(
      id INTEGER PRIMARY KEY,
      icon_id INTEGER NOT NULL,
      last_updated INTEGER DEFAULT 0,
      image_data BLOB,
      width INTEGER DEFAULT 0,
      height INTEGER DEFAULT 0
    );
  `);
  database.prepare("INSERT INTO icon_mapping(page_url, icon_id) VALUES (?, ?)").run("https://example.com/", 7);
  database.exec(`
    INSERT INTO favicon_bitmaps(icon_id, last_updated, image_data, width, height)
    VALUES (7, 13429853725564777, X'${pngA}', 32, 32);
  `);
  database.close();

  assert.deepEqual(await loadFaviconRows(databasePath), [
    {
      pageUrl: "https://example.com/",
      imageHex: pngA,
      width: 32,
      height: 32,
      lastUpdated: "13429853725564777",
    },
  ]);
  assert.deepEqual(await loadFaviconRows(join(directory, "missing")), []);
});
