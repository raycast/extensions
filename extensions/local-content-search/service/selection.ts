import { extname } from "node:path";
import { Config } from "./protocol";

// Match native FolderSelection: a selected descendant overrides an excluded ancestor, not its own excluded children.
export function selectedPath(config: Config, path: string): boolean {
  return (
    config.roots.some(
      (root) =>
        (path === root || path.startsWith(`${root}/`)) &&
        !config.excludedFolders.some(
          (skip) =>
            skip.startsWith(`${root}/`) &&
            (path === skip || path.startsWith(`${skip}/`)),
        ),
    ) &&
    !config.excludedExtensions.includes(extname(path).slice(1).toLowerCase())
  );
}
