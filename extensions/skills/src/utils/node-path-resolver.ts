import { access, readdir } from "node:fs/promises";
import { cpus } from "node:os";
import { join } from "node:path";
import semver from "semver";

const isWindows = process.platform === "win32";
const isMacOS = process.platform === "darwin";

let cachedPaths: string | null = null;
let cachedPathsPromise: Promise<string> | null = null;
let cachedIsAppleSilicon: boolean | null = null;

const getAppleSiliconStatus = (): boolean => {
  if (cachedIsAppleSilicon !== null) return cachedIsAppleSilicon;
  cachedIsAppleSilicon = cpus()[0]?.model?.includes("Apple") ?? false;
  return cachedIsAppleSilicon;
};

const parseVersion = (version: string): number => {
  const coerced = semver.coerce(version);
  if (!coerced) return 0;

  // Convert semver to a sortable number so directory names can be ordered newest-first
  return coerced.major * 1000000 + coerced.minor * 1000 + coerced.patch;
};

const sortPathsByVersion = (paths: Array<{ path: string; version: string }>): string[] => {
  return paths.sort((a, b) => parseVersion(b.version) - parseVersion(a.version)).map((item) => item.path);
};

export const pathExists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const resolveExistingVersionedPaths = async (
  versionedPaths: Array<{ path: string; version: string }>,
): Promise<Array<{ path: string; version: string }>> => {
  const results = await Promise.all(
    versionedPaths.map(async (versionedPath) => ((await pathExists(versionedPath.path)) ? versionedPath : null)),
  );
  return results.filter((item): item is { path: string; version: string } => item !== null);
};

const resolveExistingPaths = async (paths: string[]): Promise<string[]> => {
  const results = await Promise.all(paths.map(async (path) => ((await pathExists(path)) ? path : null)));
  return results.filter((path): path is string => path !== null);
};

const scanVersionedNodePaths = async (
  versionsDir: string,
  getBinPath: (version: string) => string,
): Promise<Array<{ path: string; version: string }>> => {
  try {
    const nodeVersions = await readdir(versionsDir);
    return resolveExistingVersionedPaths(nodeVersions.map((version) => ({ path: getBinPath(version), version })));
  } catch {
    return [];
  }
};

export const resolveFnmBaseDir = async (home = process.env.HOME): Promise<string | null> => {
  if (!home) return null;

  const xdgBaseDir = join(process.env.XDG_DATA_HOME || join(home, ".local", "share"), "fnm");
  const fnmBaseDirCandidates = [xdgBaseDir, join(home, ".fnm")];

  if (isMacOS) {
    fnmBaseDirCandidates.push(join(home, "Library", "Application Support", "fnm"));
  }

  for (const dir of fnmBaseDirCandidates) {
    if (await pathExists(dir)) {
      return dir;
    }
  }

  // Default to the XDG data dir even if it does not exist yet
  return xdgBaseDir;
};

export const resolveVersionManagerPaths = async (): Promise<string[]> => {
  const home = process.env.HOME;

  if (!home) return [];

  const nvmVersionsDir = join(home, ".nvm", "versions", "node");
  const staticPathCandidates = [join(home, ".n", "bin"), join(home, ".volta", "bin")];
  const [nvmPaths, fnmPaths, staticPaths] = await Promise.all([
    scanVersionedNodePaths(nvmVersionsDir, (version) => join(nvmVersionsDir, version, "bin")),
    (async () => {
      const fnmBaseDir = await resolveFnmBaseDir(home);
      if (!fnmBaseDir) return [];

      const fnmVersionsDir = join(fnmBaseDir, "node-versions");
      return scanVersionedNodePaths(fnmVersionsDir, (version) => join(fnmVersionsDir, version, "installation", "bin"));
    })(),
    resolveExistingPaths(staticPathCandidates),
  ]);

  const sortedVersionedPaths = sortPathsByVersion([...nvmPaths, ...fnmPaths]);
  return [...sortedVersionedPaths, ...staticPaths];
};

const buildEnhancedNodePaths = async (): Promise<string> => {
  const isAppleSilicon = getAppleSiliconStatus();

  const platformPaths = isAppleSilicon
    ? ["/opt/homebrew/bin", "/opt/homebrew/lib/node_modules/.bin"]
    : ["/usr/local/bin", "/usr/local/lib/node_modules/.bin"];

  const versionManagerPaths = await resolveVersionManagerPaths();

  const systemPaths = ["/usr/bin", "/bin"];

  if (process.env.HOME) {
    systemPaths.push(`${process.env.HOME}/.npm/bin`, `${process.env.HOME}/.yarn/bin`);
  }

  const allPaths = [...platformPaths, ...versionManagerPaths, ...systemPaths, process.env.PATH || ""];

  cachedPaths = allPaths.filter((path) => path).join(":");
  return cachedPaths;
};

export const getEnhancedNodePaths = async (): Promise<string> => {
  if (cachedPaths !== null) return cachedPaths;
  if (cachedPathsPromise !== null) return cachedPathsPromise;

  if (isWindows) {
    cachedPaths = process.env.PATH || "";
    return cachedPaths;
  }

  cachedPathsPromise = buildEnhancedNodePaths();

  try {
    return await cachedPathsPromise;
  } finally {
    cachedPathsPromise = null;
  }
};

export const clearPathCache = (): void => {
  cachedPaths = null;
  cachedPathsPromise = null;
  cachedIsAppleSilicon = null;
};
