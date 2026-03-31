import { readFile, stat, mkdir, copyFile, rename as fsRename } from "fs/promises";
import https from "https";
import { readdir } from "fs/promises";
import { join, extname } from "path";
import exifReader from "exif-reader";

// File extensions that can contain EXIF GPS data
const EXIF_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".tiff",
  ".tif",
  ".heic",
  ".heif",
  ".dng",
  ".cr2",
  ".nef",
  ".arw",
  ".orf",
  ".rw2",
]);

export type LocationGranularity = "city" | "country" | "state";

export type FileAction = "move" | "copy";

export interface LocationResult {
  fileName: string;
  lat: number | null;
  lon: number | null;
  location: string | null; // resolved location name
}

export interface LocationGroup {
  location: string;
  files: string[];
}

function canHaveExif(fileName: string): boolean {
  return EXIF_EXTENSIONS.has(extname(fileName).toLowerCase());
}

function isHidden(fileName: string): boolean {
  return fileName.startsWith(".");
}

/**
 * Extract GPS coordinates from EXIF data in a JPEG/TIFF file.
 * We manually find the EXIF APP1 marker in JPEGs or the TIFF header directly.
 */
export async function extractGps(filePath: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const buffer = await readFile(filePath);

    let exifBuffer: Buffer | null = null;

    // JPEG: find APP1 marker (0xFFE1) containing "Exif\0\0"
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset < buffer.length - 4) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1];
        const length = buffer.readUInt16BE(offset + 2);

        if (marker === 0xe1) {
          // Check for "Exif\0\0"
          const exifHeader = buffer.slice(offset + 4, offset + 10).toString("ascii");
          if (exifHeader === "Exif\0\0") {
            exifBuffer = buffer.slice(offset + 10, offset + 2 + length);
            break;
          }
        }

        offset += 2 + length;
      }
    }
    // TIFF: starts directly with TIFF header
    else if (
      (buffer[0] === 0x49 && buffer[1] === 0x49) || // little endian
      (buffer[0] === 0x4d && buffer[1] === 0x4d) // big endian
    ) {
      exifBuffer = buffer;
    }

    if (!exifBuffer) return null;

    const exif = exifReader(exifBuffer);

    // exif-reader v2 uses "GPSInfo", older versions use "gps"
    const gps = exif.GPSInfo || exif.gps;
    if (!gps) return null;
    const lat = gps.GPSLatitude;
    const lon = gps.GPSLongitude;
    const latRef = gps.GPSLatitudeRef;
    const lonRef = gps.GPSLongitudeRef;

    if (!lat || !lon) return null;

    // Convert DMS array [degrees, minutes, seconds] to decimal
    let latDec: number;
    let lonDec: number;

    if (Array.isArray(lat)) {
      latDec = lat[0] + lat[1] / 60 + lat[2] / 3600;
    } else {
      latDec = lat as number;
    }

    if (Array.isArray(lon)) {
      lonDec = lon[0] + lon[1] / 60 + lon[2] / 3600;
    } else {
      lonDec = lon as number;
    }

    if (latRef === "S") latDec = -latDec;
    if (lonRef === "W") lonDec = -lonDec;

    return { lat: latDec, lon: lonDec };
  } catch {
    return null;
  }
}

/**
 * Reverse geocode coordinates using OpenStreetMap Nominatim (free, no API key).
 * Respects the 1 request/second rate limit.
 */
function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "Rebaptize-Raycast-Extension/1.0" } }, (res) => {
      let data = "";
      res.on("data", (chunk: Buffer) => {
        data += chunk.toString();
      });
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.setTimeout(10000, () => {
      req.destroy(new Error("Request timeout"));
    });
  });
}

export async function reverseGeocode(lat: number, lon: number, granularity: LocationGranularity): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`;
    const raw = await httpsGet(url);
    const data = JSON.parse(raw) as {
      address?: {
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        county?: string;
        state?: string;
        country?: string;
      };
    };

    const addr = data.address;
    if (!addr) return "Unknown";

    switch (granularity) {
      case "city":
        return addr.city || addr.town || addr.village || addr.municipality || addr.county || "Unknown";
      case "state":
        return addr.state || addr.county || "Unknown";
      case "country":
        return addr.country || "Unknown";
    }
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// Cache to avoid duplicate geocoding for nearby coordinates
const geocodeCache = new Map<string, string>();

function cacheKey(lat: number, lon: number, granularity: LocationGranularity): string {
  // Round to ~1km precision for city, ~10km for state, ~100km for country
  const precision = granularity === "city" ? 2 : granularity === "state" ? 1 : 0;
  return `${lat.toFixed(precision)},${lon.toFixed(precision)},${granularity}`;
}

export async function reverseGeocodeCached(
  lat: number,
  lon: number,
  granularity: LocationGranularity,
): Promise<string> {
  const key = cacheKey(lat, lon, granularity);
  const cached = geocodeCache.get(key);
  if (cached) return cached;

  const result = await reverseGeocode(lat, lon, granularity);
  geocodeCache.set(key, result);
  return result;
}

/**
 * Scan a folder, extract GPS data, and resolve locations.
 */
export async function scanFolder(
  folderPath: string,
  granularity: LocationGranularity,
  onProgress?: (current: number, total: number, fileName: string) => void,
): Promise<LocationResult[]> {
  const entries = await readdir(folderPath);
  const files = entries.filter((f) => !isHidden(f) && canHaveExif(f));
  const results: LocationResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const fileName = files[i];
    onProgress?.(i + 1, files.length, fileName);

    const filePath = join(folderPath, fileName);
    const s = await stat(filePath);
    if (!s.isFile()) continue;

    const gps = await extractGps(filePath);

    if (!gps) {
      results.push({ fileName, lat: null, lon: null, location: null });
      continue;
    }

    const location = await reverseGeocodeCached(gps.lat, gps.lon, granularity);

    // Rate limit: Nominatim requires max 1 req/sec
    await new Promise((r) => setTimeout(r, 1100));

    results.push({ fileName, lat: gps.lat, lon: gps.lon, location });
  }

  return results;
}

/**
 * Group results by location.
 */
export function groupByLocation(results: LocationResult[]): LocationGroup[] {
  const groups = new Map<string, string[]>();

  for (const r of results) {
    const loc = r.location || "No Location Data";
    const existing = groups.get(loc) || [];
    existing.push(r.fileName);
    groups.set(loc, existing);
  }

  return Array.from(groups.entries())
    .map(([location, files]) => ({ location, files }))
    .sort((a, b) => a.location.localeCompare(b.location));
}

/**
 * Organize files into location-named subfolders.
 */
export async function organizeByLocation(
  folderPath: string,
  groups: LocationGroup[],
  action: FileAction,
): Promise<{ count: number; changes: { original: string; renamed: string }[] }> {
  let count = 0;
  const changes: { original: string; renamed: string }[] = [];

  for (const group of groups) {
    const safeName = group.location.replace(/[/\\:*?"<>|]/g, "_").trim();
    const targetDir = join(folderPath, safeName);

    await mkdir(targetDir, { recursive: true });

    for (const fileName of group.files) {
      const src = join(folderPath, fileName);
      const dest = join(targetDir, fileName);

      if (action === "copy") {
        await copyFile(src, dest);
      } else {
        await fsRename(src, dest);
        changes.push({ original: fileName, renamed: join(safeName, fileName) });
      }
      count++;
    }
  }

  return { count, changes };
}
