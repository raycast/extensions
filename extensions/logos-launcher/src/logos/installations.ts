import fs from "fs/promises";
import os from "os";
import path from "path";
import { expandTilde, pathExists } from "../utils/fs";

const LOGOS_DIR_CANDIDATES = ["Logos4", "Logos", "Verbum4", "Verbum"];
const LOGOS_DIR_MATCHERS = [/^logos/i, /^verbum/i];
const APPLICATION_SUPPORT = path.join(os.homedir(), "Library", "Application Support");

const READING_PLAN_RELATIVE_PATHS = [
  path.join("Documents", "ReadingPlan", "ReadingPlan.db"),
  path.join("ReadingPlan", "ReadingPlan.db"),
  "ReadingPlan.db",
];

const LAYOUT_RELATIVE_PATHS = [
  path.join("LayoutManager", "layouts.db"),
  path.join("Layouts", "layouts.db"),
  "layouts.db",
];

type DatabaseMatch = {
  path: string;
  mtimeMs: number;
};

export async function findReadingPlanDatabase(preferencePath?: string) {
  return findDatabase({
    preferencePath,
    relativePaths: READING_PLAN_RELATIVE_PATHS,
    label: "reading plan",
  });
}

export async function findLayoutsDatabase(preferencePath?: string) {
  return findDatabase({
    preferencePath,
    relativePaths: LAYOUT_RELATIVE_PATHS,
    label: "layout",
  });
}

async function findDatabase(options: { preferencePath?: string; relativePaths: string[]; label: string }) {
  if (options.preferencePath) {
    const resolved = await resolvePreferencePath(options.preferencePath, options.relativePaths);
    if (resolved) {
      return resolved.path;
    }
    throw new Error(`Could not find ${options.label} database at ${expandTilde(options.preferencePath)}`);
  }

  const candidates = await discoverDatabases(options.relativePaths);
  if (!candidates.length) {
    throw new Error(
      `No ${options.label} database found. Launch Logos once, then try again. You may need to grant Raycast Full Disk Access.`,
    );
  }
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates[0].path;
}

async function discoverDatabases(relativePaths: string[]): Promise<DatabaseMatch[]> {
  const rootEntries = await readDirectoryEntries(APPLICATION_SUPPORT);
  const baseDirs: string[] = [];
  for (const entry of rootEntries) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (LOGOS_DIR_CANDIDATES.includes(entry.name) || LOGOS_DIR_MATCHERS.some((matcher) => matcher.test(entry.name))) {
      baseDirs.push(path.join(APPLICATION_SUPPORT, entry.name));
    }
  }

  const matches: DatabaseMatch[] = [];
  for (const basePath of baseDirs) {
    const documentsRoot = path.join(basePath, "Documents");
    const accountEntries = await readDirectoryEntries(documentsRoot);
    for (const account of accountEntries) {
      if (!account.isDirectory()) {
        continue;
      }
      const accountRoot = path.join(documentsRoot, account.name);
      const resolved = await resolveFromDirectory(accountRoot, relativePaths, 0);
      if (resolved) {
        matches.push(resolved);
      }
    }
  }

  return matches;
}

async function resolvePreferencePath(preferencePath: string, relativePaths: string[]) {
  const fullPath = expandTilde(preferencePath);
  const stats = await safeStat(fullPath);
  if (!stats) {
    return undefined;
  }
  if (stats.isFile()) {
    return { path: fullPath, mtimeMs: stats.mtimeMs };
  }
  if (!stats.isDirectory()) {
    return undefined;
  }

  return resolveFromDirectory(fullPath, relativePaths, 0);
}

async function resolveFromDirectory(
  dir: string,
  relativePaths: string[],
  depth: number,
): Promise<DatabaseMatch | undefined> {
  const match = await tryRelativePaths(dir, relativePaths);
  if (match) {
    return match;
  }

  if (depth >= 2) {
    return undefined;
  }

  const entries = await readDirectoryEntries(dir);
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const nested = await resolveFromDirectory(path.join(dir, entry.name), relativePaths, depth + 1);
    if (nested) {
      return nested;
    }
  }

  return undefined;
}

async function tryRelativePaths(baseDir: string, relativePaths: string[]): Promise<DatabaseMatch | undefined> {
  for (const relative of relativePaths) {
    const candidate = path.join(baseDir, relative);
    if (await pathExists(candidate)) {
      const stats = await fs.stat(candidate);
      if (stats.isFile()) {
        return { path: candidate, mtimeMs: stats.mtimeMs };
      }
    }
  }
  return undefined;
}

async function readDirectoryEntries(target: string) {
  try {
    return await fs.readdir(target, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function safeStat(target: string) {
  try {
    return await fs.stat(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}
