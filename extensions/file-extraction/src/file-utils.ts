import fs from "fs/promises";
import path from "path";
import { showToast, Toast } from "@raycast/api";

// Recursively walk through all files in a directory
export async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else {
      yield fullPath;
    }
  }
}

// Get a unique destination file path (adds _1, _2, ... if needed)
export async function getUniqueDest(destDir: string, fileName: string): Promise<string> {
  const base = path.parse(fileName).name;
  const ext = path.parse(fileName).ext;
  let candidate = path.join(destDir, fileName);
  let counter = 1;
  while (true) {
    try {
      await fs.access(candidate);
      candidate = path.join(destDir, `${base}_${counter}${ext}`);
      counter++;
    } catch {
      return candidate;
    }
  }
}

// Copies or moves files with error handling and optional progress callback
export async function processFilesWithErrorsAndProgress(
  files: { src: string; dest: string }[],
  operation: (src: string, dest: string) => Promise<void>,
  onProgress?: (current: number, total: number) => void,
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      await operation(file.src, file.dest);
      success++;
    } catch {
      failed++;
    }
    if (onProgress) onProgress(i + 1, files.length);
  }
  return { success, failed };
}

// Validate file extension input
export function isValidExtension(extension: string | undefined): boolean {
  return !!extension && /^[a-zA-Z0-9]+$/.test(extension);
}

// Show a standardized error toast for invalid extension
export function showInvalidExtensionToast() {
  showToast({
    style: Toast.Style.Failure,
    title: "Invalid extension",
    message: "Please enter a valid extension like 'png'.",
  });
}

// Show a standardized error toast for no folder selected
export function showNoFolderSelectedToast() {
  showToast({
    style: Toast.Style.Failure,
    title: "No folder selected",
  });
}

// Standard error toast for no matching files found
export function showNoMatchingFilesToast() {
  showToast({
    style: Toast.Style.Failure,
    title: "No matching files found",
  });
}

// Standard error toast for failed destination folder
export function showFailedToCreateDestToast(dest: string) {
  showToast({
    style: Toast.Style.Failure,
    title: "Failed to create destination folder",
    message: `Could not create folder: ${dest}`,
  });
}

// Parse a comma-separated string of excluded extensions into a Set
export function parseExcludedExtensions(input: string | undefined): Set<string> {
  if (!input) return new Set();
  return new Set(
    input
      .split(",")
      .map((ext) => ext.trim().replace(/^\./, "").toLowerCase())
      .filter(Boolean)
      .map((ext) => "." + ext),
  );
}

// Check if a file extension is in the excluded set
export function isExcludedExtension(ext: string, excluded: Set<string>): boolean {
  return excluded.has(ext.toLowerCase());
}
