import { homedir } from "os";
import { join } from "path";

export function ensureToolingInPath(currentPath: string = process.env.PATH || ""): string {
  const requiredPaths = [
    "/usr/bin",
    "/bin",
    "/usr/local/bin",
    "/opt/homebrew/bin",
    join(homedir(), ".local", "bin"),
    join(homedir(), ".cargo", "bin"),
  ];

  const pathEntries = currentPath.split(":").filter(Boolean);
  const missingPaths = requiredPaths.filter((path) => !pathEntries.includes(path));

  if (missingPaths.length === 0) {
    return currentPath;
  }

  return [...missingPaths, currentPath].filter(Boolean).join(":");
}
