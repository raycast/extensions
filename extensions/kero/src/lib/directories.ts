import { homedir } from "node:os";
import { posix } from "node:path";

export function shortenDirectory(directory?: string, home = homedir()): string | undefined {
  return directory === home ? "~" : directory?.startsWith(`${home}/`) ? `~${directory.slice(home.length)}` : directory;
}

// Only change the display label, never the directory used for search or copy.
export function paneDirectoryLabel(
  directory?: string,
  projectDirectory?: string,
  home = homedir(),
): string | undefined {
  if (!directory) return undefined;
  const expandHome = (path: string) =>
    path === "~" ? home : path.startsWith("~/") ? posix.join(home, path.slice(2)) : path;
  const panePath = expandHome(directory);
  const projectPath = projectDirectory ? expandHome(projectDirectory) : undefined;
  if (projectPath && posix.isAbsolute(panePath) && posix.isAbsolute(projectPath)) {
    const relative = posix.relative(projectPath, panePath);
    if (!relative) return undefined;
    if (relative !== ".." && !relative.startsWith("../") && !posix.isAbsolute(relative)) return relative;
  }
  return shortenDirectory(directory, home);
}
