import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { after, before, test } from "node:test";
import ts from "typescript";
import opentype from "opentype.js";
import fontverter from "fontverter";
import fonteditor from "fonteditor-core";

const require = createRequire(import.meta.url);

require.extensions[".ts"] = (module, filename) => {
  const source = readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(compiled.outputText, filename);
};

const { convertFont, generateFontFaceCss, inspectFont, loadFont } = require("../src/lib/fonts.ts");
const sources = [];
let directory;
let cff;
let truetype;

function arrayBuffer(buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function parse(buffer) {
  return opentype.parse(arrayBuffer(buffer));
}

function table(buffer, tag) {
  const count = buffer.readUInt16BE(4);
  for (let index = 0; index < count; index++) {
    const record = 12 + index * 16;
    if (buffer.toString("ascii", record, record + 4) === tag) {
      const offset = buffer.readUInt32BE(record + 8);
      const length = buffer.readUInt32BE(record + 12);
      return buffer.subarray(offset, offset + length);
    }
  }
  throw new Error(`Missing ${tag} table`);
}

function createCffFixture() {
  const outline = new opentype.Path();
  outline.moveTo(20, 0);
  outline.lineTo(250, 700);
  outline.curveTo(300, 750, 370, 730, 430, 680);
  outline.lineTo(600, 0);
  outline.close();
  const glyphs = [
    new opentype.Glyph({ name: ".notdef", advanceWidth: 600, path: new opentype.Path() }),
    new opentype.Glyph({ name: "A", unicode: 65, advanceWidth: 650, path: outline }),
    new opentype.Glyph({ name: "f", unicode: 102, advanceWidth: 350, path: outline }),
    new opentype.Glyph({ name: "i", unicode: 105, advanceWidth: 200, path: outline }),
    new opentype.Glyph({ name: "fi", unicode: 64257, advanceWidth: 520, path: outline }),
  ];
  const font = new opentype.Font({
    familyName: "Fixture ' Family\\Name",
    styleName: "Bold Italic",
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    glyphs,
  });
  font.tables.os2.usWeightClass = 700;
  font.tables.os2.fsSelection = 1;
  font.substitution.addLigature("liga", { sub: [2, 3], by: 4 });
  return Buffer.from(font.toArrayBuffer());
}

before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), "font-converter-test-"));
  cff = createCffFixture();
  truetype = await fs.readFile(require.resolve("fontverter/testdata/Roboto-400.ttf"));
  for (const [kind, sfnt] of [
    ["cff", cff],
    ["truetype", truetype],
  ]) {
    for (const format of [kind === "cff" ? "otf" : "ttf", "woff", "woff2"]) {
      const buffer = format === "woff" || format === "woff2" ? await fontverter.convert(sfnt, format) : sfnt;
      const filePath = path.join(directory, `${kind}.${format}`);
      await fs.writeFile(filePath, buffer);
      sources.push({ kind, format, filePath, sfnt });
    }
  }
  const filePath = path.join(directory, "truetype.eot");
  await fs.writeFile(filePath, Buffer.from(fonteditor.ttf2eot(arrayBuffer(truetype))));
  sources.push({ kind: "truetype", format: "eot", filePath, sfnt: truetype });
});

after(async () => {
  if (directory) await fs.rm(directory, { recursive: true, force: true });
});

test("every source format loads for metadata and glyph preview", async () => {
  for (const source of sources) {
    const loaded = await loadFont(source.filePath);
    const info = await inspectFont(source.filePath);
    const original = parse(source.sfnt);
    const sample = source.kind === "cff" ? "A" : "D";
    assert.equal(info.format, source.format);
    assert.equal(info.outlines, source.kind);
    assert.equal(info.glyphCount, original.glyphs.length);
    assert.equal(info.unitsPerEm, original.unitsPerEm);
    assert.equal(info.family, original.getEnglishName("fontFamily"));
    assert.equal(loaded.font.charToGlyph(sample).advanceWidth, original.charToGlyph(sample).advanceWidth);
    assert.ok(loaded.font.getPath(sample, 0, 50, 48).commands.length > 0);
    assert.deepEqual(JSON.parse(JSON.stringify(info)), info);
    assert.deepEqual(structuredClone(info), info);
  }
});

test("all supported source-to-target conversions produce readable fonts", async (t) => {
  for (const source of sources) {
    for (const targetFormat of ["ttf", "woff", "woff2", "eot"]) {
      if (source.format === targetFormat) continue;
      await t.test(`${source.kind} ${source.format} to ${targetFormat}`, async () => {
        const outputDirectory = await fs.mkdtemp(path.join(directory, "output-"));
        const result = await convertFont({ filePath: source.filePath, targetFormat, outputDirectory });
        const saved = await fs.readFile(result.outputPath);
        const loaded = await loadFont(result.outputPath);
        const original = parse(source.sfnt);
        const sample = source.kind === "cff" ? "A" : "D";
        assert.equal(result.inputPath, source.filePath);
        assert.equal(result.inputFormat, source.format);
        assert.equal(result.outputFormat, targetFormat);
        assert.equal(path.extname(result.outputPath), `.${targetFormat}`);
        assert.equal(path.dirname(result.outputPath), outputDirectory);
        assert.equal(result.inputBytes, (await fs.stat(source.filePath)).size);
        assert.equal(result.outputBytes, saved.length);
        assert.equal(loaded.info.glyphCount, original.glyphs.length);
        assert.equal(loaded.info.unitsPerEm, original.unitsPerEm);
        assert.equal(loaded.info.family, original.getEnglishName("fontFamily"));
        assert.equal(loaded.font.charToGlyph(sample).unicode, sample.codePointAt(0));
        assert.equal(loaded.font.charToGlyph(sample).advanceWidth, original.charToGlyph(sample).advanceWidth);
        const expectedBounds = original.charToGlyph(sample).getBoundingBox();
        const actualBounds = loaded.font.charToGlyph(sample).getBoundingBox();
        for (const key of ["x1", "x2", "y1", "y2"]) {
          assert.ok(Math.abs(expectedBounds[key] - actualBounds[key]) <= 5, `${key} outline bounds changed`);
        }
        if (source.kind === "cff" && (targetFormat === "ttf" || targetFormat === "eot")) {
          assert.equal(loaded.info.outlines, "truetype");
          assert.ok(result.warnings.length > 0);
        } else {
          assert.equal(loaded.info.outlines, source.kind);
          assert.deepEqual(result.warnings, []);
        }
        assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
        assert.deepEqual(structuredClone(result), result);
      });
    }
  }
});

test("web conversion preserves CFF outlines and layout tables", async () => {
  const source = sources.find((item) => item.format === "otf");
  for (const targetFormat of ["woff", "woff2"]) {
    const outputDirectory = await fs.mkdtemp(path.join(directory, "preserved-"));
    const result = await convertFont({ filePath: source.filePath, targetFormat, outputDirectory });
    const { sfnt, font } = await loadFont(result.outputPath);
    assert.equal(sfnt.toString("ascii", 0, 4), "OTTO");
    for (const tag of ["CFF ", "GSUB", "name", "cmap", "hmtx"]) {
      assert.deepEqual(table(sfnt, tag), table(cff, tag), `${tag} table changed`);
    }
    assert.equal(font.stringToGlyphs("fi").length, 1);
    assert.equal(font.stringToGlyphs("fi")[0].unicode, 64257);
  }
});

test("TrueType web conversion preserves layout tables and outline flavor", async () => {
  const source = sources.find((item) => item.format === "ttf");
  for (const targetFormat of ["woff", "woff2"]) {
    const outputDirectory = await fs.mkdtemp(path.join(directory, "truetype-preserved-"));
    const result = await convertFont({ filePath: source.filePath, targetFormat, outputDirectory });
    const { sfnt, info } = await loadFont(result.outputPath);
    assert.equal(info.outlines, "truetype");
    for (const tag of ["GSUB", "GPOS", "name", "cmap", "hmtx"]) {
      assert.deepEqual(table(sfnt, tag), table(truetype, tag), `${tag} table changed`);
    }
  }
});

test("CSS uses standard format descriptors and escapes family and file names", async () => {
  const descriptors = { ttf: "truetype", otf: "opentype", woff: "woff", woff2: "woff2", eot: "embedded-opentype" };
  for (const source of sources) {
    const css = await generateFontFaceCss(source.filePath);
    assert.ok(css.includes(`format('${descriptors[source.format]}')`));
    assert.ok(css.includes("font-display: swap;"));
    if (source.kind === "cff") {
      assert.ok(css.includes("font-weight: 700;"));
      assert.ok(css.includes("font-style: italic;"));
      assert.ok(css.includes("Fixture \\' Family\\\\Name"));
    }
  }
  const filePath = path.join(directory, "font's.otf");
  await fs.writeFile(filePath, cff);
  assert.ok((await generateFontFaceCss(filePath)).includes("url('font\\'s.otf')"));
  const urlSensitivePath = path.join(directory, "font #1%.otf");
  await fs.writeFile(urlSensitivePath, cff);
  const encodedName = "font%20%231%25.otf";
  assert.ok((await generateFontFaceCss(urlSensitivePath)).includes(`url('${encodedName}')`));
  const url = new URL(encodedName, "https://example.test/fonts/");
  assert.equal(decodeURIComponent(url.pathname), "/fonts/font #1%.otf");
  assert.equal(url.hash, "");
});

test("uppercase font extensions and TrueType outlines in OTF files work", async () => {
  const uppercase = path.join(directory, "uppercase.OTF");
  await fs.writeFile(uppercase, cff);
  assert.equal((await inspectFont(uppercase)).outlines, "cff");
  const compatible = path.join(directory, "truetype-outlines.otf");
  await fs.writeFile(compatible, truetype);
  assert.equal((await inspectFont(compatible)).outlines, "truetype");
});

test("invalid inputs fail before any font is saved", async () => {
  await assert.rejects(inspectFont(path.join(directory, "missing.otf")));
  await assert.rejects(inspectFont(directory), /file|format/i);
  const unsupported = path.join(directory, "font.svg");
  await fs.writeFile(unsupported, cff);
  await assert.rejects(inspectFont(unsupported), /support|format|font file/i);
  const corrupt = path.join(directory, "corrupt.woff2");
  await fs.writeFile(corrupt, Buffer.from("not a font"));
  await assert.rejects(inspectFont(corrupt));
  const mislabeled = path.join(directory, "cff-mislabeled.ttf");
  await fs.writeFile(mislabeled, cff);
  await assert.rejects(inspectFont(mislabeled), /format|match|signature|TrueType|CFF/i);
  const source = sources.find((item) => item.format === "otf");
  await assert.rejects(convertFont({ filePath: source.filePath, targetFormat: "svg" }), /support|format/i);
});

test("source files and existing destination files survive rejected conversions", async () => {
  const source = sources.find((item) => item.format === "ttf");
  await assert.rejects(convertFont({ filePath: source.filePath, targetFormat: "ttf" }));
  assert.deepEqual(await fs.readFile(source.filePath), truetype);
  const outputDirectory = await fs.mkdtemp(path.join(directory, "collision-"));
  const destination = path.join(outputDirectory, "truetype.woff2");
  const sentinel = Buffer.from("existing font");
  await fs.writeFile(destination, sentinel);
  await assert.rejects(convertFont({ filePath: source.filePath, targetFormat: "woff2", outputDirectory }));
  assert.deepEqual(await fs.readFile(destination), sentinel);
  assert.deepEqual(await fs.readFile(source.filePath), truetype);
});

test("concurrent conversions exclusively create one destination", async () => {
  const source = sources.find((item) => item.format === "otf");
  const outputDirectory = await fs.mkdtemp(path.join(directory, "concurrent-"));
  const input = { filePath: source.filePath, targetFormat: "woff2", outputDirectory };
  const results = await Promise.allSettled([convertFont(input), convertFont(input)]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  const loaded = await loadFont(results.find((result) => result.status === "fulfilled").value.outputPath);
  assert.equal(loaded.info.outlines, "cff");
});

test("AI adapters use actual conversion and return serializable metadata and CSS", async () => {
  const inspectTool = require("../src/tools/inspect-font.ts").default;
  const cssTool = require("../src/tools/generate-font-face-css.ts").default;
  const convertTool = require("../src/tools/convert-font.ts").default;
  const source = sources.find((item) => item.format === "otf");
  const outputDirectory = await fs.mkdtemp(path.join(directory, "ai-"));
  const info = await inspectTool({ filePath: source.filePath });
  const cssResult = await cssTool({ filePath: source.filePath });
  const saved = await convertTool({ filePath: source.filePath, targetFormat: "woff2", outputDirectory });
  assert.equal(info.family, "Fixture ' Family\\Name");
  const css = typeof cssResult === "string" ? cssResult : cssResult.css;
  assert.ok(css.includes("format('opentype')"));
  assert.equal((await inspectFont(saved.outputPath)).outlines, "cff");
  for (const result of [info, cssResult, saved]) {
    assert.deepEqual(structuredClone(result), result);
    assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
  }
});
