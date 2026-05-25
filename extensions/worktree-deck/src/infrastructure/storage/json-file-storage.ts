import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import { expandHomePath, normalizePathValue } from "../../domain/path-utils";
import type { EnvLookupArgs } from "../env/env-store";

/**
 * file storage ディレクトリの既定値
 */
const DEFAULT_FILE_STORAGE_DIR = "~/.worktree-deck/storage";

/**
 * file storage のベースディレクトリを解決する
 */
function resolveFileStorageBaseDir(args: EnvLookupArgs): string {
  const homeDir = args.homeDir?.trim() || homedir();
  return normalizePathValue(expandHomePath(DEFAULT_FILE_STORAGE_DIR, homeDir));
}

/**
 * file storage の JSON パスを組み立てる
 */
async function resolveFileStoragePath(args: EnvLookupArgs, fileName: string): Promise<string> {
  const storageDir = resolveFileStorageBaseDir(args);
  return join(storageDir, fileName);
}

/**
 * file storage の JSON を読み込む
 */
export async function readWorktreeDeckFileStorageJson<T>(args: EnvLookupArgs, fileName: string): Promise<T | null> {
  const filePath = await resolveFileStoragePath(args, fileName);
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      if ((error as { code?: string }).code === "ENOENT") {
        return null;
      }
    }
    throw error;
  }
}

/**
 * file storage の JSON を書き込む
 */
export async function writeWorktreeDeckFileStorageJson(
  args: EnvLookupArgs,
  fileName: string,
  value: unknown,
): Promise<void> {
  const filePath = await resolveFileStoragePath(args, fileName);
  await fs.mkdir(dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value), "utf8");
}
