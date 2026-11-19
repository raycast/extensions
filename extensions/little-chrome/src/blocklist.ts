import { LocalStorage } from "@raycast/api";
import { homedir } from "node:os";
import { join } from "node:path";

export const CHROME_DIR = join(homedir(), "Library/Application Support/Google/Chrome");

// Suggestions the user hid, per Chrome profile. Only filters suggestions; Chrome's history is untouched.
export type Blocklist = { urls: string[]; hosts: string[] };
const blocklistKey = (profile: string) => `blocklist:${profile}`;

export async function loadBlocklist(profile: string): Promise<Blocklist> {
  const raw = await LocalStorage.getItem<string>(blocklistKey(profile));
  return raw ? JSON.parse(raw) : { urls: [], hosts: [] };
}

export async function saveBlocklist(profile: string, blocklist: Blocklist): Promise<void> {
  await LocalStorage.setItem(blocklistKey(profile), JSON.stringify(blocklist));
}

export function isBlocked(url: string, blocklist: Blocklist): boolean {
  if (blocklist.urls.includes(url)) return true;
  try {
    const { protocol, host } = new URL(url);
    return (protocol === "https:" || protocol === "http:") && blocklist.hosts.includes(host);
  } catch {
    return false;
  }
}
