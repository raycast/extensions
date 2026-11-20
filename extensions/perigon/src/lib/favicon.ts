import { environment } from "@raycast/api";
import { createHash } from "crypto";
import { access, mkdir, readFile, rename, writeFile } from "fs/promises";
import { join } from "path";
import { decodePng, encodePng, renderCircularFavicon, renderFaviconStack, type Raster } from "./favicon-image";

export const FAVICON_STACK_LIMIT = 8;
export const FAVICON_DISPLAY_PX = 22;

export interface FaviconImage {
  path: string;
  dataUrl: string;
  width: number;
  height: number;
}

const rasterCache = new Map<string, Promise<Raster | undefined>>();
const imageCache = new Map<string, Promise<FaviconImage | undefined>>();

export function sourceFaviconUrl(domain: string): string {
  const params = new URLSearchParams({
    client: "SOCIAL",
    type: "FAVICON",
    fallback_opts: "TYPE,SIZE,URL",
    url: `https://${domain}`,
    size: "64",
  });
  return `https://t1.gstatic.com/faviconV2?${params.toString()}`;
}

export function faviconMarkdown(image: FaviconImage, alt: string): string {
  const safeAlt = alt
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return `<img src="${image.dataUrl}" alt="${safeAlt}" width="${image.width}" height="${image.height}" align="middle" />`;
}

export function loadCircularFavicon(domain: string): Promise<FaviconImage | undefined> {
  return cachedImage(
    `icon:${environment.appearance}:${domain}`,
    async () => {
      const raster = await loadRaster(domain);
      if (!raster) {
        return undefined;
      }
      return encodePng(renderCircularFavicon(raster, environment.appearance));
    },
    FAVICON_DISPLAY_PX,
  );
}

export function loadFaviconStack(domains: string[]): Promise<FaviconImage | undefined> {
  const shown = domains.slice(0, FAVICON_STACK_LIMIT);
  if (shown.length === 0) {
    return Promise.resolve(undefined);
  }
  return cachedImage(`stack:${environment.appearance}:${shown.join("|")}`, async () => {
    const rasters: Raster[] = [];
    for (const domain of shown) {
      const raster = await loadRaster(domain);
      if (raster) {
        rasters.push(raster);
      }
    }
    if (rasters.length === 0) {
      return undefined;
    }
    return encodePng(renderFaviconStack(rasters, environment.appearance));
  });
}

function cachedImage(
  key: string,
  produce: () => Promise<Buffer | undefined>,
  height = FAVICON_DISPLAY_PX,
): Promise<FaviconImage | undefined> {
  const cached = imageCache.get(key);
  if (cached) {
    return cached;
  }
  const pending = writeImage(key, produce, height);
  imageCache.set(key, pending);
  return pending;
}

async function writeImage(
  key: string,
  produce: () => Promise<Buffer | undefined>,
  height: number,
): Promise<FaviconImage | undefined> {
  const hash = createHash("sha256").update(key).digest("hex").slice(0, 20);
  const directory = join(environment.supportPath, "circular-favicons-v1");
  const filePath = join(directory, `${hash}.png`);
  try {
    let png: Buffer | undefined;
    try {
      await access(filePath);
      png = await readFile(filePath);
    } catch {
      png = await produce();
      if (!png) {
        return undefined;
      }
      await mkdir(directory, { recursive: true });
      const temporary = `${filePath}.tmp`;
      await writeFile(temporary, png);
      await rename(temporary, filePath);
    }
    if (!png) {
      return undefined;
    }
    return {
      path: filePath,
      dataUrl: `data:image/png;base64,${png.toString("base64")}`,
      height,
      width: Math.max(1, Math.round((height * png.readUInt32BE(16)) / png.readUInt32BE(20))),
    };
  } catch {
    return undefined;
  }
}

function loadRaster(domain: string): Promise<Raster | undefined> {
  const cached = rasterCache.get(domain);
  if (cached) {
    return cached;
  }
  const pending = fetchRaster(domain);
  rasterCache.set(domain, pending);
  return pending;
}

async function fetchRaster(domain: string): Promise<Raster | undefined> {
  try {
    const response = await fetch(sourceFaviconUrl(domain));
    if (!response.ok) {
      return undefined;
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > 1_000_000) {
      return undefined;
    }
    return decodePng(bytes);
  } catch {
    return undefined;
  }
}
