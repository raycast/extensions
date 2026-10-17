import { LocalStorage } from "@raycast/api";
import path from "node:path";

export interface Profile {
  id: string;
  name: string;
  /** Configuration item IDs in the form `category/name`. */
  items: string[];
  /** Include current and future physical source items in these categories when the profile is applied. */
  allPlugins?: boolean;
  allSnippets?: boolean;
  /** Explicitly activate components linked by this profile in the Target Vault. */
  enablePlugins?: boolean;
  enableSnippets?: boolean;
  /** New profiles mirror ordinary settings while keeping activation local. Undefined keeps older profile behavior. */
  mirrorSettings?: boolean;
  /** Settings groups to copy when applying this profile. Undefined means all for older mirror profiles. */
  settingsFiles?: Array<"app.json" | "appearance.json" | "hotkeys.json">;
  /** Whole-file live links for settings groups that have no local activation key. */
  linkedSettings?: Array<"app.json" | "appearance.json" | "hotkeys.json">;
}

const PROFILES_KEY = "obsidian-symlink-manager.profiles";
const VAULTS_KEY = "obsidian-symlink-manager.registered-vaults";
const SELECTED_VAULT_KEY = "obsidian-symlink-manager.selected-vault";

function parseArray(value: string | undefined): unknown[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getProfiles(): Promise<Profile[]> {
  const entries = parseArray(await LocalStorage.getItem<string>(PROFILES_KEY));
  return entries.filter((value): value is Profile => {
    if (typeof value !== "object" || value === null) return false;
    const candidate = value as Partial<Profile>;
    return (
      typeof candidate.id === "string" &&
      typeof candidate.name === "string" &&
      Array.isArray(candidate.items) &&
      candidate.items.every((item) => typeof item === "string") &&
      (candidate.allPlugins === undefined || typeof candidate.allPlugins === "boolean") &&
      (candidate.allSnippets === undefined || typeof candidate.allSnippets === "boolean") &&
      (candidate.enablePlugins === undefined || typeof candidate.enablePlugins === "boolean") &&
      (candidate.enableSnippets === undefined || typeof candidate.enableSnippets === "boolean") &&
      (candidate.mirrorSettings === undefined || typeof candidate.mirrorSettings === "boolean") &&
      (candidate.settingsFiles === undefined ||
        (Array.isArray(candidate.settingsFiles) &&
          candidate.settingsFiles.every(
            (file) => file === "app.json" || file === "appearance.json" || file === "hotkeys.json",
          ))) &&
      (candidate.linkedSettings === undefined ||
        (Array.isArray(candidate.linkedSettings) &&
          candidate.linkedSettings.every(
            (file) => file === "app.json" || file === "appearance.json" || file === "hotkeys.json",
          )))
    );
  });
}

export async function saveProfiles(profiles: Profile[]): Promise<void> {
  await LocalStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export async function getRegisteredVaults(): Promise<string[]> {
  return parseArray(await LocalStorage.getItem<string>(VAULTS_KEY)).filter(
    (value): value is string => typeof value === "string" && path.isAbsolute(value),
  );
}

export async function registerVault(vaultPath: string): Promise<void> {
  const normalized = path.resolve(vaultPath);
  const vaults = await getRegisteredVaults();
  if (!vaults.includes(normalized)) {
    await LocalStorage.setItem(VAULTS_KEY, JSON.stringify([...vaults, normalized]));
  }
}

export async function removeVault(vaultPath: string): Promise<void> {
  const normalized = path.resolve(vaultPath);
  const vaults = await getRegisteredVaults();
  await LocalStorage.setItem(VAULTS_KEY, JSON.stringify(vaults.filter((value) => value !== normalized)));
  if ((await getSelectedVault()) === normalized) {
    await LocalStorage.removeItem(SELECTED_VAULT_KEY);
  }
}

export async function getSelectedVault(): Promise<string | undefined> {
  const value = await LocalStorage.getItem<string>(SELECTED_VAULT_KEY);
  return value && path.isAbsolute(value) ? value : undefined;
}

export async function setSelectedVault(vaultPath: string): Promise<void> {
  await LocalStorage.setItem(SELECTED_VAULT_KEY, path.resolve(vaultPath));
}
