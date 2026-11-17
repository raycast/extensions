import { getPreferenceValues } from "@raycast/api";
import { z } from "zod";
import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";

export type Repository = {
  path: string;
  name: string;
  /** `owner/name` of the GitHub remote, when one could be found. */
  slug: string | undefined;
};

const SCAN_DEPTH = 3;
const SKIPPED_DIRECTORIES = new Set(["node_modules", "Library", "Pods", "build", "dist", "vendor", ".Trash"]);

function expandHome(path: string): string {
  if (path === "~") return homedir();
  return path.startsWith("~/") ? join(homedir(), path.slice(2)) : path;
}

export function repositoryFolders(): string[] {
  const { repositoryFolders } = getPreferenceValues<Preferences>();
  return (repositoryFolders ?? "")
    .split(",")
    .map((folder) => folder.trim())
    .filter(Boolean)
    .map((folder) => resolve(expandHome(folder)));
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export function parseGitHubSlug(remoteUrl: string): string | undefined {
  const match = remoteUrl.trim().match(/[/:]([^/:]+)\/([^/]+?)(?:\.git)?\/?$/);
  return match ? `${match[1]}/${match[2]}` : undefined;
}

async function originSlug(gitDir: string): Promise<string | undefined> {
  try {
    const config = await readFile(join(gitDir, "config"), "utf8");
    const origin = config.match(/\[remote "origin"\][^[]*?url\s*=\s*(\S+)/);
    return origin ? parseGitHubSlug(origin[1]) : undefined;
  } catch {
    return undefined;
  }
}

/** A repository counts when its `.git` directory holds the config written by `gt init`. Linked worktrees are skipped. */
async function asGraphiteRepository(path: string): Promise<Repository | undefined> {
  const gitDir = join(path, ".git");
  if (!(await isDirectory(gitDir))) return undefined;
  if (!(await exists(join(gitDir, ".graphite_repo_config")))) return undefined;
  return { path, name: basename(path), slug: await originSlug(gitDir) };
}

async function scan(folder: string, depth: number, found: Map<string, Repository>): Promise<void> {
  const repository = await asGraphiteRepository(folder);
  if (repository) found.set(repository.path, repository);
  // Any Git root is a boundary, including uninitialized clones and linked worktrees.
  if (await exists(join(folder, ".git"))) return;
  if (depth === 0) return;

  let entries;
  try {
    entries = await readdir(folder, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith(".") && !SKIPPED_DIRECTORIES.has(entry.name)) {
      await scan(join(folder, entry.name), depth - 1, found);
    }
  }
}

export async function findGraphiteRepositories(): Promise<Repository[]> {
  const found = new Map<string, Repository>();
  await Promise.all(repositoryFolders().map((folder) => scan(folder, SCAN_DEPTH, found)));
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function findRepositoryForSlug(repositories: Repository[], owner: string, name: string): Repository | undefined {
  const slug = `${owner}/${name}`.toLowerCase();
  return repositories.find((repository) => repository.slug?.toLowerCase() === slug);
}

/** Reads configured Graphite trunks, tolerating missing or invalid local configuration. */
export async function readGraphiteTrunks(repositoryPath: string): Promise<string[]> {
  try {
    const config = z
      .object({ trunk: z.string().optional(), trunks: z.array(z.object({ name: z.string() })).optional() })
      .loose()
      .parse(JSON.parse(await readFile(join(repositoryPath, ".git", ".graphite_repo_config"), "utf8")));
    const names = config.trunks?.map((trunk) => trunk.name) ?? [];
    if (config.trunk !== undefined) names.unshift(config.trunk);
    return [...new Set(names)];
  } catch {
    return [];
  }
}
