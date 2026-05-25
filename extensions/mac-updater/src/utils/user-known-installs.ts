import { LocalStorage } from "@raycast/api";
import { KnownInstall } from "./known-install-types";

/**
 * Per-user overrides on top of the curated KNOWN_INSTALLS registry.
 * When a user finds the right cask for an app the extension didn't recognise
 * (e.g. boringNotch → "bankid"), we save the bundleId→cask mapping here so
 * it surfaces automatically on every subsequent scan.
 */
const KEY = "mac-updater-user-known-installs-v1";

type UserMap = Record<string, KnownInstall>;

async function read(): Promise<UserMap> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as UserMap;
  } catch {
    return {};
  }
}

async function write(map: UserMap): Promise<void> {
  await LocalStorage.setItem(KEY, JSON.stringify(map));
}

export async function getUserKnownInstalls(): Promise<UserMap> {
  return read();
}

export async function getUserKnownInstall(
  bundleId: string,
): Promise<KnownInstall | undefined> {
  const map = await read();
  return map[bundleId];
}

export async function addUserCaskMapping(
  bundleId: string,
  caskToken: string,
): Promise<void> {
  const map = await read();
  map[bundleId] = {
    kind: "cask",
    description: "User-defined cask mapping",
    caskToken,
    commands: [`/opt/homebrew/bin/brew install --cask --force "${caskToken}"`],
  };
  await write(map);
}

export async function addUserMasMapping(
  bundleId: string,
  masId: number,
  appName: string,
): Promise<void> {
  const map = await read();
  map[bundleId] = {
    kind: "mas",
    description: "Mac App Store (user-mapped)",
    masId,
    commands: [`/opt/homebrew/bin/mas install ${masId}`],
    homepageUrl: `https://apps.apple.com/app/id${masId}`,
  };
  void appName; // unused but kept in signature for future UI labelling
  await write(map);
}

export async function removeUserMapping(bundleId: string): Promise<void> {
  const map = await read();
  delete map[bundleId];
  await write(map);
}

// Sync helper for use in non-async contexts (after initial load)
let cached: UserMap | null = null;
export async function refreshUserKnownInstallsCache(): Promise<void> {
  cached = await read();
}
export function getCachedUserKnownInstall(
  bundleId: string,
): KnownInstall | undefined {
  return cached?.[bundleId];
}
