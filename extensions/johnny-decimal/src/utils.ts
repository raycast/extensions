import fs from "fs";
import path from "path";

export interface Preferences {
  rootFolder: string;
  indexFilePath?: string;
}

// Function to get all directories at a specific level
export function getDirectories(source: string, level: number): string[] {
  const isDirectory = (source: string) => fs.lstatSync(source).isDirectory();
  const getDirectories = (source: string) =>
    fs
      .readdirSync(source)
      .map((name) => path.join(source, name))
      .filter(isDirectory);

  let dirs = [source];
  for (let i = 0; i < level; i++) {
    dirs = dirs.flatMap((dir) => getDirectories(dir));
  }
  return dirs;
}

// Function to search for Johnny.Decimal items
export function searchJohnnyDecimal(directories: string[], searchTerm: string): string[] {
  return directories
    .filter((dir) => path.basename(dir).toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) =>
      path.basename(a).localeCompare(path.basename(b), undefined, { numeric: true, sensitivity: "base" }),
    );
}

// Function to get the index file path
export function getIndexFilePath(preferences: Preferences): string {
  if (preferences.indexFilePath) {
    return preferences.indexFilePath;
  }
  return path.join(preferences.rootFolder, "index.md");
}

export function rebuildIndex(rootFolder: string, indexFilePath: string) {
  const buildTree = (dir: string, level: number = 0, prefix: string = ""): string => {
    if (level >= 3) return ""; // Stop at level 3 (items)

    const items = fs.readdirSync(dir);
    let tree = "";
    items.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

    items.forEach((item) => {
      const itemPath = path.join(dir, item);
      if (fs.statSync(itemPath).isDirectory()) {
        tree += `${prefix}${item}\n`;
        if (level < 2) {
          // Only recurse if we're not at the item level
          tree += buildTree(itemPath, level + 1, `${prefix}  `);
        }
      }
    });
    return tree;
  };

  const tree = buildTree(rootFolder);
  fs.writeFileSync(indexFilePath, tree);
}
