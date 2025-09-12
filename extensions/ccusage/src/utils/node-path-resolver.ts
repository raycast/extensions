import { readdirSync, existsSync } from "fs";
import { join } from "path";
import { cpus } from "os";

// Performance optimization: Cache expensive operations
let cachedPaths: string | null = null;
let cachedIsAppleSilicon: boolean | null = null;

const getAppleSiliconStatus = (): boolean => {
  if (cachedIsAppleSilicon !== null) return cachedIsAppleSilicon;
  cachedIsAppleSilicon = cpus()[0]?.model?.includes("Apple") ?? false;
  return cachedIsAppleSilicon;
};

// Parse Node.js version string to comparable number (e.g., "18.17.1" -> 18017001)
const parseVersion = (version: string): number => {
  const versionMatch = version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!versionMatch) return 0;

  const [, major, minor, patch] = versionMatch;
  return parseInt(major) * 1000000 + parseInt(minor) * 1000 + parseInt(patch);
};

const sortPathsByVersion = (paths: Array<{ path: string; version: string }>): string[] => {
  return paths.sort((a, b) => parseVersion(b.version) - parseVersion(a.version)).map((item) => item.path);
};

export const resolveVersionManagerPaths = (): string[] => {
  const versionedPaths: Array<{ path: string; version: string }> = [];
  const staticPaths: string[] = [];
  const home = process.env.HOME;

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

  const fnmVersionsDir = join(home, ".fnm", "node-versions");
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
 * Runtime workaround: Ensures npx availability across diverse Node.js installation scenarios
 * Performance optimized with caching to avoid repeated filesystem operations
 */
export const getEnhancedNodePaths = (): string => {
  if (cachedPaths !== null) return cachedPaths;

  const isAppleSilicon = getAppleSiliconStatus();

  const platformPaths = isAppleSilicon
    ? ["/opt/homebrew/bin", "/opt/homebrew/lib/node_modules/.bin"]
    : ["/usr/local/bin", "/usr/local/lib/node_modules/.bin"];

  const versionManagerPaths = resolveVersionManagerPaths();

  const systemPaths = ["/usr/bin", "/bin"];

  if (process.env.HOME) {
    systemPaths.push(`${process.env.HOME}/.npm/bin`, `${process.env.HOME}/.yarn/bin`);
  }

  const allPaths = [process.env.PATH || "", ...platformPaths, ...versionManagerPaths, ...systemPaths];

  cachedPaths = allPaths.filter((path) => path).join(":");
  return cachedPaths;
};

// Optional: Cache clearing function for testing
export const clearPathCache = (): void => {
  cachedPaths = null;
  cachedIsAppleSilicon = null;
};
