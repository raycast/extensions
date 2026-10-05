import { execFile } from "child_process";
import {
  mkdir,
  readdir,
  readFile,
  realpath,
  rename,
  stat,
  writeFile,
} from "fs/promises";
import { homedir } from "os";
import { basename, isAbsolute, join, relative, resolve } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/** Where each profile's Electron `--user-data-dir` lives. */
export const PROFILES_ROOT = join(
  homedir(),
  "Library",
  "Application Support",
  "Claude Profiles",
);

const REGISTRY_NAME = "profiles.json";
const REGISTRY_VERSION = 1;
/** folders under the root that are not profiles. */
const RESERVED = new Set(["icons"]);

export interface ClaudeProfile {
  id: string;
  name: string;
  dataDir: string;
  createdAt: number;
}

/** the registry exists but cannot be trusted; nothing is written until it is fixed. */
export class RegistryError extends Error {
  readonly path: string;

  constructor(message: string, path: string) {
    super(message);
    this.name = "RegistryError";
    this.path = path;
  }
}

export function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "profile"
  );
}

function isMissing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === "ENOENT";
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isProfile(row: unknown): row is ClaudeProfile {
  const r = row as Partial<ClaudeProfile> | null;
  return (
    typeof r?.id === "string" &&
    typeof r.name === "string" &&
    typeof r.dataDir === "string"
  );
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (isMissing(error)) return false;
    throw error;
  }
}

/** the registry shared with the `claude-profiles` CLI, plus the folders beside it. */
export function createRegistry(root = PROFILES_ROOT) {
  const registryPath = join(root, REGISTRY_NAME);

  async function load(): Promise<ClaudeProfile[]> {
    let text: string;
    try {
      text = await readFile(registryPath, "utf8");
    } catch (error) {
      if (isMissing(error)) return [];
      throw new RegistryError(
        `Couldn't read ${REGISTRY_NAME}: ${describe(error)}`,
        registryPath,
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      throw new RegistryError(
        `${REGISTRY_NAME} is not valid JSON (${describe(error)}). Profile folders are intact; fix or remove the file.`,
        registryPath,
      );
    }
    const rows = (parsed as { profiles?: unknown } | null)?.profiles;
    if (!Array.isArray(rows)) {
      throw new RegistryError(
        `${REGISTRY_NAME} has no "profiles" list. Profile folders are intact; fix or remove the file.`,
        registryPath,
      );
    }
    const bad = rows.findIndex((row) => !isProfile(row));
    if (bad !== -1) {
      throw new RegistryError(
        `${REGISTRY_NAME} row ${bad + 1} lacks an id, name or dataDir. Profile folders are intact; fix or remove the file.`,
        registryPath,
      );
    }
    return rows.map((p) => ({
      ...p,
      createdAt: typeof p.createdAt === "number" ? p.createdAt : 0,
    }));
  }

  async function save(profiles: ClaudeProfile[]): Promise<void> {
    await mkdir(root, { recursive: true });
    const tmp = `${registryPath}.${process.pid}.tmp`;
    const body = JSON.stringify(
      { version: REGISTRY_VERSION, profiles },
      null,
      2,
    );
    await writeFile(tmp, `${body}\n`);
    await rename(tmp, registryPath);
  }

  /** a folder path is only deletable when it really sits inside the root. */
  async function confine(dataDir: string): Promise<string | null> {
    let real: string;
    try {
      real = await realpath(dataDir);
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
    const rel = relative(await realpath(root), real);
    if (!rel || rel.startsWith("..") || isAbsolute(rel)) {
      throw new Error(
        `${dataDir} is outside ${root}; delete it by hand if you mean to.`,
      );
    }
    return real;
  }

  async function uniqueSlug(name: string, taken: Set<string>): Promise<string> {
    const base = slugify(name);
    let slug = base;
    for (let n = 2; taken.has(slug) || (await exists(join(root, slug))); n++) {
      slug = `${base}-${n}`;
    }
    return slug;
  }

  return {
    path: registryPath,
    root,
    load,

    /** profile folders under the root that no registry row points at. */
    async orphans(): Promise<string[]> {
      let entries;
      try {
        entries = await readdir(root, { withFileTypes: true });
      } catch (error) {
        if (isMissing(error)) return [];
        throw error;
      }
      const registered = new Set((await load()).map((p) => resolve(p.dataDir)));
      return entries
        .filter((e) => e.isDirectory() && !RESERVED.has(e.name))
        .map((e) => join(root, e.name))
        .filter((dir) => !registered.has(resolve(dir)))
        .sort();
    },

    /** the unregistered folder a fresh profile of this name would collide with, if any. */
    async orphanFor(name: string): Promise<string | null> {
      const dir = join(root, slugify(name));
      const registered = (await load()).some(
        (p) => resolve(p.dataDir) === resolve(dir),
      );
      return !registered && (await exists(dir)) ? dir : null;
    },

    async add(name: string): Promise<ClaudeProfile> {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Profile name can't be empty");
      const profiles = await load();
      const id = await uniqueSlug(trimmed, new Set(profiles.map((p) => p.id)));
      const dataDir = join(root, id);
      await mkdir(dataDir, { recursive: true });
      const profile = { id, name: trimmed, dataDir, createdAt: Date.now() };
      await save([...profiles, profile]);
      return profile;
    },

    /** put an unregistered folder back in the list, keeping its login and chats. */
    async restore(dataDir: string, name?: string): Promise<ClaudeProfile> {
      const profiles = await load();
      const folder = basename(dataDir);
      const taken = new Set(profiles.map((p) => p.id));
      const id = taken.has(folder) ? await uniqueSlug(folder, taken) : folder;
      const profile = {
        id,
        name: name?.trim() || folder,
        dataDir,
        createdAt: Date.now(),
      };
      await save([...profiles, profile]);
      return profile;
    },

    async rename(id: string, name: string): Promise<ClaudeProfile> {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Profile name can't be empty");
      const profiles = await load();
      const target = profiles.find((p) => p.id === id);
      if (!target) throw new Error(`No profile "${id}" in the list`);
      const renamed = { ...target, name: trimmed };
      await save(profiles.map((p) => (p.id === id ? renamed : p)));
      return renamed;
    },

    /** take a profile off the list; its folder is untouched. */
    async remove(id: string): Promise<void> {
      const profiles = await load();
      if (!profiles.some((p) => p.id === id))
        throw new Error(`No profile "${id}" in the list`);
      await save(profiles.filter((p) => p.id !== id));
    },

    /** the real path of a folder once it is known to sit inside the root; null when gone. */
    confineFolder(dataDir: string): Promise<string | null> {
      return confine(dataDir);
    },
  };
}

export type Registry = ReturnType<typeof createRegistry>;

export const registry = createRegistry();

/** true when a Claude process holds this data directory open. */
export async function isRunning(dataDir: string): Promise<boolean> {
  try {
    await execFileAsync("pgrep", ["-f", "--", `--user-data-dir=${dataDir}`]);
    return true;
  } catch {
    return false;
  }
}

/**
 * `-n` forces a new process even when Claude already runs under another
 * profile; `--user-data-dir` relocates auth, chats and settings to dataDir.
 */
export async function launchClaudeProfile(dataDir: string): Promise<void> {
  await execFileAsync("open", [
    "-n",
    "-a",
    "Claude",
    "--args",
    `--user-data-dir=${dataDir}`,
  ]);
}
