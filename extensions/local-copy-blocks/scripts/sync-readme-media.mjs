import { copyFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const sourcePath = path.join(repoRoot, "metadata", "local-copy-blocks-1.png");
const targetPath = path.join(repoRoot, "media", "local-copy-blocks-1.png");

await assertFileExists(sourcePath);
await mkdir(path.dirname(targetPath), { recursive: true });
await copyFile(sourcePath, targetPath);

console.log("Synced README media:");
console.log(`Source: ${path.relative(repoRoot, sourcePath)}`);
console.log(`Target: ${path.relative(repoRoot, targetPath)}`);

async function assertFileExists(filePath) {
  const fileStatus = await stat(filePath);

  if (!fileStatus.isFile()) {
    throw new Error(`Expected file: ${filePath}`);
  }
}
