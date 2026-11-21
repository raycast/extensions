import path from "node:path";

export function resolveScope(forceGlobal) {
  if (forceGlobal) {
    return { type: "global", label: "global" };
  }

  return { type: "folder", root: process.cwd(), label: `folder ${process.cwd()}` };
}

export function isInsideFolder(cwd, folderRoot) {
  if (cwd === "(unknown)") {
    return false;
  }

  const relative = path.relative(folderRoot, cwd);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
