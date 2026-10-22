import assert from "node:assert/strict";
import test from "node:test";
import { deflateSync } from "node:zlib";

import initSqlJs from "sql.js";

import { createFaviconLookup } from "../src/utils/faviconDatabase.ts";
import { isPrivateHostname } from "../src/utils/network.ts";
import { analyzePNG } from "../src/utils/pngAnalysis.ts";

function pngChunk(type: string, data: Buffer) {
  const chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length, 0);
  chunk.write(type, 4, 4, "ascii");
  data.copy(chunk, 8);
  return chunk;
}

function createRGBAFixture(
  width: number,
  height: number,
  pixel: (x: number, y: number) => [number, number, number, number],
) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;

  const rows: Buffer[] = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 4);
    for (let x = 0; x < width; x += 1) {
      const [red, green, blue, alpha] = pixel(x, y);
      row.set([red, green, blue, alpha], 1 + x * 4);
    }
    rows.push(row);
  }

  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(Buffer.concat(rows))),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

test("recognizes favicons that already provide a full background", () => {
  const png = createRGBAFixture(4, 4, () => [20, 120, 220, 255]);
  const analysis = analyzePNG(png);

  assert.equal(analysis?.hasOwnBackground, true);
  assert.ok((analysis?.visibleLuminance ?? 0) > 0);
});

test("selects contrasting tiles for transparent dark and light marks", () => {
  const darkMark = createRGBAFixture(4, 4, (x, y) =>
    x >= 1 && x <= 2 && y >= 1 && y <= 2 ? [0, 0, 0, 255] : [0, 0, 0, 0],
  );
  const lightMark = createRGBAFixture(4, 4, (x, y) =>
    x >= 1 && x <= 2 && y >= 1 && y <= 2 ? [255, 255, 255, 255] : [0, 0, 0, 0],
  );

  assert.deepEqual(analyzePNG(darkMark), { hasOwnBackground: false, visibleLuminance: 0 });
  assert.deepEqual(analyzePNG(lightMark), { hasOwnBackground: false, visibleLuminance: 1 });
});

test("treats malformed PNG data as unsupported instead of aborting all favicon loading", () => {
  const malformed = createRGBAFixture(4, 4, () => [0, 0, 0, 255]);
  const idatOffset = malformed.indexOf("IDAT") + 4;
  malformed.fill(0xff, idatOffset, idatOffset + 8);

  assert.equal(analyzePNG(malformed), undefined);
});

test("recognizes local network hostnames and addresses", () => {
  for (const hostname of [
    "localhost",
    "printer",
    "homeassistant.local",
    "router.home.arpa",
    "169.254.10.2",
    "100.64.10.2",
    "[::1]",
    "[fe80::1]",
    "[fd12:3456::1]",
    "[::ffff:c0a8:101]",
  ]) {
    assert.equal(isPrivateHostname(hostname), true, hostname);
  }

  assert.equal(isPrivateHostname("example.com"), false);
  assert.equal(isPrivateHostname("8.8.8.8"), false);
  assert.equal(isPrivateHostname("[2001:4860:4860::8888]"), false);
});

test("looks up exact favicons before falling back to another page on the same origin", async () => {
  const SQL = await initSqlJs();
  const database = new SQL.Database();
  database.run(`
    CREATE TABLE icon_mapping (page_url LONGVARCHAR NOT NULL, icon_id INTEGER NOT NULL);
    CREATE INDEX icon_mapping_page_url_idx ON icon_mapping(page_url);
    CREATE TABLE favicon_bitmaps (id INTEGER PRIMARY KEY, icon_id INTEGER NOT NULL, image_data BLOB, width INTEGER);
  `);
  database.run("INSERT INTO icon_mapping (page_url, icon_id) VALUES (?, ?), (?, ?)", [
    "https://example.com/exact",
    1,
    "https://example.com/fallback",
    2,
  ]);
  database.run("INSERT INTO favicon_bitmaps (id, icon_id, image_data, width) VALUES (?, ?, ?, ?), (?, ?, ?, ?)", [
    10,
    1,
    new Uint8Array([1]),
    16,
    20,
    2,
    new Uint8Array([2]),
    32,
  ]);

  const lookup = createFaviconLookup(database);
  try {
    assert.equal(lookup.find("https://example.com/exact")?.bitmapId, 10);
    assert.equal(lookup.find("https://example.com/missing")?.bitmapId, 20);
    assert.equal(lookup.find("https://different.example/path"), undefined);
  } finally {
    lookup.close();
    database.close();
  }
});
