import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { create } from "fontkit";
import { createTextMeasurer, FONT_FILES } from "../src/lib/typography";

test("loads the actual text faces and emoji fallback used for rendering", async () => {
  const fonts = await Promise.all(
    FONT_FILES.map((file) => readFile(path.join(process.cwd(), "assets", "fonts", file))),
  );
  const names = fonts.map((buffer) => {
    const font = create(buffer);
    assert.ok("familyName" in font);
    return font.familyName;
  });
  assert.deepEqual(names, [...Array(4).fill("Inter"), ...Array(4).fill("IBM Plex Mono"), "Noto Emoji"]);
});

test("measures emoji and joined sequences with fallback metrics in every text style", async () => {
  const buffers = await Promise.all(
    FONT_FILES.map((file) => readFile(path.join(process.cwd(), "assets", "fonts", file))),
  );
  const measurer = createTextMeasurer(buffers);
  const emoji = create(buffers.at(-1)!);
  assert.ok("layout" in emoji);
  for (const label of ["🥚", "🐟", "🐸", "👩🏽‍💻", "🇮🇳"]) {
    const glyphs = emoji.layout(label);
    assert.equal(glyphs.glyphs.length, 1, `${label} is a single combined glyph`);
    assert.notEqual(glyphs.glyphs[0].id, 0, `${label} has a real glyph`);
    const width = (glyphs.advanceWidth * 16) / emoji.unitsPerEm;
    for (let style = 0; style < 8; style++) {
      assert.equal(measurer.width(label, 16, style), width);
      assert.equal(measurer.width(`${label} Eggs`, 16, style), width + measurer.width(" Eggs", 16, style));
    }
  }
});

test("measures glyph advances, kerning, weights, and monospace using the bundled fonts", async () => {
  const fonts = await Promise.all(
    FONT_FILES.map((file) => readFile(path.join(process.cwd(), "assets", "fonts", file))),
  );
  const measurer = createTextMeasurer(fonts);
  assert.ok(measurer.width("WWW", 16, 0) > measurer.width("iii", 16, 0));
  assert.ok(measurer.width("AV", 16, 0) < measurer.width("A", 16, 0) + measurer.width("V", 16, 0));
  assert.ok(measurer.width("Workflow", 16, 1) > measurer.width("Workflow", 16, 0));
  assert.equal(measurer.width("WWW", 16, 4), measurer.width("iii", 16, 4));
  assert.equal(measurer.width("Mermaid", 32, 0), measurer.width("Mermaid", 16, 0) * 2);
  assert.equal(measurer.width("", 16, 0), 0);
  for (let style = 0; style < 8; style++) {
    assert.ok(Number.isFinite(measurer.width("Café → office AVATAR", 16, style)));
  }
});
