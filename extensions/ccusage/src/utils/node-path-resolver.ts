import { readdirSync, existsSync } from "fs";
import { join } from "path";
import { cpus } from "os";

/**
 * Resolves version manager paths by dynamically detecting installed Node.js versions
 * @returns Array of valid bin paths from version managers
 */
const resolveVersionManagerPaths = (): string[] => {
  const paths: string[] = [];
  const home = process.env.HOME;

  if (!home) return paths;

  // Resolve nvm paths
  const nvmVersionsDir = join(home, ".nvm", "versions", "node");
  if (existsSync(nvmVersionsDir)) {
    try {
      const nodeVersions = readdirSync(nvmVersionsDir);
      for (const version of nodeVersions) {
        const binPath = join(nvmVersionsDir, version, "bin");
        if (existsSync(binPath)) {
          paths.push(binPath);
        }
      }
    } catch {
      // Ignore errors in reading directory
    }
  }

  // Resolve fnm paths
  const fnmVersionsDir = join(home, ".fnm", "node-versions");
  if (existsSync(fnmVersionsDir)) {
    try {
      const nodeVersions = readdirSync(fnmVersionsDir);
      for (const version of nodeVersions) {
        const binPath = join(fnmVersionsDir, version, "installation", "bin");
        if (existsSync(binPath)) {
          paths.push(binPath);
        }
      }
    } catch {
      // Ignore errors in reading directory
    }
  }

  // Static paths for other version managers
  const staticPaths = [join(home, ".n", "bin"), join(home, ".volta", "bin")];

  for (const path of staticPaths) {
    if (existsSync(path)) {
      paths.push(path);
    }
  }

  return paths;
};

/**
 * Gets enhanced NODE_PATH with platform-specific paths and version manager paths
 * @returns Colon-separated PATH string for Node.js execution
 */
export const getEnhancedNodePaths = (): string => {
  const isAppleSilicon = cpus()[0]?.model?.includes("Apple") ?? false;

  const platformPaths = isAppleSilicon
    ? ["/opt/homebrew/bin", "/opt/homebrew/lib/node_modules/.bin"]
    : ["/usr/local/bin", "/usr/local/lib/node_modules/.bin"];

  const versionManagerPaths = resolveVersionManagerPaths();

  const systemPaths = ["/usr/bin", "/bin"];

  if (process.env.HOME) {
    systemPaths.push(`${process.env.HOME}/.npm/bin`, `${process.env.HOME}/.yarn/bin`);
  }

  const allPaths = [process.env.PATH || "", ...platformPaths, ...versionManagerPaths, ...systemPaths];

  return allPaths.filter((path) => path).join(":");
};
