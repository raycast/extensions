/**
 * Utilities for building selection summary stats from FileInfo arrays
 */

import { basename, dirname } from "path";
import type { FileInfo } from "../types";
import { formatFileSize } from "./metadata/file-stats";

export interface SelectionSummary {
  totalCount: number;
  totalSize: number;
  /** e.g. { ".jpg": 10, ".png": 5, ".pdf": 3 } */
  byExtension: Record<string, number>;
  /** Human-readable summary line: "1223 files (4.2 GB) — 800 .jpg, 300 .png, 123 .pdf" */
  summaryText: string;
}

function extensionBreakdownText(byExtension: Record<string, number>): string {
  return Object.entries(byExtension)
    .sort(([, a], [, b]) => b - a)
    .map(([ext, count]) => `${count} ${ext}`)
    .join(", ");
}

/**
 * Build a selection summary from an array of FileInfo objects.
 */
export function buildSelectionSummary(files: FileInfo[]): SelectionSummary {
  const byExtension: Record<string, number> = {};

  for (const file of files) {
    if (file.isDirectory) continue;

    if (file.extension) {
      const ext = file.extension.toLowerCase();
      byExtension[ext] = (byExtension[ext] || 0) + 1;
    } else {
      byExtension["(no ext)"] = (byExtension["(no ext)"] || 0) + 1;
    }
  }

  const totalSize = files.reduce((sum, f) => sum + (f.size ?? 0), 0);
  const allDirs = files.every((f) => f.isDirectory);
  const noun = allDirs ? "folder" : "file";
  const sizeLabel = totalSize > 0 ? ` (${formatFileSize(totalSize)})` : "";
  const totalLabel = `${files.length} ${noun}${files.length !== 1 ? "s" : ""}${sizeLabel}`;

  const breakdown = extensionBreakdownText(byExtension);
  const summaryText = breakdown ? `${totalLabel} — ${breakdown}` : totalLabel;

  return {
    totalCount: files.length,
    totalSize,
    byExtension,
    summaryText,
  };
}

/**
 * Build a per-folder summary string for the file selection form.
 * Each folder gets its own line with file count and extension breakdown.
 */
export function buildPerFolderSummary(folderFileMap: Map<string, FileInfo[]>): string {
  const lines: string[] = [];
  let grandTotal = 0;

  for (const [folderPath, files] of folderFileMap) {
    const folderName = basename(folderPath);
    const byExtension: Record<string, number> = {};

    for (const file of files) {
      if (file.extension) {
        const ext = file.extension.toLowerCase();
        byExtension[ext] = (byExtension[ext] || 0) + 1;
      } else {
        byExtension["(no ext)"] = (byExtension["(no ext)"] || 0) + 1;
      }
    }

    const breakdown = extensionBreakdownText(byExtension);
    const count = `${files.length} file${files.length !== 1 ? "s" : ""}`;
    lines.push(breakdown ? `${folderName}: ${count} — ${breakdown}` : `${folderName}: ${count}`);
    grandTotal += files.length;
  }

  const grandSize = [...folderFileMap.values()].flat().reduce((sum, f) => sum + (f.size ?? 0), 0);
  const sizeLabel = grandSize > 0 ? ` (${formatFileSize(grandSize)})` : "";
  const totalLine = `${grandTotal} file${grandTotal !== 1 ? "s" : ""} total${sizeLabel}`;
  return [totalLine, ...lines].join("\n");
}

/**
 * Group files by their extension (lowercase, normalized).
 * Files with no extension are grouped under "(no ext)".
 */
export function groupFilesByExtension(files: FileInfo[]): Map<string, FileInfo[]> {
  const groups = new Map<string, FileInfo[]>();
  for (const file of files) {
    const ext = file.extension.toLowerCase() || "(no ext)";
    if (!groups.has(ext)) groups.set(ext, []);
    groups.get(ext)!.push(file);
  }
  return groups;
}

/**
 * Auto-detect multi-directory files and return per-folder summary when applicable.
 * Falls back to flat summary for single-directory selections.
 */
export function buildAutoSummary(files: FileInfo[]): string {
  const dirMap = new Map<string, FileInfo[]>();
  for (const file of files) {
    const dir = dirname(file.path);
    if (!dirMap.has(dir)) dirMap.set(dir, []);
    dirMap.get(dir)!.push(file);
  }

  if (dirMap.size <= 1) {
    return buildSelectionSummary(files).summaryText;
  }

  return buildPerFolderSummary(dirMap);
}
