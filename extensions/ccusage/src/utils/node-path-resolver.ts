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

export const resolveVersionManagerPaths = (): string[] => {
  const paths: string[] = [];
  const home = process.env.HOME;

  if (!home) return paths;

  const nvmVersionsDir = join(home, ".nvm", "versions", "node");
  try {
    const nodeVersions = readdirSync(nvmVersionsDir);
    for (const version of nodeVersions) {
      const binPath = join(nvmVersionsDir, version, "bin");
      if (existsSync(binPath)) {
        paths.push(binPath);
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
        paths.push(binPath);
      }
    }
  } catch {
    // Directory doesn't exist or no permissions - continue silently
  }

  const staticPaths = [join(home, ".n", "bin"), join(home, ".volta", "bin")];

  for (const path of staticPaths) {
    if (existsSync(path)) {
      paths.push(path);
    }
  }

  return paths;
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
