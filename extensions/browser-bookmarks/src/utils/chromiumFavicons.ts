import { createHash } from "crypto";
import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { environment } from "@raycast/api";
import initSqlJs from "sql.js";

import { createFaviconLookup } from "./faviconDatabase";
import { analyzePNG } from "./pngAnalysis";

type FaviconBookmark = {
  url: string;
};

function createFaviconTile(imageData: Uint8Array, backgroundColor: string) {
  const embeddedPNG = Buffer.from(imageData).toString("base64");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <rect x="1" y="1" width="62" height="62" rx="14" fill="${backgroundColor}"/>
      <rect x="1" y="1" width="62" height="62" rx="14" fill="none" stroke="#7D8797" stroke-opacity="0.42" stroke-width="2"/>
      <image href="data:image/png;base64,${embeddedPNG}" x="7" y="7" width="50" height="50" preserveAspectRatio="xMidYMid meet"/>
    </svg>
  `.trim();
}

async function cacheFaviconTile(browserBundleId: string, bitmapId: number, imageData: Uint8Array) {
  const contentHash = createHash("sha256").update(imageData).digest("hex").slice(0, 16);
  const browserHash = createHash("sha256").update(browserBundleId).digest("hex").slice(0, 12);
  const cacheDirectory = join(environment.supportPath, "adaptive-favicons-v2", browserHash);
  const analysis = analyzePNG(imageData);
  if (!analysis) return undefined;

  const hasOwnBackground = analysis.hasOwnBackground;
  const extension = hasOwnBackground ? "png" : "svg";
  const cachePath = join(cacheDirectory, `${bitmapId}-${contentHash}.${extension}`);

  if (!existsSync(cachePath)) {
    await mkdir(cacheDirectory, { recursive: true });
    if (hasOwnBackground) {
      await writeFile(cachePath, imageData);
    } else {
      const backgroundColor = analysis.visibleLuminance <= 0.18 ? "#F4F4F5" : "#25262B";
      await writeFile(cachePath, createFaviconTile(imageData, backgroundColor), "utf8");
    }
  }

  return cachePath;
}

export async function loadChromiumFavicons(
  browserDataPath: string,
  profile: string,
  browserBundleId: string,
  bookmarks: FaviconBookmark[],
) {
  const faviconDatabasePath = join(browserDataPath, profile, "Favicons");
  if (!existsSync(faviconDatabasePath) || bookmarks.length === 0) {
    return {};
  }

  const [databaseBuffer, wasmBinaryBuffer] = await Promise.all([
    readFile(faviconDatabasePath),
    readFile(join(environment.assetsPath, "sql-wasm.wasm")),
  ]);
  const SQL = await initSqlJs({ wasmBinary: new Uint8Array(wasmBinaryBuffer).buffer as ArrayBuffer });
  const database = new SQL.Database(new Uint8Array(databaseBuffer));
  const favicons: Record<string, string> = {};

  try {
    const faviconLookup = createFaviconLookup(database);

    try {
      for (const url of new Set(bookmarks.map((bookmark) => bookmark.url))) {
        let row;
        try {
          row = faviconLookup.find(url);
        } catch {
          continue;
        }

        if (typeof row?.bitmapId === "number" && row.imageData instanceof Uint8Array) {
          const favicon = await cacheFaviconTile(browserBundleId, row.bitmapId, row.imageData);
          if (favicon) favicons[url] = favicon;
        }
      }
    } finally {
      faviconLookup.close();
    }
  } finally {
    database.close();
  }

  return favicons;
}
