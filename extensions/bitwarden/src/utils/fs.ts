import { existsSync, mkdirSync, statSync, unlinkSync } from "fs";
import { readdir, unlink } from "fs/promises";
import { join } from "path";
import streamZip from "node-stream-zip";
import { tryExec } from "~/utils/errors";

export function waitForFileAvailable(path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (!existsSync(path)) return;
      const stats = statSync(path);
      if (stats.isFile()) {
        clearInterval(interval);
        resolve();
      }
    }, 300);

    setTimeout(() => {
      clearInterval(interval);
      reject(new Error(`File ${path} not found.`));
    }, 5000);
  });
}

export async function decompressFile(filePath: string, targetPath: string) {
  const zip = new streamZip.async({ file: filePath });
  if (!existsSync(targetPath)) mkdirSync(targetPath, { recursive: true });
  await zip.extract(null, targetPath);
  await zip.close();
}

export async function removeFilesThatStartWith(startingWith: string, path: string) {
  let removedAtLeastOne = false;
  try {
    const files = await readdir(path);
    for await (const file of files) {
      if (!file.startsWith(startingWith)) continue;
      await tryExec(async () => {
        await unlink(join(path, file));
        removedAtLeastOne = true;
      });
    }
  } catch {
    return false;
  }
  return removedAtLeastOne;
}
export function unlinkAllSync(...paths: string[]) {
  for (const path of paths) {
    tryExec(() => unlinkSync(path));
  }
}
