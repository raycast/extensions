import path from "node:path";
import os from "node:os";
import fs from "node:fs";

export async function getFullPath(inputPath: string) {
  const fullPath = path.resolve(path.normalize(inputPath.replace(/^~/, os.homedir())));
  if (!fs.existsSync(fullPath)) {
    throw new Error(`The file does not exist at ${fullPath}`);
  }
  return fullPath;
}
