import fs from "node:fs/promises";
import path from "node:path";

export async function getLastModifiedTime(dir: string, exclude: string[]): Promise<number> {
  let lastModifiedTime = 0;
  const stack = [dir];

  let stats = await fs.stat(dir);
  if (stats.isFile()) {
    return stats.mtimeMs;
  }

  while (stack.length > 0) {
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    const currentDir = stack.pop()!;
    const files = await fs.readdir(currentDir);

    for (const file of files) {
      const filePath = path.join(currentDir, file);
      stats = await fs.stat(filePath);

      if (stats.isDirectory() && !exclude.includes(file)) {
        stack.push(filePath);
      } else if (stats.isFile() && stats.mtimeMs > lastModifiedTime) {
        lastModifiedTime = stats.mtimeMs;
      }
    }
  }

  return lastModifiedTime;
}
