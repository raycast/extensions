import fs from "fs";
import path from "path";

const IGNORE_DIRS = new Set([".git", ".vscode", "node_modules", ".DS_Store"]);

function hasGitDirectory(dir: string): boolean {
  const stats = fs.statSync(path.join(dir, ".git"), { throwIfNoEntry: false });
  return stats !== undefined && stats.isDirectory();
}

function readdirRecursive(root: string, dir: string, dirList: string[] = []) {
  const files = fs.readdirSync(dir);
  const filteredFiles = files.filter((file) => !IGNORE_DIRS.has(file));

  for (const file of filteredFiles) {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);

    if (!stats.isDirectory()) {
      continue;
    }

    if (hasGitDirectory(filePath)) {
      const removeRoot = filePath.replace(`${root}/`, "");
      dirList.push(removeRoot);
    } else {
      readdirRecursive(root, filePath, dirList);
    }
  }

  return dirList;
}

export async function fetchGHQList(root: string) {
  try {
    return readdirRecursive(root, root);
  } catch (e) {
    console.error(e);
    return [];
  }
}
