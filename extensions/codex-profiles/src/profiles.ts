import { LocalStorage } from "@raycast/api";
import { access, lstat, mkdir, readdir, rmdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { withDirectoryLock } from "./directory-lock";

const STORAGE_KEY = "codex-profile-registry-v1";
const HOME = homedir();
const DEFAULT_PATH = join(HOME, ".codex");
const PROFILES_HOME = join(HOME, ".codex-profiles");
const LEGACY_PERSONAL_ID = "personal-c48474c6";
const REGISTRY_LOCK_PATH = join(PROFILES_HOME, ".registry-mutation-lock");

export interface CodexProfile {
  id: string;
  name: string;
  path: string;
  required: boolean;
}

export interface UnlinkedProfileFolder {
  id: string;
  path: string;
  suggestedName: string;
}

interface StoredProfile {
  id: string;
  name: string;
}

interface ProfileRegistry {
  version: 1;
  defaultName: string;
  profiles: StoredProfile[];
}

function defaultRegistry(): ProfileRegistry {
  return {
    version: 1,
    defaultName: "Work",
    profiles: [],
  };
}

function validName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Enter a profile name.");
  if (trimmed.length > 48) throw new Error("Profile names must be 48 characters or fewer.");
  return trimmed;
}

function validId(id: unknown): id is string {
  return typeof id === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readRegistry(): Promise<ProfileRegistry> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (raw === undefined) {
    const registry = defaultRegistry();
    const personalPath = join(PROFILES_HOME, LEGACY_PERSONAL_ID);
    if (await pathExists(personalPath)) {
      registry.profiles.push({ id: LEGACY_PERSONAL_ID, name: "Personal" });
    }
    return registry;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("The saved profile list is invalid. It has not been changed.");
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    (parsed as ProfileRegistry).version !== 1 ||
    typeof (parsed as ProfileRegistry).defaultName !== "string" ||
    !Array.isArray((parsed as ProfileRegistry).profiles)
  ) {
    throw new Error("The saved profile list is invalid. It has not been changed.");
  }

  const registry = parsed as ProfileRegistry;
  registry.profiles = registry.profiles.filter(
    (profile): profile is StoredProfile =>
      Boolean(profile) &&
      validId(profile.id) &&
      typeof profile.name === "string" &&
      Boolean(profile.name.trim()) &&
      profile.id !== "default",
  );
  return registry;
}

async function writeRegistry(registry: ProfileRegistry): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
}

async function withRegistryLock<T>(operation: () => Promise<T>): Promise<T> {
  await mkdir(PROFILES_HOME, { recursive: true });
  return withDirectoryLock(REGISTRY_LOCK_PATH, operation, {
    waitTimeoutMs: 10_000,
    retryDelayMs: 50,
  });
}

function profilesFromRegistry(registry: ProfileRegistry): CodexProfile[] {
  return [
    {
      id: "default",
      name: registry.defaultName,
      path: DEFAULT_PATH,
      required: true,
    },
    ...registry.profiles.map((profile) => ({
      ...profile,
      path: join(PROFILES_HOME, profile.id),
      required: false,
    })),
  ];
}

export async function getProfiles(): Promise<CodexProfile[]> {
  return profilesFromRegistry(await readRegistry());
}

export async function getUnlinkedProfileFolders(): Promise<UnlinkedProfileFolder[]> {
  const registry = await readRegistry();
  let entries;
  try {
    entries = await readdir(PROFILES_HOME, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  const linkedIds = new Set(registry.profiles.map((profile) => profile.id));
  return entries
    .filter((entry) => entry.isDirectory() && validId(entry.name) && !linkedIds.has(entry.name))
    .map((entry) => {
      const id = entry.name;
      const readableName = id.replace(/-[a-f0-9]{8}$/i, "").replace(/-/g, " ");
      const suggestedName = readableName.replace(/\b\w/g, (letter) => letter.toUpperCase());
      return { id, path: join(PROFILES_HOME, id), suggestedName };
    })
    .sort((first, second) => first.suggestedName.localeCompare(second.suggestedName));
}

function ensureUniqueName(name: string, profiles: CodexProfile[], ignoredId?: string): void {
  if (profiles.some((profile) => profile.id !== ignoredId && profile.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
    throw new Error("A profile with that name already exists.");
  }
}

function slugForName(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "profile";
}

export async function createProfile(rawName: string): Promise<CodexProfile> {
  const name = validName(rawName);
  return withRegistryLock(async () => {
    const registry = await readRegistry();
    const profiles = profilesFromRegistry(registry);
    ensureUniqueName(name, profiles);

    const baseId = slugForName(name);
    let id = baseId;
    let suffix = 2;
    let path = join(PROFILES_HOME, id);
    while (true) {
      try {
        await mkdir(path);
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        id = `${baseId}-${suffix}`;
        suffix += 1;
        path = join(PROFILES_HOME, id);
      }
    }

    registry.profiles.push({ id, name });
    try {
      await writeRegistry(registry);
    } catch (error) {
      // Only remove the empty directory created above; never recursively
      // delete data that ChatGPT or another process may already have written.
      await rmdir(path).catch(() => undefined);
      throw error;
    }
    return { id, name, path, required: false };
  });
}

export async function reattachProfileFolder(id: string, rawName: string): Promise<CodexProfile> {
  if (!validId(id)) throw new Error("That profile folder name is not valid.");
  const name = validName(rawName);
  return withRegistryLock(async () => {
    const registry = await readRegistry();
    const profiles = profilesFromRegistry(registry);
    ensureUniqueName(name, profiles);
    if (registry.profiles.some((profile) => profile.id === id)) {
      throw new Error("That folder is already linked to a profile.");
    }

    const path = join(PROFILES_HOME, id);
    const details = await lstat(path).catch(() => undefined);
    if (!details?.isDirectory()) throw new Error("That profile folder no longer exists.");

    registry.profiles.push({ id, name });
    await writeRegistry(registry);
    return { id, name, path, required: false };
  });
}

export async function renameProfile(id: string, rawName: string): Promise<void> {
  const name = validName(rawName);
  await withRegistryLock(async () => {
    const registry = await readRegistry();
    const profiles = profilesFromRegistry(registry);
    const target = profiles.find((profile) => profile.id === id);
    if (!target) throw new Error("Profile not found.");
    ensureUniqueName(name, profiles, id);

    if (id === "default") {
      registry.defaultName = name;
    } else {
      const stored = registry.profiles.find((profile) => profile.id === id);
      if (!stored) throw new Error("Profile not found.");
      stored.name = name;
    }
    await writeRegistry(registry);
  });
}

export async function removeProfileFromList(id: string): Promise<void> {
  if (id === "default") throw new Error("The required ~/.codex profile cannot be removed.");
  await withRegistryLock(async () => {
    const registry = await readRegistry();
    const before = registry.profiles.length;
    registry.profiles = registry.profiles.filter((profile) => profile.id !== id);
    if (registry.profiles.length === before) throw new Error("Profile not found.");
    await writeRegistry(registry);
  });
}

export function displayProfilePath(path: string): string {
  return path.startsWith(HOME) ? `~${path.slice(HOME.length)}` : path;
}
