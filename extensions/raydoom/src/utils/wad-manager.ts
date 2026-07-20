import { environment, showToast, Toast } from "@raycast/api";
import { join } from "path";
import { existsSync, writeFileSync, unlinkSync, statSync } from "fs";

const WAD_URL = "https://distro.ibiblio.org/slitaz/sources/packages/d/doom1.wad";
const WAD_FALLBACK = "https://archive.org/download/DoomsharewareEpisode/doom1.wad";
const WAD_PATH = join(environment.supportPath, "doom1.wad");

// Minimum valid WAD size (doom1.wad shareware is ~4MB, smallest valid WAD ~1MB)
const MIN_WAD_SIZE = 1024 * 1024; // 1MB
const MAX_LUMPS = 10000; // Reasonable upper bound for lump count

/**
 * Validate WAD file buffer for integrity
 * Checks: minimum size, magic header, and header integrity
 * @param buffer ArrayBuffer containing WAD data
 * @throws Error if validation fails
 */
function validateWadBuffer(buffer: ArrayBuffer): void {
  // Check 1: Minimum file size
  if (buffer.byteLength < MIN_WAD_SIZE) {
    const sizeKB = (buffer.byteLength / 1024).toFixed(0);
    throw new Error(`WAD file too small (${sizeKB}KB). Minimum expected: 1MB`);
  }

  // Check 2: Magic header (IWAD or PWAD)
  const headerView = new DataView(buffer, 0, 12);
  const magic = String.fromCharCode(
    headerView.getUint8(0),
    headerView.getUint8(1),
    headerView.getUint8(2),
    headerView.getUint8(3),
  );

  if (magic !== "IWAD" && magic !== "PWAD") {
    throw new Error("Invalid WAD file format (bad header magic)");
  }

  // Check 3: Header integrity - validate numLumps and dirOffset
  // WAD header: 4 bytes magic, 4 bytes numLumps, 4 bytes dirOffset (little-endian)
  const numLumps = headerView.getInt32(4, true);
  const dirOffset = headerView.getInt32(8, true);

  if (numLumps < 0 || numLumps > MAX_LUMPS) {
    throw new Error(`Invalid WAD structure (lump count: ${numLumps})`);
  }

  if (dirOffset < 12 || dirOffset > buffer.byteLength) {
    throw new Error(`Invalid WAD structure (directory offset out of bounds)`);
  }

  // Verify directory table fits within file
  // Each directory entry is 16 bytes (4 offset + 4 size + 8 name)
  const dirTableSize = numLumps * 16;
  if (dirOffset + dirTableSize > buffer.byteLength) {
    throw new Error(`Truncated WAD file (directory table incomplete)`);
  }
}

export async function ensureWadFile(): Promise<boolean> {
  if (existsSync(WAD_PATH)) return true;

  await showToast({
    style: Toast.Style.Animated,
    title: "Downloading DOOM Shareware",
    message: "4MB - First launch only",
  });

  try {
    const response = await fetch(WAD_URL);
    if (!response.ok) throw new Error("Primary download failed");

    const buffer = await response.arrayBuffer();
    validateWadBuffer(buffer); // Validate before saving
    writeFileSync(WAD_PATH, Buffer.from(buffer));

    await showToast({
      style: Toast.Style.Success,
      title: "Download Complete",
      message: "Starting DOOM...",
    });

    return true;
  } catch (error) {
    console.log("Primary download failed, trying fallback:", error);
    try {
      const response = await fetch(WAD_FALLBACK);
      if (!response.ok) throw new Error(`Fallback download failed (HTTP ${response.status})`);
      const buffer = await response.arrayBuffer();
      validateWadBuffer(buffer); // Validate before saving
      writeFileSync(WAD_PATH, Buffer.from(buffer));

      await showToast({
        style: Toast.Style.Success,
        title: "Download Complete",
        message: "Starting DOOM...",
      });

      return true;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_fallbackError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Download Failed",
        message: "Please check your internet connection",
      });

      return false;
    }
  }
}

export function getWadPath(): string {
  return WAD_PATH;
}

export function isWadDownloaded(): boolean {
  return existsSync(WAD_PATH);
}

/**
 * Download WAD from custom URL
 * @param url Custom URL provided by user
 * @returns Success status
 */
export async function downloadWadFromUrl(url: string): Promise<boolean> {
  await showToast({
    style: Toast.Style.Animated,
    title: "Downloading DOOM WAD",
    message: `From: ${new URL(url).hostname}`,
  });

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();

    // Validate WAD file integrity
    validateWadBuffer(buffer);

    writeFileSync(WAD_PATH, Buffer.from(buffer));

    await showToast({
      style: Toast.Style.Success,
      title: "Download Complete",
      message: "WAD file ready!",
    });

    return true;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Download Failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return false;
  }
}

/**
 * Delete existing WAD file
 * Used for re-download functionality
 */
export function deleteWadFile(): boolean {
  try {
    if (existsSync(WAD_PATH)) {
      unlinkSync(WAD_PATH);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Failed to delete WAD file:", error);
    return false;
  }
}

/**
 * Get WAD file size in MB
 */
export function getWadFileSize(): string | null {
  try {
    if (!existsSync(WAD_PATH)) return null;
    const stats = statSync(WAD_PATH);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    return `${sizeMB} MB`;
  } catch {
    return null;
  }
}
