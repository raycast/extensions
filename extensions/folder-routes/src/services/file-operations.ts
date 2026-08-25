import { randomUUID } from "node:crypto";
import { cp, lstat, rename, rm } from "node:fs/promises";
import { basename, dirname, join, normalize, relative } from "node:path";

import { type ConflictBehavior, createKeepBothPath } from "../domain/file-conflicts";
import { isDirectory, isNodeError, pathExists } from "./filesystem";

export type FileOperationMode = "copy" | "move";
export type FileOperationStatus = "success" | "skipped" | "failed";

export interface FileOperationItemResult {
  sourcePath: string;
  targetPath?: string;
  status: FileOperationStatus;
  message?: string;
}

export interface FileOperationSummary {
  mode: FileOperationMode;
  results: FileOperationItemResult[];
  successCount: number;
  skippedCount: number;
  failedCount: number;
}

export interface FileOperationOptions {
  conflictBehavior: ConflictBehavior;
  confirmOverwrite?: (sourcePath: string, targetPath: string) => Promise<boolean>;
}

export async function performFileOperation(
  mode: FileOperationMode,
  sourcePaths: readonly string[],
  destinationDirectory: string,
  options: FileOperationOptions,
): Promise<FileOperationSummary> {
  if (!(await isDirectory(destinationDirectory))) {
    throw new Error(`Destination folder does not exist: ${destinationDirectory}`);
  }

  const results: FileOperationItemResult[] = [];
  for (const sourcePath of sourcePaths) {
    results.push(await transferOne(mode, sourcePath, destinationDirectory, options));
  }

  return {
    mode,
    results,
    successCount: results.filter((result) => result.status === "success").length,
    skippedCount: results.filter((result) => result.status === "skipped").length,
    failedCount: results.filter((result) => result.status === "failed").length,
  };
}

async function transferOne(
  mode: FileOperationMode,
  sourcePath: string,
  destinationDirectory: string,
  options: FileOperationOptions,
): Promise<FileOperationItemResult> {
  const desiredTarget = join(destinationDirectory, basename(sourcePath));

  try {
    await lstat(sourcePath);
    assertSafeTarget(sourcePath, desiredTarget);

    let targetPath = desiredTarget;
    const targetExists = await pathExists(targetPath);
    let overwrite = false;

    if (targetExists) {
      if (options.conflictBehavior === "skip") {
        return { sourcePath, targetPath, status: "skipped", message: "An item with the same name already exists." };
      }
      if (options.conflictBehavior === "keep-both") {
        targetPath = await createKeepBothPath(targetPath, pathExists);
      } else if (options.conflictBehavior === "prompt") {
        if (!options.confirmOverwrite) {
          throw new Error("Prompt conflict behavior requires a confirmation handler.");
        }
        overwrite = await options.confirmOverwrite(sourcePath, targetPath);
        if (!overwrite) {
          return { sourcePath, targetPath, status: "skipped", message: "Overwrite was not confirmed." };
        }
      } else {
        overwrite = true;
      }
    }

    let cleanupWarning: string | undefined;
    if (overwrite) {
      cleanupWarning = await transferWithRollback(mode, sourcePath, targetPath);
    } else {
      await transfer(mode, sourcePath, targetPath);
    }

    return {
      sourcePath,
      targetPath,
      status: "success",
      message: cleanupWarning,
    };
  } catch (error) {
    return {
      sourcePath,
      targetPath: desiredTarget,
      status: "failed",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

async function transferWithRollback(
  mode: FileOperationMode,
  sourcePath: string,
  targetPath: string,
): Promise<string | undefined> {
  const backupPath = join(dirname(targetPath), `.copymoveto-list-backup-${randomUUID()}-${basename(targetPath)}`);
  await rename(targetPath, backupPath);

  try {
    await transfer(mode, sourcePath, targetPath);
  } catch (transferError) {
    try {
      if (await pathExists(targetPath)) {
        await rm(targetPath, { recursive: true, force: true });
      }
      await rename(backupPath, targetPath);
    } catch (rollbackError) {
      throw new AggregateError(
        [transferError, rollbackError],
        `Transfer failed and the original destination could not be fully restored. Backup: ${backupPath}`,
      );
    }
    throw transferError;
  }

  try {
    await rm(backupPath, { recursive: true, force: true });
    return undefined;
  } catch {
    return `Transfer succeeded, but the temporary backup could not be removed: ${backupPath}`;
  }
}

async function transfer(mode: FileOperationMode, sourcePath: string, targetPath: string): Promise<void> {
  if (mode === "copy") {
    await copyItem(sourcePath, targetPath);
    return;
  }

  try {
    await rename(sourcePath, targetPath);
  } catch (error) {
    if (!isNodeError(error) || error.code !== "EXDEV") {
      throw error;
    }
    await copyItem(sourcePath, targetPath);
    try {
      await rm(sourcePath, { recursive: true });
    } catch (removeError) {
      try {
        await rm(targetPath, { recursive: true, force: true });
      } catch {
        throw new AggregateError(
          [removeError],
          `Cross-volume copy succeeded, but the source could not be removed and the copied target could not be rolled back: ${targetPath}`,
        );
      }
      throw removeError;
    }
  }
}

async function copyItem(sourcePath: string, targetPath: string): Promise<void> {
  await cp(sourcePath, targetPath, {
    recursive: true,
    force: false,
    errorOnExist: true,
    preserveTimestamps: true,
    dereference: false,
    verbatimSymlinks: true,
  });
}

function assertSafeTarget(sourcePath: string, targetPath: string): void {
  const source = normalize(sourcePath);
  const target = normalize(targetPath);
  if (source === target) {
    throw new Error("Source and destination are the same item.");
  }

  const targetRelativeToSource = relative(source, target);
  if (targetRelativeToSource && !targetRelativeToSource.startsWith("..") && !targetRelativeToSource.startsWith("/")) {
    throw new Error("A folder cannot be copied or moved inside itself.");
  }
}
