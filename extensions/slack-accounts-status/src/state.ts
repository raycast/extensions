import { environment, LocalStorage } from "@raycast/api";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import lockfile from "proper-lockfile";
import { Account, isStoredAccount, isPreset, Preset } from "./domain";

const accountsKey = "accounts-v1";
const presetsKey = "presets-v1";

export async function withStateLock<T>(action: () => Promise<T>): Promise<T> {
  await mkdir(environment.supportPath, { recursive: true });
  const release = await lockfile
    .lock(join(environment.supportPath, "slack-status-state"), {
      realpath: false,
      stale: 60000,
      retries: { retries: 5, minTimeout: 200, maxTimeout: 1000 },
    })
    .catch(() => {
      throw new Error("Another Slack status command is updating your accounts. Try again shortly.");
    });
  try {
    return await action();
  } finally {
    await release();
  }
}

async function readArray<T>(key: string, guard: (value: unknown) => value is T): Promise<T[]> {
  const stored = await LocalStorage.getItem<string>(key);
  if (stored === undefined) return [];
  const value: unknown = JSON.parse(stored);
  if (!Array.isArray(value) || !value.every(guard))
    throw new Error("Saved extension data could not be read. Contact the extension author before resetting it.");
  return value;
}

export async function readAccounts(): Promise<Account[]> {
  const stored = await readArray(accountsKey, isStoredAccount);
  return stored.map((account) => ({ ...account, state: account.state ?? "ready" }));
}
export const readPresets = () => readArray(presetsKey, isPreset);

export async function writeAccounts(accounts: Account[]): Promise<void> {
  await LocalStorage.setItem(accountsKey, JSON.stringify(accounts));
}

export async function savePreset(preset: Preset): Promise<void> {
  await withStateLock(async () => {
    const presets = await readPresets();
    await LocalStorage.setItem(
      presetsKey,
      JSON.stringify([...presets.filter((item) => item.id !== preset.id), preset]),
    );
  });
}

export async function deletePreset(id: string): Promise<void> {
  await withStateLock(async () => {
    const presets = await readPresets();
    await LocalStorage.setItem(presetsKey, JSON.stringify(presets.filter((item) => item.id !== id)));
  });
}
