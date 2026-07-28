/**
 * Source/output path resolution, Finder integration, and merge output layout.
 */

import { getSelectedFinderItems } from "@raycast/api";
import { promises as fs } from "node:fs";
import path from "node:path";
import { OutputRootNotFoundError, SourceNotFoundError } from "./errors";
import { logger } from "./logger";

/**
 * Trims a preference or config path; returns `undefined` for empty strings.
 *
 * @param value - Raw path string from preferences or UI.
 * @returns Resolved non-empty path or `undefined`.
 */
export function cleanPath(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Resolves and deduplicates source roots, dropping nested paths covered by a parent root.
 *
 * @param roots - Raw root path strings.
 * @returns Absolute, collapsed root paths.
 */
export function normalizeRoots(roots: string[]): string[] {
  const normalized = new Set<string>();
  for (const root of roots) {
    const cleaned = cleanPath(root);
    if (!cleaned) {
      continue;
    }
    normalized.add(path.resolve(cleaned));
  }
  return collapseNestedRoots([...normalized]);
}

/**
 * Returns whether `targetPath` is the same as or inside `parentPath`.
 *
 * @param parentPath - Absolute parent directory.
 * @param targetPath - Absolute path to test.
 * @returns `true` when `targetPath` is under `parentPath` (or equal).
 */
export function isSameOrDescendant(parentPath: string, targetPath: string): boolean {
  const relative = path.relative(parentPath, targetPath);
  return relative.length === 0 || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

/**
 * Removes roots that are descendants of another root in the list.
 *
 * @param roots - Absolute root paths (may include duplicates).
 * @returns Minimal set of roots that cover the same trees.
 */
export function collapseNestedRoots(roots: string[]): string[] {
  const sortedRoots = [...new Set(roots)].sort((a, b) => a.length - b.length);
  const collapsed: string[] = [];

  for (const candidate of sortedRoots) {
    const coveredByExistingRoot = collapsed.some((existingRoot) => isSameOrDescendant(existingRoot, candidate));
    if (!coveredByExistingRoot) {
      collapsed.push(candidate);
    }
  }

  return collapsed;
}

/**
 * Checks whether a path exists and is a directory.
 *
 * @param targetPath - Path to test.
 * @returns `true` when the directory exists.
 */
export async function directoryExists(targetPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(targetPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Builds source roots from Finder selection and/or the default TeslaCam path.
 *
 * When Finder items lie inside the default path, the default root is used instead of
 * nested selections. Nested roots are collapsed afterward.
 *
 * @param defaultSourcePath - Optional default TeslaCam folder from preferences.
 * @returns Absolute source root paths (may be empty).
 */
export async function resolveFinderSourceRoots(defaultSourcePath?: string): Promise<string[]> {
  const roots = new Set<string>();
  const cleanedDefault = cleanPath(defaultSourcePath);
  const resolvedDefaultPath = cleanedDefault ? path.resolve(cleanedDefault) : undefined;

  try {
    const selectedItems = await getSelectedFinderItems();
    logger.debug("Loaded Finder selection", { selectedCount: selectedItems.length });

    for (const item of selectedItems) {
      if (item.path.length === 0) {
        continue;
      }
      const stats = await fs.stat(item.path);
      const targetDir = stats.isDirectory() ? item.path : path.dirname(item.path);
      roots.add(path.resolve(targetDir));
    }
  } catch (error) {
    logger.warn("Finder selection unavailable", { error: error instanceof Error ? error.message : String(error) });
  }

  if (resolvedDefaultPath) {
    if (roots.size === 0) {
      roots.add(resolvedDefaultPath);
      logger.debug("Using default source path", { defaultSourcePath: resolvedDefaultPath });
    } else {
      const selectedRoots = [...roots];
      const allSelectionsInsideDefault = selectedRoots.every((selectedRoot) =>
        isSameOrDescendant(resolvedDefaultPath, selectedRoot),
      );

      if (allSelectionsInsideDefault) {
        roots.clear();
        roots.add(resolvedDefaultPath);
        logger.debug("Finder selection inside default path, using default root", {
          defaultSourcePath: resolvedDefaultPath,
        });
      }
    }
  }

  const result = collapseNestedRoots([...roots]);
  logger.debug("Resolved source roots", { count: result.length, roots: result });
  return result;
}

/**
 * Ensures all source roots exist and optionally validates the output root.
 *
 * @param roots - Source root paths to validate.
 * @param outputRootPath - Optional custom output root; skipped when undefined.
 * @throws {@link SourceNotFoundError} when any source root is missing.
 * @throws {@link OutputRootNotFoundError} when `outputRootPath` is set but missing.
 */
export async function validateMergePaths(roots: string[], outputRootPath?: string): Promise<void> {
  const missingRoots: string[] = [];
  for (const root of roots) {
    if (!(await directoryExists(root))) {
      missingRoots.push(root);
    }
  }

  if (missingRoots.length > 0) {
    logger.warn("Source folders not found", { missingRoots });
    throw new SourceNotFoundError(`Source folder not found: ${missingRoots.join(", ")}`, { paths: missingRoots });
  }

  if (outputRootPath && !(await directoryExists(outputRootPath))) {
    logger.warn("Output root folder not found", { outputRootPath });
    throw new OutputRootNotFoundError(`Output root folder does not exist: ${outputRootPath}`, {
      outputPath: outputRootPath,
    });
  }
}

/**
 * Resolves the directory where merged outputs for an event are written.
 *
 * Without a custom output root, uses `{eventDir}/merged`. With a custom root, mirrors
 * the event path under `{outputRoot}/{prefix}/{relativeEventPath}`.
 *
 * @param eventDir - Absolute path to the Tesla event folder.
 * @param sourceRoot - Absolute source root containing the event.
 * @param outputRootPath - Optional custom merge output root.
 * @returns Absolute merged output directory for the event.
 */
export function resolveEventOutputDir(eventDir: string, sourceRoot: string, outputRootPath?: string): string {
  if (!outputRootPath) {
    return path.join(eventDir, "merged");
  }

  const relativeEventPath = path.relative(sourceRoot, eventDir);
  const rootBasename = path.basename(sourceRoot);

  // Disambiguate by including parent directory name when basename alone could collide
  const parentName = path.basename(path.dirname(sourceRoot));
  const prefix =
    parentName && parentName !== "." && parentName !== "/" ? `${parentName}_${rootBasename}` : rootBasename;

  return path.join(outputRootPath, prefix, relativeEventPath);
}

/**
 * Standard filename for a per-camera merged MP4.
 *
 * @param camera - Tesla camera id (for example `front`).
 * @param eventFolderName - Event folder basename (`YYYY-MM-DD_HH-mm-ss`).
 * @returns Filename such as `front-2024-01-15_12-30-00.mp4`.
 */
export function resolveMergedOutputFilename(camera: string, eventFolderName: string): string {
  return `${camera}-${eventFolderName}.mp4`;
}
