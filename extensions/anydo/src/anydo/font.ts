import { readFile } from "fs/promises";
import { extname } from "path";

import type { ReportFont } from "./archive";
import { reportFont, reportFontFile } from "./prefs";

const MIME: Record<string, string> = {
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".otf": "font/otf",
  ".ttf": "font/ttf",
};

/**
 * Raycast does not expose its own fonts, so the *reports* carry the typography. A web font is
 * loaded from a CDN; when the user points at a font file, it is embedded as base64 so that even a
 * font no CDN ships (IRANSansX) is guaranteed to render.
 */
export async function loadReportFont(): Promise<ReportFont> {
  const family = reportFont();
  const path = reportFontFile();
  if (!path) return { family, dataUrl: null, fileName: null };
  try {
    const bytes = await readFile(path);
    const mime = MIME[extname(path).toLowerCase()] ?? "font/ttf";
    return {
      family,
      dataUrl: `data:${mime};base64,${bytes.toString("base64")}`,
      fileName: path.split(/[\\/]/).pop() ?? path,
    };
  } catch {
    return { family, dataUrl: null, fileName: null };
  }
}
