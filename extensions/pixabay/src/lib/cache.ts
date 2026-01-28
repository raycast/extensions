import * as fs from "fs/promises";
import path from "path/posix";

import { environment } from "@raycast/api";

export function getLargeCacheDirectory(): string {
  const sp = environment.supportPath;
  const cacheDir = path.join(sp, "cache");
  return cacheDir;
}

export async function getCacheFilepath(filename: string, ensureDirectory = false): Promise<string> {
  const cacheDir = getLargeCacheDirectory();
  if (ensureDirectory) {
    await fs.mkdir(cacheDir, { recursive: true });
  }
  const cacheFilePath = path.join(cacheDir, filename);
  return cacheFilePath;
}
