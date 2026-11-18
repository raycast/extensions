import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fonteditorCore, { createFont } from "fonteditor-core";
import fontverter from "fontverter";
import opentype from "opentype.js";

export type FontFormat = "ttf" | "otf" | "woff" | "woff2" | "eot";
export type OutputFormat = Exclude<FontFormat, "otf">;
export const OUTPUT_FORMATS: readonly OutputFormat[] = ["ttf", "woff", "woff2", "eot"];

export type FontInfo = {
  filePath: string;
  format: FontFormat;
  family: string;
  subfamily: string;
  weight: number;
  style: "normal" | "italic";
  unitsPerEm: number;
  glyphCount: number;
  version: string;
  copyright: string;
  sizeBytes: number;
  outlines: "truetype" | "cff";
};

export type ConversionResult = {
  inputPath: string;
  outputPath: string;
  inputFormat: FontFormat;
  outputFormat: OutputFormat;
  inputBytes: number;
  outputBytes: number;
  warnings: string[];
};

export function getFontFormat(filePath: string): FontFormat {
  const extension = path.extname(filePath).slice(1).toLowerCase();
  switch (extension) {
    case "ttf":
    case "otf":
    case "woff":
    case "woff2":
    case "eot":
      return extension;
    default:
      throw new Error("Select a TTF, OTF, WOFF, WOFF2, or EOT font file.");
  }
}

function resolveFilePath(filePath: string): string {
  if (!filePath || !filePath.trim()) {
    throw new Error("A font file path is required.");
  }
  const expanded = /^~[\\/]/.test(filePath)
    ? path.join(os.homedir(), filePath.slice(2).split(/[\\/]/).join(path.sep))
    : filePath;
  return path.resolve(expanded);
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

function sfntOutlines(buffer: Buffer): FontInfo["outlines"] {
  const signature = buffer.toString("ascii", 0, 4);
  if (signature === "ttcf") {
    throw new Error("Font collections are not supported. Select an individual font file.");
  }
  if (signature === "OTTO") return "cff";
  if (signature === "true" || (buffer.length >= 4 && buffer.readUInt32BE(0) === 0x00010000)) return "truetype";
  throw new Error("The file does not contain a supported OpenType or TrueType font.");
}

export async function loadFont(filePath: string) {
  const resolvedPath = resolveFilePath(filePath);
  const format = getFontFormat(resolvedPath);
  const stats = await fs.stat(resolvedPath);
  if (!stats.isFile()) throw new Error("Select a font file, not a directory.");

  const original = await fs.readFile(resolvedPath);
  const signature = original.toString("ascii", 0, 4);
  let sfnt: Buffer;

  if (format === "woff" || format === "woff2") {
    if (signature !== (format === "woff" ? "wOFF" : "wOF2")) {
      throw new Error(`The file contents do not match its .${format} extension.`);
    }
    sfnt = await fontverter.convert(original, "sfnt", format);
  } else if (format === "eot") {
    if (original.length < 82 || original.readUInt16LE(34) !== 0x504c) {
      throw new Error("The file contents do not match its .eot extension.");
    }
    sfnt = Buffer.from(fonteditorCore.eot2ttf(toArrayBuffer(original)));
  } else {
    const outlines = sfntOutlines(original);
    if (format === "ttf" && outlines !== "truetype") {
      throw new Error("The file contains CFF outlines. Use its original .otf extension.");
    }
    sfnt = original;
  }

  const outlines = sfntOutlines(sfnt);
  let font: opentype.Font;
  try {
    font = opentype.parse(toArrayBuffer(sfnt));
  } catch (error) {
    throw new Error(
      `Could not read the font. Font collections and CFF2 outlines are not supported. ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const family = localizedName(font.names.fontFamily) || path.basename(resolvedPath, path.extname(resolvedPath));
  const subfamily = localizedName(font.names.fontSubfamily) || "Regular";
  const weight = Number(font.tables.os2?.usWeightClass) || 400;
  const italic =
    Boolean(Number(font.tables.os2?.fsSelection) & 1) ||
    Boolean(Number(font.tables.head?.macStyle) & 2) ||
    /italic|oblique/i.test(subfamily);
  const info: FontInfo = {
    filePath: resolvedPath,
    format,
    family,
    subfamily,
    weight,
    style: italic ? "italic" : "normal",
    unitsPerEm: font.unitsPerEm,
    glyphCount: font.glyphs.length,
    version: localizedName(font.names.version) || "Unknown",
    copyright: localizedName(font.names.copyright) || "Unknown",
    sizeBytes: original.length,
    outlines,
  };
  return { filePath: resolvedPath, format, sfnt, font, info };
}

function localizedName(names: opentype.LocalizedName | undefined): string {
  return names?.en || Object.values(names || {})[0] || "";
}

export async function inspectFont(filePath: string): Promise<FontInfo> {
  return (await loadFont(filePath)).info;
}

export async function convertFont(input: {
  filePath: string;
  targetFormat: OutputFormat;
  outputDirectory?: string;
}): Promise<ConversionResult> {
  if (!OUTPUT_FORMATS.includes(input.targetFormat)) {
    throw new Error("Choose TTF, WOFF, WOFF2, or EOT as the output format. OTF is supported as an input only.");
  }
  const loaded = await loadFont(input.filePath);
  if (loaded.format === input.targetFormat) {
    throw new Error(`The selected file is already in ${input.targetFormat.toUpperCase()} format.`);
  }

  const directory = input.outputDirectory ? resolveFilePath(input.outputDirectory) : path.dirname(loaded.filePath);
  const directoryStats = await fs.stat(directory);
  if (!directoryStats.isDirectory()) throw new Error("The output directory must be an existing directory.");
  const outputPath = path.join(
    directory,
    `${path.basename(loaded.filePath, path.extname(loaded.filePath))}.${input.targetFormat}`,
  );
  if (outputPath === loaded.filePath) throw new Error("Conversion cannot replace the source font.");

  const warnings: string[] = [];
  let output: Buffer;
  if (input.targetFormat === "woff" || input.targetFormat === "woff2") {
    output = await fontverter.convert(loaded.sfnt, input.targetFormat, "sfnt");
  } else {
    let ttf = loaded.sfnt;
    if (loaded.info.outlines === "cff") {
      const font = createFont(loaded.sfnt, { type: "otf", hinting: true, kerning: true });
      ttf = Buffer.from(font.write({ type: "ttf", hinting: true, kerning: true }) as ArrayBuffer);
      warnings.push(
        "CFF outlines were converted to TrueType. Curve approximation, hinting, and advanced layout tables may change. Use WOFF or WOFF2 to preserve the original outlines and tables.",
      );
    }
    output = input.targetFormat === "eot" ? Buffer.from(fonteditorCore.ttf2eot(toArrayBuffer(ttf))) : ttf;
  }

  try {
    await fs.writeFile(outputPath, output, { flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error(`The output file already exists. Move or rename it before converting. ${outputPath}`);
    }
    throw error;
  }
  return {
    inputPath: loaded.filePath,
    outputPath,
    inputFormat: loaded.format,
    outputFormat: input.targetFormat,
    inputBytes: loaded.info.sizeBytes,
    outputBytes: output.length,
    warnings,
  };
}

export async function generateFontFaceCss(filePath: string): Promise<string> {
  const info = await inspectFont(filePath);
  const cssFormats: Record<FontFormat, string> = {
    ttf: "truetype",
    otf: "opentype",
    woff: "woff",
    woff2: "woff2",
    eot: "embedded-opentype",
  };
  return `@font-face {
  font-family: '${escapeCssString(info.family)}';
  src: url('${escapeCssString(encodeURIComponent(path.basename(info.filePath)))}') format('${cssFormats[info.format]}');
  font-weight: ${info.weight};
  font-style: ${info.style};
  font-display: swap;
}`;
}

function escapeCssString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/[\n\r\f]/g, (character) => {
      return `\\${character.charCodeAt(0).toString(16)} `;
    });
}
