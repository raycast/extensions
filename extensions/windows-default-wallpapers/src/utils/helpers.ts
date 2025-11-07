import path from "node:path";

export function fullPath(itemPath: string) {
  return path.join(__dirname, "assets", itemPath);
}
