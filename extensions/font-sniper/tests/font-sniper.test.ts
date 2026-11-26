import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import fonteditor from "fonteditor-core";
import fontverter from "fontverter";
import opentype from "opentype.js";
import { downloadFont } from "../src/utils/downloader";
import { getFontSearchLinks } from "../src/utils/fontActions";
import { extractFonts } from "../src/utils/fontExtractor";
import { loadFontPreview } from "../src/utils/fontPreview";

function createFont() {
  const path = new opentype.Path();
  path.moveTo(0, 0);
  path.lineTo(200, 600);
  path.lineTo(400, 0);
  path.close();
  return new opentype.Font({
    familyName: "Fixture Family",
    styleName: "Regular",
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    glyphs: [
      new opentype.Glyph({
        name: ".notdef",
        advanceWidth: 500,
        path: new opentype.Path(),
      }),
      new opentype.Glyph({
        name: "uniE000",
        unicode: 0xe000,
        advanceWidth: 500,
        path,
      }),
    ],
  }).toArrayBuffer();
}

test("discovered faces render their own outlines across font formats, including embedded and non-Latin subsets", async (t) => {
  const otf = createFont();
  const ttf = fonteditor
    .createFont(otf, { type: "otf" })
    .write({ type: "ttf", toBuffer: false }) as ArrayBuffer;
  const files = {
    ttf: Buffer.from(ttf),
    otf: Buffer.from(otf),
    woff: await fontverter.convert(Buffer.from(ttf), "woff"),
    woff2: await fontverter.convert(Buffer.from(ttf), "woff2"),
    eot: Buffer.from(fonteditor.ttf2eot(ttf)),
  };
  // Font data URLs commonly exceed 10 KB, even for a single face.
  const embedded = Buffer.concat([files.otf, Buffer.alloc(12000)]).toString(
    "base64",
  );
  const css = [
    ...Object.keys(files).map(
      (format) =>
        `@font-face { font-family: "D'Art"; src: url(./face.${format}); }`,
    ),
    `@font-face { font-family: "Embedded"; src: url("data:font/otf;base64,${embedded}") format("opentype"); }`,
    `body { font-family: "D'Art"; }`,
  ].join("\n");
  const server = createServer((request, response) => {
    if (request.url === "/")
      return response.end(
        '<link rel="stylesheet" href="/css/fonts.css"><p style="font-family: Embedded">',
      );
    if (request.url === "/css/fonts.css") return response.end(css);
    const format = request.url?.split(".").pop() as keyof typeof files;
    if (request.headers.referer === page && files[format])
      return response.end(files[format]);
    response.writeHead(403).end();
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());
  const page = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
  const faces = await extractFonts(page);
  assert.equal(faces.length, 6);
  assert.equal(faces.filter((face) => face.family === "D'Art").length, 5);
  for (const face of faces) {
    const preview = await loadFontPreview(face, page);
    assert.equal(preview.family, "Fixture Family");
    assert.equal(preview.glyphCount, 2);
    const svg = Buffer.from(preview.image.split(",")[1], "base64").toString();
    assert.match(svg, /<path d="M[^"]+L[^"]+"/);
  }

  const woff = faces.find((face) => face.format === "woff2")!;
  const directory = await mkdtemp(join(tmpdir(), "font-sniper-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const results = await Promise.all(
    [1, 2].map(() =>
      downloadFont(woff, directory, { pageUrl: page, convertWoff2ToTtf: true }),
    ),
  );
  assert.equal(new Set(results.map((result) => result.filePath)).size, 2);
  for (const result of results) {
    assert.ok(result.success, result.error);
    assert.match(result.filePath!, /\.ttf$/);
    assert.equal((await readFile(result.filePath!)).readUInt32BE(), 0x00010000);
  }
});

test("family searches preserve punctuation and Unicode as a single query", () => {
  const family = "B&R #1 + É";
  const links = getFontSearchLinks(family);
  assert.equal(new URL(links.googleFonts).searchParams.get("query"), family);
  assert.equal(new URL(links.web).searchParams.get("q"), family + " font");
  assert.throws(() => getFontSearchLinks("  "), /family name/);
});
