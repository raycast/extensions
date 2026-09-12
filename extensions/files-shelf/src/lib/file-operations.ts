import { cpSync, renameSync, existsSync, statSync, rmSync } from "fs";
import { basename, dirname, join, extname } from "path";
import {
  ShelfItem,
  RenameOptions,
  RenamePreview,
  ExpressionRenameOptions,
  ValidationResult,
  RenamePreviewWithConflicts,
} from "./types";
import { parseExpression } from "./expression-parser";

export interface OperationResult {
  success: boolean;
  item: ShelfItem;
  error?: string;
  newPath?: string;
  skipped?: boolean;
}

export type ConflictStrategy = "skip" | "replace" | "rename";

export interface BatchOperationOptions {
  onConflict: ConflictStrategy;
}

function splitName(name: string): { base: string; ext: string } {
  const ext = extname(name);
  const base = ext ? basename(name, ext) : name;
  return { base, ext };
}

function getAutoRenamedName(originalName: string, n: number): string {
  const { base, ext } = splitName(originalName);
  return `${base} (${n})${ext}`;
}

function getAvailableDestinationPath(
  destinationDir: string,
  desiredName: string,
): { destPath: string; finalName: string } {
  const desiredPath = join(destinationDir, desiredName);
  if (!existsSync(desiredPath)) return { destPath: desiredPath, finalName: desiredName };

  for (let n = 1; n < 10_000; n++) {
    const candidateName = getAutoRenamedName(desiredName, n);
    const candidatePath = join(destinationDir, candidateName);
    if (!existsSync(candidatePath)) return { destPath: candidatePath, finalName: candidateName };
  }

  // Extremely unlikely fallback: return original desired path (will error).
  return { destPath: desiredPath, finalName: desiredName };
}

function getAvailableDestinationPathWithReserved(
  destinationDir: string,
  desiredName: string,
  reservedTargets: Set<string>,
): { destPath: string; finalName: string } {
  const desiredPath = join(destinationDir, desiredName);
  if (!existsSync(desiredPath) && !reservedTargets.has(desiredPath)) {
    return { destPath: desiredPath, finalName: desiredName };
  }

  for (let n = 1; n < 10_000; n++) {
    const candidateName = getAutoRenamedName(desiredName, n);
    const candidatePath = join(destinationDir, candidateName);
    if (!existsSync(candidatePath) && !reservedTargets.has(candidatePath)) {
      return { destPath: candidatePath, finalName: candidateName };
    }
  }

  return { destPath: desiredPath, finalName: desiredName };
}

function removeIfExists(path: string) {
  if (!existsSync(path)) return;
  rmSync(path, { recursive: true, force: true });
}

export function validateSourceItems(items: ShelfItem[]): ValidationResult {
  const valid: ShelfItem[] = [];
  const stale: ShelfItem[] = [];

  for (const item of items) {
    try {
      statSync(item.path);
      valid.push(item);
    } catch {
      stale.push(item);
    }
  }

  return { valid, stale, hasIssues: stale.length > 0 };
}

export function copyItems(items: ShelfItem[], destination: string, options: BatchOperationOptions): OperationResult[] {
  const results: OperationResult[] = [];

  for (const item of items) {
    try {
      let destPath = join(destination, item.name);

      if (existsSync(destPath)) {
        if (options.onConflict === "skip") {
          results.push({
            success: false,
            skipped: true,
            item,
            error: "Destination already contains an item with the same name",
          });
          continue;
        }

        if (options.onConflict === "replace") {
          removeIfExists(destPath);
        }

        if (options.onConflict === "rename") {
          const available = getAvailableDestinationPath(destination, item.name);
          destPath = available.destPath;
        }
      }

      cpSync(item.path, destPath, { recursive: true });
      results.push({ success: true, item, newPath: destPath });
    } catch (error) {
      results.push({
        success: false,
        item,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

function moveWithFallback(src: string, dest: string) {
  try {
    renameSync(src, dest);
    return;
  } catch (error) {
    // Cross-device move: fallback to copy + delete.
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "EXDEV") {
      cpSync(src, dest, { recursive: true });
      rmSync(src, { recursive: true, force: true });
      return;
    }
    throw error;
  }
}

export function moveItems(items: ShelfItem[], destination: string, options: BatchOperationOptions): OperationResult[] {
  const results: OperationResult[] = [];

  for (const item of items) {
    try {
      let destPath = join(destination, item.name);

      // Moving an item onto itself is a no-op.
      if (destPath === item.path) {
        results.push({ success: false, skipped: true, item, error: "Item is already in the destination folder" });
        continue;
      }

      if (existsSync(destPath)) {
        if (options.onConflict === "skip") {
          results.push({
            success: false,
            skipped: true,
            item,
            error: "Destination already contains an item with the same name",
          });
          continue;
        }

        if (options.onConflict === "replace") {
          removeIfExists(destPath);
        }

        if (options.onConflict === "rename") {
          const available = getAvailableDestinationPath(destination, item.name);
          destPath = available.destPath;
        }
      }

      moveWithFallback(item.path, destPath);
      results.push({ success: true, item, newPath: destPath });
    } catch (error) {
      results.push({
        success: false,
        item,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

export function generateRenamePreview(
  items: ShelfItem[],
  options: RenameOptions | ExpressionRenameOptions,
): RenamePreview[] {
  const previews: RenamePreview[] = [];

  // Check if using new expression-based options
  if ("expression" in options) {
    items.forEach((item, index) => {
      const newName = parseExpression(options.expression, item, index, items.length, options.matchPattern);
      const dir = dirname(item.path);
      previews.push({
        item,
        oldName: item.name,
        newName,
        newPath: join(dir, newName),
      });
    });
  } else {
    // Legacy mode-based options (for backward compatibility)
    items.forEach((item, index) => {
      const ext = extname(item.name);
      const nameWithoutExt = basename(item.name, ext);
      let newName: string;

      switch (options.mode) {
        case "prefix":
          newName = `${options.prefix || ""}${item.name}`;
          break;
        case "suffix":
          newName = `${nameWithoutExt}${options.suffix || ""}${ext}`;
          break;
        case "numbering": {
          const num = (options.startNumber || 1) + index;
          const padding = options.padding || 3;
          const paddedNum = String(num).padStart(padding, "0");
          newName = `${paddedNum}${ext}`;
          break;
        }
        case "replace":
          if (options.find) {
            newName = item.name.replaceAll(options.find, options.replace || "");
          } else {
            newName = item.name;
          }
          break;
        default:
          newName = item.name;
      }

      const dir = dirname(item.path);
      previews.push({
        item,
        oldName: item.name,
        newName,
        newPath: join(dir, newName),
      });
    });
  }

  return previews;
}

export function generateRenamePreviewWithConflicts(
  items: ShelfItem[],
  options: RenameOptions | ExpressionRenameOptions,
): RenamePreviewWithConflicts[] {
  const previews: RenamePreviewWithConflicts[] = generateRenamePreview(items, options).map((preview) => ({
    ...preview,
  }));
  const targetCounts = new Map<string, number>();

  for (const preview of previews) {
    targetCounts.set(preview.newPath, (targetCounts.get(preview.newPath) || 0) + 1);
  }

  for (const preview of previews) {
    if (targetCounts.get(preview.newPath) && targetCounts.get(preview.newPath)! > 1) {
      preview.conflict = "duplicate_in_batch";
      preview.conflictsWith = preview.newPath;
      continue;
    }

    if (existsSync(preview.newPath) && preview.newPath !== preview.item.path) {
      preview.conflict = "exists_in_directory";
      preview.conflictsWith = preview.newPath;
    }
  }

  return previews;
}

export function renameItems(previews: RenamePreview[], onConflict: ConflictStrategy = "skip"): OperationResult[] {
  const results: OperationResult[] = [];
  const reservedTargets = new Set<string>();

  for (const preview of previews) {
    // Skip if name hasn't changed
    if (preview.oldName === preview.newName) {
      results.push({ success: true, item: preview.item, newPath: preview.item.path });
      reservedTargets.add(preview.item.path);
      continue;
    }

    try {
      let destPath = preview.newPath;
      const targetExists = existsSync(destPath) && destPath !== preview.item.path;
      const targetReserved = reservedTargets.has(destPath);

      if (targetExists || targetReserved) {
        if (onConflict === "skip") {
          results.push({
            success: false,
            skipped: true,
            item: preview.item,
            error: "Destination already contains an item with the same name",
          });
          continue;
        }

        if (onConflict === "replace") {
          if (destPath !== preview.item.path) {
            removeIfExists(destPath);
          }
        }

        if (onConflict === "rename") {
          const available = getAvailableDestinationPathWithReserved(
            dirname(destPath),
            basename(destPath),
            reservedTargets,
          );
          destPath = available.destPath;
        }
      }

      renameSync(preview.item.path, destPath);
      reservedTargets.add(destPath);
      results.push({ success: true, item: preview.item, newPath: destPath });
    } catch (error) {
      results.push({
        success: false,
        item: preview.item,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

export function validateDestination(path: string): { valid: boolean; error?: string } {
  if (!existsSync(path)) {
    return { valid: false, error: "Destination does not exist" };
  }

  try {
    const stat = statSync(path);
    if (!stat.isDirectory()) {
      return { valid: false, error: "Select a folder in Finder and run the command again" };
    }
  } catch {
    return { valid: false, error: "Cannot access destination" };
  }

  return { valid: true };
}
