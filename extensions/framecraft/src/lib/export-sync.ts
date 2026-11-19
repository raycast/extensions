import fs from "node:fs";
import { HistoryEntry } from "./types";

export interface ExportState {
  modified?: boolean;
  missing: string[];
}
function signature(file: string): string | undefined {
  try {
    const stat = fs.statSync(file);
    return stat.isFile() ? `${stat.size}:${stat.mtimeMs}` : undefined;
  } catch {
    return undefined;
  }
}
export function exportSignatures(entry: HistoryEntry): Record<string, string> {
  const result: Record<string, string> = {};
  for (const file of [entry.cleanPngPath, entry.subbedPngPath, entry.layeredSvgPath, entry.clipMkvPath]) {
    if (!file) continue;
    const value = signature(file);
    if (value) result[file] = value;
  }
  return result;
}
export function syncExportEntry(entry: HistoryEntry): HistoryEntry | undefined {
  if (entry.status === "failed") return entry;
  const files = [entry.cleanPngPath, entry.subbedPngPath, entry.layeredSvgPath, entry.clipMkvPath].filter(
    (file): file is string => !!file,
  );
  if (!files.length) return entry;
  let baseline = entry.exportSignatures;
  if (entry.manifestPath) {
    try {
      baseline = JSON.parse(fs.readFileSync(entry.manifestPath, "utf8")).exportSignatures || baseline;
    } catch {
      /* Missing or edited manifest. */
    }
  }
  const live = exportSignatures(entry);
  if (!Object.keys(live).length) return undefined;
  const missing = files.filter((file) => !live[file]);
  const modified = !!baseline && Object.entries(live).some(([file, value]) => baseline?.[file] !== value);
  return {
    ...entry,
    exportSignatures: baseline || live,
    exportState: { modified, missing },
    cleanPngPath: entry.cleanPngPath && live[entry.cleanPngPath] ? entry.cleanPngPath : undefined,
    subbedPngPath: entry.subbedPngPath && live[entry.subbedPngPath] ? entry.subbedPngPath : undefined,
    layeredSvgPath: entry.layeredSvgPath && live[entry.layeredSvgPath] ? entry.layeredSvgPath : undefined,
    clipMkvPath: entry.clipMkvPath && live[entry.clipMkvPath] ? entry.clipMkvPath : undefined,
  };
}
