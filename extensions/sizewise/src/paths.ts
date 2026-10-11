import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join, normalize } from "node:path";

/**
 * Reads what someone typed or pasted as a folder's absolute path, or returns `undefined` when it
 * isn't one. Accepts `~` for the home folder, a `file://` URL, quotes around the path, and the
 * backslash-escaped spaces that a path dragged into Terminal has.
 */
export function expandPath(text: string, home: string = homedir()): string | undefined {
  let path = text.trim();
  if (path.length >= 2 && /^(["']).*\1$/.test(path)) path = path.slice(1, -1);
  if (path.startsWith("file://")) {
    try {
      path = decodeURIComponent(new URL(path).pathname);
    } catch {
      return undefined;
    }
  } else {
    path = path.replace(/\\(.)/g, "$1");
  }
  if (path === "~") return home;
  if (path.startsWith("~/")) path = join(home, path.slice(2));
  if (!path.startsWith("/")) return undefined;
  const normalized = normalize(path);
  return normalized.length > 1 ? normalized.replace(/\/+$/, "") : normalized;
}

/** How a folder is named in messages: its name, or "your home folder" for the home folder. */
export function folderName(path: string, home: string = homedir()): string {
  if (path === home) return "your home folder";
  return basename(path) || path;
}

/**
 * What is at `path`, from Raycast's point of view. `unreadable` means macOS refused to let Raycast
 * look, as it does for folders that need Full Disk Access, which Sizewise may have even when
 * Raycast doesn't, so callers hand those to Sizewise rather than calling them missing.
 */
export type FolderStatus = "folder" | "notFolder" | "missing" | "unreadable";

export async function folderStatus(
  path: string,
  statPath: (path: string) => Promise<{ isDirectory(): boolean }> = stat,
): Promise<FolderStatus> {
  try {
    return (await statPath(path)).isDirectory() ? "folder" : "notFolder";
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    return code === "EPERM" || code === "EACCES" ? "unreadable" : "missing";
  }
}
