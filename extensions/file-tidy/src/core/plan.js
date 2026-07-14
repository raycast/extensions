import path from "node:path";
import { classify } from "./scan.js";
import { resolveYearMonth } from "./date.js";

/**
 * Build the move plan for all source files.
 * Each entry: { from, to, name, action: 'archive'|'duplicate', category,
 *               yearMonth, dateSource, size, keeperPath?, hash? }
 * Targets may collide with each other or with existing files — execute.js
 * resolves final names with suffixes at move time.
 */
export async function buildPlan({ sourceFiles, duplicates, destDir, extIndex, fallbackCategory }) {
  const entries = [];
  for (const file of sourceFiles) {
    const dup = duplicates.get(file.path);
    if (dup) {
      entries.push({
        from: file.path,
        to: path.join(destDir, "Duplicates", file.name),
        name: file.name,
        action: "duplicate",
        size: file.size,
        keeperPath: dup.keeper.path,
        hash: dup.hash,
      });
      continue;
    }
    const category = classify(file, extIndex, fallbackCategory);
    const { yearMonth, source: dateSource } = await resolveYearMonth(file);
    entries.push({
      from: file.path,
      to: path.join(destDir, category, yearMonth, file.name),
      name: file.name,
      action: "archive",
      category,
      yearMonth,
      dateSource,
      size: file.size,
    });
  }
  return entries;
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)}${units[i]}`;
}
