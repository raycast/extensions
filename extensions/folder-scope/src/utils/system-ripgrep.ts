import { constants as fsConstants } from "node:fs";
import { access, stat } from "node:fs/promises";
import { delimiter, isAbsolute, join, resolve } from "node:path";

function candidatePaths(pathValue: string | undefined, platform: NodeJS.Platform, cwd: string): string[] {
  const fromPath = (pathValue ?? "")
    .split(delimiter)
    .filter(Boolean)
    .map((directory) => join(isAbsolute(directory) ? directory : resolve(cwd, directory), "rg"));

  const commonMacPaths =
    platform === "darwin" ? ["/opt/homebrew/bin/rg", "/usr/local/bin/rg", "/opt/local/bin/rg"] : [];
  return [...new Set([...fromPath, ...commonMacPaths])];
}

export interface ResolveSystemRipgrepOptions {
  pathValue?: string;
  platform?: NodeJS.Platform;
  cwd?: string;
}

/** Resolves an executable absolute path without asking a shell to interpret PATH. */
export async function resolveSystemRipgrep(options: ResolveSystemRipgrepOptions = {}): Promise<string | undefined> {
  const candidates = candidatePaths(
    options.pathValue ?? process.env.PATH,
    options.platform ?? process.platform,
    options.cwd ?? process.cwd(),
  );

  for (const candidate of candidates) {
    try {
      const metadata = await stat(candidate);
      if (!metadata.isFile()) continue;
      await access(candidate, fsConstants.X_OK);
      return candidate;
    } catch {
      // Try the next PATH entry/common installation path.
    }
  }
  return undefined;
}
