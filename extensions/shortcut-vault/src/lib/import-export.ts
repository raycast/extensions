import { environment } from "@raycast/api";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ShortcutExportFile } from "../types/shortcut";
import { MAX_FILE_BYTES, createExportFile, validateExportFile } from "./import-export-format";
import { getDefaultShortcuts } from "./default-shortcuts";
import { getCustomShortcuts, importCustomShortcuts } from "./storage";
export {
  EXAMPLE_EXPORT,
  EXPORT_FORMAT,
  EXPORT_VERSION,
  MAX_FILE_BYTES,
  MAX_IMPORT_SHORTCUTS,
  MAX_SHORTCUTS_PER_FILE,
  createExportFile,
} from "./import-export-format";

export type ImportResult = {
  importedCount: number;
  regeneratedIds: number;
};

export async function writeExportFile(): Promise<{
  filePath: string;
  count: number;
  json: string;
}> {
  const shortcuts = await getCustomShortcuts();
  const exportFile = createExportFile(shortcuts);
  const json = JSON.stringify(exportFile, null, 2);

  if (Buffer.byteLength(json, "utf8") > MAX_FILE_BYTES) {
    throw new Error("Export exceeds maximum supported file size of 6 MB.");
  }

  const exportDir = path.join(environment.supportPath, "exports");
  const exportTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(exportDir, `shortcut-vault-${exportTimestamp}.json`);

  await mkdir(exportDir, { recursive: true });
  await writeFile(filePath, json, "utf8");

  return { filePath, count: shortcuts.length, json };
}

export async function readImportFile(filePath: string): Promise<ShortcutExportFile> {
  const fileStats = await stat(filePath);

  if (!fileStats.isFile()) {
    throw new Error("Choose a JSON file, not a folder.");
  }

  if (fileStats.size > MAX_FILE_BYTES) {
    throw new Error("The selected file is too large. Import files must be 6 MB or smaller.");
  }

  const raw = await readFile(filePath, "utf8");
  if (Buffer.byteLength(raw, "utf8") > MAX_FILE_BYTES) {
    throw new Error("The selected file is too large. Import files must be 6 MB or smaller.");
  }
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }

  return validateExportFile(parsed);
}

export async function importShortcuts(filePath: string): Promise<ImportResult> {
  const exportFile = await readImportFile(filePath);
  const imported = await importCustomShortcuts(exportFile.shortcuts, getDefaultShortcuts());

  return {
    importedCount: imported.shortcuts.length,
    regeneratedIds: imported.regeneratedIds,
  };
}
