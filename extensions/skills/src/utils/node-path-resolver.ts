import { access, readdir } from "node:fs/promises";
import { cpus } from "node:os";
import { join } from "node:path";
import semver from "semver";

type VersionedPath = {
  path: string;
  version: string;
};

const isWindows = process.platform === "win32";
const isMacOS = process.platform === "darwin";

let cachedIsAppleSilicon: boolean | null = null;
let cachedPathsPromise: Promise<string> | null = null;
let cachedPaths: string | null = null;

export const pathExists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const isAppleSilicon = (): boolean => {
  if (cachedIsAppleSilicon !== null) return cachedIsAppleSilicon;
  cachedIsAppleSilicon = cpus()[0]?.model?.includes("Apple") ?? false;
  return cachedIsAppleSilicon;
};

const getVersionSortKey = (version: string): number => {
  const coerced = semver.coerce(version);
  if (!coerced) return 0;

  // Convert semver to a sortable number so directory names can be ordered newest-first
  return coerced.major * 1000000 + coerced.minor * 1000 + coerced.patch;
};

const sortPathsByVersion = (paths: VersionedPath[]): string[] => {
  return paths.sort((a, b) => getVersionSortKey(b.version) - getVersionSortKey(a.version)).map((item) => item.path);
};

const resolveExistingVersionedPaths = async (versionedPaths: VersionedPath[]): Promise<VersionedPath[]> => {
  const results = await Promise.all(
    versionedPaths.map(async (versionedPath) => ((await pathExists(versionedPath.path)) ? versionedPath : null)),
  );
  return results.filter((item): item is VersionedPath => item !== null);
};

const resolveExistingPaths = async (paths: string[]): Promise<string[]> => {
  const results = await Promise.all(paths.map(async (path) => ((await pathExists(path)) ? path : null)));
  return results.filter((path): path is string => path !== null);
};

const resolveExistingVersionedExecutablePaths = async (
  versionedPaths: VersionedPath[],
  executableName: string,
): Promise<VersionedPath[]> => {
  const results = await Promise.all(
    versionedPaths.map(async (versionedPath) =>
      (await pathExists(join(versionedPath.path, executableName))) ? versionedPath : null,
    ),
  );

  return results.filter((item): item is VersionedPath => item !== null);
};

const scanVersionedNodePaths = async (
  versionsDir: string,
  getBinPath: (version: string) => string,
): Promise<VersionedPath[]> => {
  try {
    const nodeVersions = await readdir(versionsDir);
    return resolveExistingVersionedPaths(nodeVersions.map((version) => ({ path: getBinPath(version), version })));
  } catch {
    return [];
  }
};

const resolveHomebrewVersionedNodePaths = async (homebrewPrefix: string): Promise<string[]> => {
  const homebrewOptDir = join(homebrewPrefix, "opt");

  try {
    const formulas = await readdir(homebrewOptDir);
    const versionedPaths: VersionedPath[] = formulas
      .filter((formula) => /^node@.+$/.test(formula))
      .map((formula) => ({
        path: join(homebrewOptDir, formula, "bin"),
        version: formula.slice("node@".length),
      }));

    const existingVersionedPaths = await resolveExistingVersionedExecutablePaths(versionedPaths, "node");
    return sortPathsByVersion(existingVersionedPaths);
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
  const homebrewPrefix = isAppleSilicon() ? "/opt/homebrew" : "/usr/local";

  const homebrewPaths = [join(homebrewPrefix, "bin"), join(homebrewPrefix, "lib", "node_modules", ".bin")];

  const [homebrewVersionedNodePaths, versionManagerPaths] = await Promise.all([
    resolveHomebrewVersionedNodePaths(homebrewPrefix),
    resolveVersionManagerPaths(),
  ]);

  const systemPaths = ["/usr/bin", "/bin"];

  if (process.env.HOME) {
    systemPaths.push(`${process.env.HOME}/.npm/bin`, `${process.env.HOME}/.yarn/bin`);
  }

  const allPaths = [
    ...versionManagerPaths,
    ...homebrewVersionedNodePaths,
    ...homebrewPaths,
    ...systemPaths,
    process.env.PATH || "",
  ];

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
