import { LocalStorage } from "@raycast/api";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const CHROME_DIR = join(homedir(), "Library/Application Support/Google/Chrome");

// The profile Chrome last used, which is also where `--app` windows open.
export function currentProfile(): string {
  try {
    return JSON.parse(readFileSync(join(CHROME_DIR, "Local State"), "utf8")).profile?.last_used || "Default";
  } catch {
    return "Default";
  }
}

// Suggestions the user hid, per Chrome profile. Only filters suggestions; Chrome's history is untouched.
export type Blocklist = { urls: string[]; hosts: string[] };
const blocklistKey = (profile: string) => `blocklist:${profile}`;

export async function loadBlocklist(profile: string): Promise<Blocklist> {
  const raw = await LocalStorage.getItem<string>(blocklistKey(profile));
  if (raw) return JSON.parse(raw);
  // Early builds kept one list for all profiles; hand it to the first profile that loads.
  const legacy = await LocalStorage.getItem<string>("blocklist");
  if (legacy) {
    await LocalStorage.setItem(blocklistKey(profile), legacy);
    await LocalStorage.removeItem("blocklist");
    return JSON.parse(legacy);
  }
  return { urls: [], hosts: [] };
}

export async function saveBlocklist(profile: string, blocklist: Blocklist): Promise<void> {
  await LocalStorage.setItem(blocklistKey(profile), JSON.stringify(blocklist));
}
