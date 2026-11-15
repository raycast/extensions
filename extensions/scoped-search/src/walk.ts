import { promises as fs } from "fs";
import { basename, dirname, join, relative } from "path";
import { prettyPath, Scope } from "./scopes";
import { ResolvedPreferences } from "./preferences";

export type Entry = {
  /** Absolute path of the entry. */
  path: string;
  name: string;
  isDirectory: boolean;
  /** Absolute path of the scope this entry came from. */
  scopePath: string;
  /** Display name of the scope, e.g. "projects". */
  scopeName: string;
  /** Path relative to the scope root, e.g. "web/kbox-multi-stack-dev". */
  relativePath: string;
};

export type WalkResult = {
  entries: Entry[];
  /** Scopes that are configured but could not be read (deleted, no permission, ...). */
  missingScopes: string[];
  /** True when the result limit stopped the scan early. */
  truncated: boolean;
};

/**
 * Lists entries inside the enabled scopes only.
 *
 * Nothing outside the configured scopes is ever touched, and recursion stops at
 * `maxDepth` levels below each scope root (1 = direct children only).
 */
export async function walkScopes(
  scopes: Scope[],
  prefs: ResolvedPreferences,
): Promise<WalkResult> {
  const entries: Entry[] = [];
  const missingScopes: string[] = [];
  let truncated = false;

  const enabled = scopes.filter((scope) => scope.enabled);

  for (const scope of enabled) {
    try {
      const stats = await fs.stat(scope.path);
      if (!stats.isDirectory()) {
        missingScopes.push(scope.path);
        continue;
      }
    } catch {
      missingScopes.push(scope.path);
      continue;
    }

    const scopeName = basename(scope.path) || prettyPath(scope.path);

    const visit = async (directory: string, depth: number): Promise<void> => {
      if (entries.length >= prefs.maxResults) {
        truncated = true;
        return;
      }

      let dirents;
      try {
        dirents = await fs.readdir(directory, { withFileTypes: true });
      } catch {
        return; // unreadable folder: skip quietly rather than failing the whole search
      }

      for (const dirent of dirents) {
        if (entries.length >= prefs.maxResults) {
          truncated = true;
          return;
        }
        if (!prefs.showHidden && dirent.name.startsWith(".")) continue;
        if (prefs.excludeNames.has(dirent.name)) continue;

        const fullPath = join(directory, dirent.name);

        // Symlinks are listed but never followed, so the scan cannot loop.
        let isDirectory = dirent.isDirectory();
        const isSymlink = dirent.isSymbolicLink();
        if (isSymlink) {
          try {
            isDirectory = (await fs.stat(fullPath)).isDirectory();
          } catch {
            isDirectory = false;
          }
        }

        const matchesType =
          prefs.itemType === "both" ||
          (prefs.itemType === "folders" && isDirectory) ||
          (prefs.itemType === "files" && !isDirectory);

        if (matchesType) {
          entries.push({
            path: fullPath,
            name: dirent.name,
            isDirectory,
            scopePath: scope.path,
            scopeName,
            relativePath: relative(scope.path, fullPath),
          });
        }

        const canDescend = prefs.maxDepth === 0 || depth < prefs.maxDepth;
        if (isDirectory && !isSymlink && canDescend) {
          await visit(fullPath, depth + 1);
        }
      }
    };

    await visit(scope.path, 1);
  }

  return { entries, missingScopes, truncated };
}

/** Folder to hand to a terminal: the entry itself, or its parent when it is a file. */
export function containingDirectory(entry: Entry): string {
  return entry.isDirectory ? entry.path : dirname(entry.path);
}
