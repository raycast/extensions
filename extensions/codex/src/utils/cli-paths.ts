import nodePath from "node:path";

export const bundledCodexCliPath =
  "/Applications/ChatGPT.app/Contents/Resources/codex";

// Homebrew, npm -g, and the official standalone installer symlink.
export function userInstalledCodexCliPaths(homeDirectory: string): string[] {
  return [
    "/opt/homebrew/bin/codex",
    "/usr/local/bin/codex",
    nodePath.join(homeDirectory, ".local", "bin", "codex"),
  ];
}

// Managed standalone install written by the Codex app updater.
export function standaloneCodexCliPath(homeDirectory: string): string {
  return nodePath.join(
    homeDirectory,
    ".codex",
    "packages",
    "standalone",
    "current",
    "codex",
  );
}

export function buildCodexCliCandidatePaths(
  preferredPath: string | undefined,
  homeDirectory: string,
): string[] {
  return Array.from(
    new Set([
      ...(preferredPath ? [preferredPath] : []),
      bundledCodexCliPath,
      standaloneCodexCliPath(homeDirectory),
      ...userInstalledCodexCliPaths(homeDirectory),
    ]),
  );
}
