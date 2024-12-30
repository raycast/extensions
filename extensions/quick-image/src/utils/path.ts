import nodePath from "node:path";
import fs from "./fs";

/**
 * If path exists, return a new path with a number appended to it.
 */
async function genUniquePath(path: string): Promise<string> {
  const { dir, name, ext } = nodePath.parse(path);
  let newPath = path;
  let index = 1;
  while (await fs.pathExists(newPath)) {
    newPath = nodePath.join(dir, `${name} (${index})${ext}`);
    index++;
  }
  return newPath;
}

function isImageFile(path: string, exts: string[]) {
  const ext = nodePath.extname(path).slice(1);
  return exts.includes(ext);
}

export default {
  ...nodePath,
  genUniquePath,
  isImageFile,
};
