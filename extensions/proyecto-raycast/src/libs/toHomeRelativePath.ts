import { homedir } from "node:os";
import { normalize } from "node:path";

export function toHomeRelativePath(fullPath: string) {
  const homeDir = homedir();

  // Normalize paths to handle different separators (Windows vs Unix)
  const normalizedFullPath = normalize(fullPath);
  const normalizedHomeDir = normalize(homeDir);

  if (normalizedFullPath.startsWith(normalizedHomeDir)) {
    return `~${normalizedFullPath.slice(normalizedHomeDir.length)}`;
  }

  return fullPath;
}
