import fs from "node:fs/promises";
import path from "node:path";

type Stats = {
  totalSize: number;
  lastAccessTime: number;
  lastModifiedTime: number;
};

export async function getStats(dir: string, exclude: string[]): Promise<Stats> {
  const stack = [dir];

  let stats = await fs.stat(dir);
  if (stats.isFile()) {
    return {
      totalSize: stats.size,
      lastAccessTime: stats.atimeMs,
      lastModifiedTime: stats.mtimeMs,
    };
  }

  let lastModifiedTime = 0;
  let lastAccessTime = 0;
  let totalSize = 0;

  while (stack.length > 0) {
    // biome-ignore lint/style/noNonNullAssertion: we checked the stack is not empty
    const currentDir = stack.pop()!;
    const files = await fs.readdir(currentDir);

    for (const file of files) {
      if (exclude.includes(file)) {
        continue;
      }

      const filePath = path.join(currentDir, file);
      stats = await fs.stat(filePath);

      if (stats.isDirectory()) {
        stack.push(filePath);
      } else if (stats.isFile()) {
        if (stats.mtimeMs > lastModifiedTime) {
          lastModifiedTime = stats.mtimeMs;
        }

        if (stats.atimeMs > lastAccessTime) {
          lastAccessTime = stats.atimeMs;
        }

        totalSize += stats.size;
      }
    }
  }

  return {
    totalSize,
    lastAccessTime,
    lastModifiedTime,
  };
}
