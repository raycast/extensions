import fs from "fs";
import path from "path";

const IGNORE_DIRS = new Set([".git", ".vscode", "node_modules", ".DS_Store"]);
const DEPTH = 3;

function readdirRecursive(root: string, dir: string, depth: number, currentDepth: number = 0, dirList: string[] = []) {
  if (currentDepth >= depth) {
    return dirList;
  }

  const files = fs.readdirSync(dir);
  const filteredFiles = files.filter((files) => !IGNORE_DIRS.has(files));

  for (const file of filteredFiles) {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);

    if (!stats.isDirectory()) {
      return dirList;
    }

    if (currentDepth === DEPTH - 1) {
      const removeRoot = filePath.replace(`${root}/`, "");
      dirList.push(removeRoot);
    }
    readdirRecursive(root, filePath, depth, currentDepth + 1, dirList);
  }

  return dirList;
}

export async function fetchGHQList(root: string) {
  try {
    return readdirRecursive(root, root, DEPTH);
  } catch (e) {
    console.error(e);
    return [];
  }
}
