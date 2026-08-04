import fs from "node:fs";
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
  const reservedTargets = new Set();
  for (const file of sourceFiles) {
    const dup = duplicates.get(file.path);
    if (dup) {
      const to = reserveTarget(path.join(destDir, "Duplicates", file.name), reservedTargets);
      entries.push({
        from: file.path,
        to,
        name: file.name,
        action: "duplicate",
        size: file.size,
        keeperPath: dup.keeper.path,
        hash: dup.hash,
      });
      continue;
    }
    const category = classify(file, extIndex, fallbackCategory);
    assertValidCategory(category);
    const { yearMonth, source: dateSource } = await resolveYearMonth(file);
    const to = reserveTarget(path.join(destDir, category, yearMonth, file.name), reservedTargets);
    entries.push({
      from: file.path,
      to,
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

function reserveTarget(target, reservedTargets) {
  const isAvailable = (candidate) => {
    const key = process.platform === "win32" ? candidate.toLowerCase() : candidate;
    return !fs.existsSync(candidate) && !reservedTargets.has(key);
  };
  const reserve = (candidate) => {
    const key = process.platform === "win32" ? candidate.toLowerCase() : candidate;
    reservedTargets.add(key);
    return candidate;
  };
  if (isAvailable(target)) return reserve(target);

  const dir = path.dirname(target);
  const ext = path.extname(target);
  const base = path.basename(target, ext);
  for (let i = 1; ; i++) {
    const candidate = path.join(dir, `${base} (${i})${ext}`);
    if (isAvailable(candidate)) return reserve(candidate);
  }
}

function assertValidCategory(category) {
  const normalized = typeof category === "string" ? category.toLowerCase() : "";
  if (
    typeof category !== "string" ||
    !category.trim() ||
    category === "." ||
    category === ".." ||
    path.basename(category) !== category ||
    normalized === ".tidy" ||
    normalized === "duplicates"
  ) {
    throw new Error(`Invalid category name: ${String(category)}`);
  }
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
