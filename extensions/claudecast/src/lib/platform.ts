import os from "os";
import path from "path";

export function isWindows(platform = process.platform): boolean {
  return platform === "win32";
}

export function isMacOS(platform = process.platform): boolean {
  return platform === "darwin";
}

export function expandHomePath(
  inputPath: string,
  homeDirectory = os.homedir(),
  platform = process.platform,
): string {
  const trimmed = inputPath.trim();
  if (trimmed === "~") return homeDirectory;
  if (
    trimmed.startsWith("~/") ||
    (isWindows(platform) && trimmed.startsWith("~\\"))
  ) {
    return homeDirectory + trimmed.slice(1);
  }
  return trimmed;
}

export function getPathIdentity(
  inputPath: string,
  platform = process.platform,
): string {
  const pathApi = isWindows(platform) ? path.win32 : path.posix;
  const resolved = pathApi.resolve(inputPath);
  return isWindows(platform) ? resolved.toLowerCase() : resolved;
}

/** Match Claude Code's project-directory encoding on each supported OS. */
export function encodeClaudeProjectPath(projectPath: string): string {
  return projectPath.replace(/[^a-zA-Z0-9]/g, "-");
}

export function matchesClaudeProjectDirectory(
  projectPath: string,
  encodedDirectory: string,
  platform = process.platform,
): boolean {
  const current = encodeClaudeProjectPath(projectPath);
  const legacy = isWindows(platform)
    ? projectPath.replace(/[\\/:._]/g, "-")
    : projectPath.replace(/[/._]/g, "-");
  const legacyWithUnderscores = isWindows(platform)
    ? projectPath.replace(/[\\/:.]/g, "-")
    : projectPath.replace(/[/.]/g, "-");
  const equals = (candidate: string) =>
    isWindows(platform)
      ? candidate.toLowerCase() === encodedDirectory.toLowerCase()
      : candidate === encodedDirectory;
  if (equals(current) || equals(legacy) || equals(legacyWithUnderscores)) {
    return true;
  }

  if (current.length > 200) {
    const expectedPrefix = current.slice(0, 200) + "-";
    const directory = isWindows(platform)
      ? encodedDirectory.toLowerCase()
      : encodedDirectory;
    const prefix = isWindows(platform)
      ? expectedPrefix.toLowerCase()
      : expectedPrefix;
    return (
      directory.startsWith(prefix) &&
      /^[a-z0-9]+$/i.test(directory.slice(prefix.length))
    );
  }
  return false;
}

/** Last-resort path decoding for histories without an index or JSONL cwd. */
export function decodeClaudeProjectPathLossy(
  encodedPath: string,
  platform = process.platform,
): string {
  if (isWindows(platform)) {
    const driveMatch = encodedPath.match(/^([A-Za-z])--(.*)$/);
    if (driveMatch) {
      const remainder = driveMatch[2].replace(/-/g, "\\");
      return `${driveMatch[1]}:\\${remainder}`;
    }
    return encodedPath.replace(/-/g, "\\");
  }
  return "/" + encodedPath.slice(1).replace(/-/g, "/");
}

export function extractClaudeSessionCwd(
  jsonlHead: string,
  encodedDirectory: string,
  platform = process.platform,
): string | null {
  for (const line of jsonlHead.split(/\r?\n/)) {
    if (!line.includes('"cwd"')) continue;
    try {
      const value: unknown = JSON.parse(line);
      if (typeof value !== "object" || value === null || !("cwd" in value)) {
        continue;
      }
      const cwd = validateClaudeSessionCwd(
        value.cwd,
        encodedDirectory,
        platform,
      );
      if (cwd) return cwd;
    } catch {
      // Ignore malformed and truncated JSONL lines.
    }
  }
  return null;
}

export function validateClaudeSessionCwd(
  value: unknown,
  encodedDirectory: string,
  platform = process.platform,
): string | null {
  if (typeof value !== "string") return null;
  const pathApi = isWindows(platform) ? path.win32 : path.posix;
  if (!pathApi.isAbsolute(value)) return null;
  return matchesClaudeProjectDirectory(value, encodedDirectory, platform)
    ? value
    : null;
}

export function getClaudeConfigDirectory(
  homeDirectory = os.homedir(),
  env: NodeJS.ProcessEnv = process.env,
  configuredPath?: string,
  platform = process.platform,
): string {
  const value = configuredPath || env.CLAUDE_CONFIG_DIR;
  return value
    ? expandHomePath(value, homeDirectory, platform)
    : path.join(homeDirectory, ".claude");
}

export function getVSCodeStoragePaths(
  homeDirectory = os.homedir(),
  env: NodeJS.ProcessEnv = process.env,
  platform = process.platform,
): string[] {
  const editorDirectories = ["Code", "Code - Insiders", "Cursor", "VSCodium"];

  if (isWindows(platform)) {
    const appData =
      env.APPDATA || path.win32.join(homeDirectory, "AppData", "Roaming");
    return editorDirectories.map((directory) =>
      path.win32.join(
        appData,
        directory,
        "User",
        "globalStorage",
        "storage.json",
      ),
    );
  }

  return editorDirectories.map((directory) =>
    path.join(
      homeDirectory,
      "Library",
      "Application Support",
      directory,
      "User",
      "globalStorage",
      "storage.json",
    ),
  );
}

export function parseFileUri(uri: string, platform = process.platform): string {
  if (!uri.startsWith("file://")) return uri;

  try {
    const parsed = new URL(uri);
    const pathname = decodeURIComponent(parsed.pathname);
    if (isWindows(platform)) {
      const windowsPath = pathname.replace(/\//g, "\\");
      if (parsed.hostname) return `\\\\${parsed.hostname}${windowsPath}`;
      return windowsPath.replace(/^\\(?=[A-Za-z]:\\)/, "");
    }
    return pathname;
  } catch {
    return uri;
  }
}
