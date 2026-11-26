import { promises as fs } from "fs";
import { homedir } from "os";
import { join } from "path";
import { FontInfo, DownloadResult } from "../types";
import { sanitizeFilename } from "./urlHelpers";
import fontverter from "fontverter";

import { readFontData } from "./fontData";

function getExtension(format: string): string {
  switch (format) {
    case "woff2":
      return ".woff2";
    case "woff":
      return ".woff";
    case "ttf":
      return ".ttf";
    case "otf":
      return ".otf";
    case "eot":
      return ".eot";
    default:
      return ".font";
  }
}

// Detect if SFNT font data is OTF (CFF) or TTF based on the file signature
function detectSfntFormat(data: Uint8Array): "otf" | "ttf" {
  // OTF with CFF outlines starts with "OTTO"
  if (
    data[0] === 0x4f &&
    data[1] === 0x54 &&
    data[2] === 0x54 &&
    data[3] === 0x4f
  ) {
    return "otf";
  }
  // TTF starts with 0x00 0x01 0x00 0x00 or "true"
  return "ttf";
}

function generateFilename(font: FontInfo): string {
  const parts = [font.family];
  if (font.weight && font.weight !== "Regular") {
    parts.push(font.weight);
  }
  if (font.style) {
    parts.push(font.style.charAt(0).toUpperCase() + font.style.slice(1));
  }
  const baseName = sanitizeFilename(parts.join("-"));
  const extension = getExtension(font.format);
  return `${baseName}${extension}`;
}

async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

export function getDownloadFolder(): string {
  return join(homedir(), "Downloads");
}

export interface DownloadOptions {
  convertWoff2ToTtf?: boolean;
  pageUrl?: string;
}

export async function downloadFont(
  font: FontInfo,
  destFolder: string = getDownloadFolder(),
  options: DownloadOptions = {},
): Promise<DownloadResult> {
  try {
    await ensureDirectory(destFolder);

    // Determine if we should convert WOFF/WOFF2 to desktop format
    const isWebFont = font.format === "woff2" || font.format === "woff";
    const shouldConvert = options.convertWoff2ToTtf && isWebFont;

    let data = await readFontData(font, options.pageUrl);

    // Convert WOFF/WOFF2 to desktop format if enabled
    let outputFormat = font.format;
    if (shouldConvert) {
      try {
        const convertedBuffer = await fontverter.convert(data, "sfnt");
        data = convertedBuffer;
        // Detect actual format (OTF or TTF) from the converted data
        outputFormat = detectSfntFormat(data);
      } catch (conversionError) {
        throw new Error(
          `${font.format.toUpperCase()} conversion failed: ${conversionError instanceof Error ? conversionError.message : "Unknown conversion error"}`,
        );
      }
    }

    // Generate filename with the actual output format
    const fontForFilename = shouldConvert
      ? { ...font, format: outputFormat as "ttf" | "otf" }
      : font;
    const filename = generateFilename(fontForFilename);
    let filePath = join(destFolder, filename);

    // Handle filename conflicts by adding a number suffix
    const ext = getExtension(outputFormat);
    const baseNameWithoutExt = filename.replace(/\.[^.]+$/, "");
    let counter = 1;
    while (true) {
      try {
        await fs.writeFile(filePath, data, { flag: "wx" });
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        filePath = join(destFolder, `${baseNameWithoutExt}_${counter++}${ext}`);
      }
    }

    return {
      font,
      success: true,
      filePath,
    };
  } catch (error) {
    return {
      font,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function downloadFonts(
  fonts: FontInfo[],
  destFolder: string = getDownloadFolder(),
  onProgress?: (completed: number, total: number) => void,
  options: DownloadOptions = {},
): Promise<DownloadResult[]> {
  const results: DownloadResult[] = [];
  const total = fonts.length;

  for (let i = 0; i < fonts.length; i++) {
    const result = await downloadFont(fonts[i], destFolder, options);
    results.push(result);
    onProgress?.(i + 1, total);
  }

  return results;
}
