import { LocalStorage } from "@raycast/api";

import fs from "node:fs";

import { ObsidianVault, RecentCapture } from "./types";

const selectedVaultKey = "selected-vault";
const recentCapturesKey = "recent-captures";

export async function getSelectedVault(vaults: ObsidianVault[]): Promise<ObsidianVault | undefined> {
  const selectedPath = await LocalStorage.getItem<string>(selectedVaultKey);
  return vaults.find((vault) => vault.path === selectedPath);
}

export async function saveSelectedVault(vault: ObsidianVault): Promise<void> {
  await LocalStorage.setItem(selectedVaultKey, vault.path);
}

export async function getRecentCaptures(vaultPath: string): Promise<RecentCapture[]> {
  const stored = await LocalStorage.getItem<string>(recentCapturesKey);
  if (!stored) return [];

  try {
    const captures = JSON.parse(stored) as RecentCapture[];
    return captures
      .filter((capture) => capture.vaultPath === vaultPath && fs.existsSync(capture.absolutePath))
      .slice(0, 5);
  } catch {
    return [];
  }
}

export async function addRecentCapture(capture: RecentCapture): Promise<void> {
  const stored = await LocalStorage.getItem<string>(recentCapturesKey);
  let captures: RecentCapture[] = [];
  try {
    captures = stored ? (JSON.parse(stored) as RecentCapture[]) : [];
  } catch {
    captures = [];
  }

  const next = [capture, ...captures.filter((item) => item.absolutePath !== capture.absolutePath)].slice(0, 25);
  await LocalStorage.setItem(recentCapturesKey, JSON.stringify(next));
}

export async function removeRecentCapture(absolutePath: string): Promise<void> {
  const stored = await LocalStorage.getItem<string>(recentCapturesKey);
  if (!stored) return;

  try {
    const captures = JSON.parse(stored) as RecentCapture[];
    await LocalStorage.setItem(
      recentCapturesKey,
      JSON.stringify(captures.filter((capture) => capture.absolutePath !== absolutePath))
    );
  } catch {
    await LocalStorage.removeItem(recentCapturesKey);
  }
}
