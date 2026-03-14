import path from "node:path";

export function getFinderCopyHelperPath(assetsPath: string): string {
  return path.join(assetsPath, "finder-copy-files");
}
