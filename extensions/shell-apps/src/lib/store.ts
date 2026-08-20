import { LocalStorage } from "@raycast/api";
import type { ShellApp } from "./types";

const STORAGE_KEY = "shell-apps";

// Raycast action handlers can run concurrently (e.g. pressing the Duplicate
// shortcut twice in a row), so every read-modify-write on the store is
// serialized through this queue. Without it, two concurrent operations would
// both read the same snapshot and the last save would silently drop the
// other's change - and, for unique names, let duplicates slip through.
let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(operation, operation);
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function getApps(): Promise<ShellApp[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ShellApp[]) : [];
  } catch {
    return [];
  }
}

export async function saveApps(apps: ShellApp[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
}

export async function getAppByName(name: string): Promise<ShellApp | undefined> {
  const apps = await getApps();
  const query = name.trim().toLowerCase();
  return apps.find((app) => app.name.toLowerCase() === query);
}

export async function upsertApp(app: ShellApp): Promise<void> {
  await enqueue(async () => {
    const apps = await getApps();
    const index = apps.findIndex((item) => item.id === app.id);
    if (index >= 0) {
      apps[index] = app;
    } else {
      apps.push(app);
    }
    await saveApps(apps);
  });
}

export async function createApp(entry: ShellApp): Promise<{ ok: true } | { ok: false; existingName: string }> {
  return enqueue(async () => {
    const apps = await getApps();
    const clash = apps.find((item) => item.name.toLowerCase() === entry.name.toLowerCase());
    if (clash) {
      return { ok: false as const, existingName: clash.name };
    }
    apps.push(entry);
    await saveApps(apps);
    return { ok: true as const };
  });
}

export async function createAppWithUniqueName(baseName: string, make: (name: string) => ShellApp): Promise<void> {
  await enqueue(async () => {
    const apps = await getApps();
    const used = new Set(apps.map((item) => item.name.toLowerCase()));
    let name = baseName;
    let counter = 2;
    while (used.has(name.toLowerCase())) {
      name = `${baseName} ${counter}`;
      counter += 1;
    }
    apps.push(make(name));
    await saveApps(apps);
  });
}

export async function deleteApp(id: string): Promise<void> {
  await enqueue(async () => {
    const apps = await getApps();
    await saveApps(apps.filter((item) => item.id !== id));
  });
}
