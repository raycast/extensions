import { readdirSync, existsSync } from "fs";
import { join, delimiter } from "path";
import { cpus, homedir } from "os";
import semver from "semver";

// Performance optimization: Cache expensive operations
let cachedPaths: string | null = null;
let cachedIsAppleSilicon: boolean | null = null;

const isWindows = process.platform === "win32";

const getAppleSiliconStatus = (): boolean => {
  if (cachedIsAppleSilicon !== null) return cachedIsAppleSilicon;
  cachedIsAppleSilicon = cpus()[0]?.model?.includes("Apple") ?? false;
  return cachedIsAppleSilicon;
};

// Parse Node.js version string to comparable number using semver library
const parseVersion = (version: string): number => {
  const coerced = semver.coerce(version);
  if (!coerced) return 0;

  return coerced.major * 1000000 + coerced.minor * 1000 + coerced.patch;
};

const sortPathsByVersion = (paths: Array<{ path: string; version: string }>): string[] => {
  return paths.sort((a, b) => parseVersion(b.version) - parseVersion(a.version)).map((item) => item.path);
};

export const resolveFnmBaseDir = (home = homedir()): string | null => {
  if (!home) return null;

  const legacyFnmPath = join(home, ".fnm");
  if (existsSync(legacyFnmPath)) {
    return legacyFnmPath;
  }

  const xdgDataHome = process.env.XDG_DATA_HOME || join(home, ".local", "share");
  return join(xdgDataHome, "fnm");
};

export const resolveVersionManagerPaths = (): string[] => {
  const versionedPaths: Array<{ path: string; version: string }> = [];
  const staticPaths: string[] = [];
  const home = homedir();

  if (!home) return [];

  const nvmVersionsDir = join(home, ".nvm", "versions", "node");
  try {
    const nodeVersions = readdirSync(nvmVersionsDir);
    for (const version of nodeVersions) {
      const binPath = join(nvmVersionsDir, version, "bin");
      if (existsSync(binPath)) {
        versionedPaths.push({ path: binPath, version });
      }
    }
  } catch {
    // Directory doesn't exist or no permissions - continue silently
  }

  const fnmBaseDir = resolveFnmBaseDir(home);
  if (fnmBaseDir) {
    const fnmVersionsDir = join(fnmBaseDir, "node-versions");
    try {
      const nodeVersions = readdirSync(fnmVersionsDir);
      for (const version of nodeVersions) {
        const binPath = join(fnmVersionsDir, version, "installation", "bin");
        if (existsSync(binPath)) {
          versionedPaths.push({ path: binPath, version });
        }
      }
    } catch {
      // Directory doesn't exist or no permissions - continue silently
    }
  }

  const staticPathCandidates = [join(home, ".n", "bin"), join(home, ".volta", "bin")];

  for (const path of staticPathCandidates) {
    if (existsSync(path)) {
      staticPaths.push(path);
    }
  }

  // Sort versioned paths by version (newest first) and append static paths
  const sortedVersionedPaths = sortPathsByVersion(versionedPaths);
  return [...sortedVersionedPaths, ...staticPaths];
};

/**
 * Augments the inherited PATH so the ccusage CLI is resolvable across diverse
 * Node.js installation scenarios. `basePath` is the PATH already present in the
 * environment (read via its real, case-correct key by the caller).
 *
 * On macOS, Raycast launches without the user's shell PATH, so Homebrew, the
 * Node version managers, and system locations are added explicitly. On Windows
 * the user PATH is inherited, so only the npm global prefix (%APPDATA%\npm) —
 * where globally installed shims such as a direct `ccusage` live — is added.
 */
export const getEnhancedNodePaths = (basePath: string): string => {
  if (cachedPaths !== null) return cachedPaths;

  if (isWindows) {
    const appData = process.env.APPDATA;
    const npmGlobalPrefix = appData ? [join(appData, "npm")] : [];
    cachedPaths = [basePath, ...npmGlobalPrefix].filter(Boolean).join(delimiter);
    return cachedPaths;
  }

  const isAppleSilicon = getAppleSiliconStatus();

  const platformPaths = isAppleSilicon
    ? ["/opt/homebrew/bin", "/opt/homebrew/lib/node_modules/.bin"]
    : ["/usr/local/bin", "/usr/local/lib/node_modules/.bin"];

  const versionManagerPaths = resolveVersionManagerPaths();

  const systemPaths = ["/usr/bin", "/bin"];

  const home = homedir();
  if (home) {
    systemPaths.push(`${home}/.npm/bin`, `${home}/.yarn/bin`);
  }

  const allPaths = [basePath, ...platformPaths, ...versionManagerPaths, ...systemPaths];

  cachedPaths = allPaths.filter((path) => path).join(delimiter);
  return cachedPaths;
};

// Optional: Cache clearing function for testing
export const clearPathCache = (): void => {
  cachedPaths = null;
  cachedIsAppleSilicon = null;
};
