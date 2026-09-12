/**
 * FIRE chart export utilities — file I/O for SVG charts.
 *
 * Provides functions to:
 *   - Write SVG content to a temporary file (for "Open Chart" action)
 *   - Save SVG content to the user's Downloads folder (for "Download" action)
 *
 * All functions are async and return the written file path on success.
 * Uses Node.js `fs/promises` + `os` for file operations — no Raycast
 * imports so this module stays testable and side-effect-free except for
 * actual file writes.
 *
 * @module fire-chart-export
 */

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir, homedir } from "os";

// ──────────────────────────────────────────
// Constants
// ──────────────────────────────────────────

/** Subdirectory inside the OS temp folder for FIRE chart exports */
const TEMP_SUBDIR = "raycast-fire-charts";

/** Downloads folder path */
const DOWNLOADS_DIR = join(homedir(), "Downloads");

// ──────────────────────────────────────────
// Temp File (for "Open Chart" action)
// ──────────────────────────────────────────

/**
 * Writes an SVG string to a temporary file and returns its path.
 *
 * The file is placed in a dedicated subdirectory of the OS temp folder
 * (`$TMPDIR/raycast-fire-charts/`). Repeated calls with the same filename
 * overwrite the previous file — this is intentional since the user just
 * wants to view the latest chart.
 *
 * @param svgContent - Complete SVG document string
 * @param filename   - File name including `.svg` extension (e.g. "fire-growth.svg")
 * @returns Absolute path to the written file
 *
 * @example
 * const path = await writeSvgToTempFile(svgString, "fire-growth.svg");
 * // → "/var/folders/.../raycast-fire-charts/fire-growth.svg"
 * await open(path);
 */
export async function writeSvgToTempFile(svgContent: string, filename: string): Promise<string> {
  const dir = join(tmpdir(), TEMP_SUBDIR);
  await mkdir(dir, { recursive: true });

  const filePath = join(dir, sanitiseFilename(filename));
  await writeFile(filePath, svgContent, "utf-8");

  return filePath;
}

// ──────────────────────────────────────────
// Downloads (for "Save Chart" action)
// ──────────────────────────────────────────

/**
 * Saves an SVG string to the user's Downloads folder and returns its path.
 *
 * If a file with the same name already exists, it is overwritten silently.
 * The caller is responsible for choosing a descriptive filename.
 *
 * @param svgContent - Complete SVG document string
 * @param filename   - File name including `.svg` extension (e.g. "FIRE-Growth-Projection.svg")
 * @returns Absolute path to the saved file
 *
 * @example
 * const path = await saveSvgToDownloads(svgString, "FIRE-Growth-Projection.svg");
 * // → "/Users/bear/Downloads/FIRE-Growth-Projection.svg"
 */
export async function saveSvgToDownloads(svgContent: string, filename: string): Promise<string> {
  const filePath = join(DOWNLOADS_DIR, sanitiseFilename(filename));
  await writeFile(filePath, svgContent, "utf-8");

  return filePath;
}

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

/**
 * Sanitises a filename by removing path separators and null bytes.
 *
 * Prevents directory traversal while keeping the filename readable.
 * Does NOT strip spaces or special characters beyond separators.
 *
 * @param name - Raw filename string
 * @returns Sanitised filename safe for use in `join()`
 */
function sanitiseFilename(name: string): string {
  return name.replace(/[/\\:\0]/g, "_");
}
