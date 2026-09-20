import { execFile } from "child_process";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { homedir } from "os";
import { dirname, join } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/** Where each profile's Electron `--user-data-dir` lives. */
export const PROFILES_ROOT = join(
  homedir(),
  "Library",
  "Application Support",
  "Claude Profiles",
);

/** Shared with the `claude-profiles` CLI, which reads and writes the same file. */
const REGISTRY = join(PROFILES_ROOT, "profiles.json");
const REGISTRY_VERSION = 1;

export interface ClaudeProfile {
  id: string;
  name: string;
  dataDir: string;
  createdAt: number;
}

export async function getProfiles(): Promise<ClaudeProfile[]> {
  try {
    const parsed = JSON.parse(await readFile(REGISTRY, "utf8"));
    return Array.isArray(parsed?.profiles) ? parsed.profiles : [];
  } catch {
    return [];
  }
}

async function saveProfiles(profiles: ClaudeProfile[]): Promise<void> {
  await mkdir(dirname(REGISTRY), { recursive: true });
  const body = JSON.stringify({ version: REGISTRY_VERSION, profiles }, null, 2);
  await writeFile(REGISTRY, `${body}\n`);
}

function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "profile"
  );
}

function uniqueSlug(name: string, existing: ClaudeProfile[]): string {
  const base = slugify(name);
  let slug = base;
  let n = 2;
  while (existing.some((p) => p.id === slug)) slug = `${base}-${n++}`;
  return slug;
}

export async function addProfile(name: string): Promise<ClaudeProfile> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Profile name can't be empty");

  const profiles = await getProfiles();
  const id = uniqueSlug(trimmed, profiles);
  const dataDir = join(PROFILES_ROOT, id);
  await mkdir(dataDir, { recursive: true });

  const profile: ClaudeProfile = {
    id,
    name: trimmed,
    dataDir,
    createdAt: Date.now(),
  };
  await saveProfiles([...profiles, profile]);
  return profile;
}

/** Unregisters a profile, and optionally deletes its login and chats. */
export async function removeProfile(
  id: string,
  deleteData: boolean,
): Promise<void> {
  const profiles = await getProfiles();
  const target = profiles.find((p) => p.id === id);
  await saveProfiles(profiles.filter((p) => p.id !== id));
  if (target && deleteData)
    await rm(target.dataDir, { recursive: true, force: true });
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
