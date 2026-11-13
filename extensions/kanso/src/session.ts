// Where the key lives and how commands find it. Raycast's LocalStorage is an
// encrypted local database; the "Key" preference, when set, wins.

import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { DEFAULT_PORT, Env, KansoError, checkKey, parsePort } from "./client";

const KEY = "kanso.key";

export const env: Env = {
  fetch: (url, init) => fetch(url, init),
  isKansoRunning: () =>
    new Promise((resolve) => {
      const [cmd, args] =
        process.platform === "win32"
          ? ["tasklist", ["/FI", "IMAGENAME eq kanso.exe", "/NH"]]
          : ["pgrep", ["-xi", "kanso"]];
      execFile(cmd, args, (error, stdout) =>
        resolve(process.platform === "win32" ? /kanso\.exe/i.test(stdout) : error === null),
      );
    }),
};

type Prefs = { port?: string; key?: string };

export function port(): number {
  try {
    return parsePort(getPreferenceValues<Prefs>().port);
  } catch (e) {
    if (e instanceof KansoError) throw e;
    return DEFAULT_PORT;
  }
}

export function looksLikeKey(text: string): boolean {
  return /^kcl_\S{8,}$/.test(text.trim());
}

/** The key to use: the preference, else the paired one. */
export async function currentKey(): Promise<string | undefined> {
  const preferred = getPreferenceValues<Prefs>().key?.trim();
  if (preferred) return preferred;
  return await LocalStorage.getItem<string>(KEY);
}

export async function saveKey(key: string): Promise<void> {
  await LocalStorage.setItem(KEY, key.trim());
}

/** Forgets the paired key, for a 401. */
export async function clearKey(): Promise<void> {
  await LocalStorage.removeItem(KEY);
}

/** Does Kanso still accept the stored key? Clears it when not. */
export async function keyStillWorks(): Promise<boolean> {
  const key = await currentKey();
  if (!key) return false;
  const result = await checkKey(env, port(), key);
  if (result === "unauthorized") {
    await clearKey();
    return false;
  }
  return true;
}
