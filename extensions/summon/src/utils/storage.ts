import { environment } from "@raycast/api";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { StorageData, Group } from "./types";

const STORAGE_FILE = path.join(environment.supportPath, "summon-data.json");

function ensureDirectory(): void {
  const dir = path.dirname(STORAGE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function defaultData(): StorageData {
  return { version: 6, groups: [] };
}

/** Migrate data to current format. */
function migrate(raw: Record<string, unknown>): StorageData {
  const version = raw.version as number | undefined;
  if (version === 6) {
    return raw as unknown as StorageData;
  }

  if (version === 5) {
    // v5 -> v6: drop slot field, new fields (frame, displayId, restoreLayout) are optional
    const data = raw as unknown as {
      version: number;
      groups: Array<Group & { slot?: number }>;
    };
    return {
      version: 6,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      groups: data.groups.map(({ slot, ...rest }) => rest),
    };
  }

  if (version === 4) {
    // v4 -> v6: Convert space-based ProjectMapping[] to window-based GroupWindow[]
    const oldGroups =
      (raw.groups as Array<{
        id: string;
        name: string;
        mappings?: Array<{
          displayId: string;
          monitorName: string;
          spaceIndex: number;
          focusWindow?: { bundleId: string; titleMatch: string };
        }>;
      }>) ?? [];

    const groups: Group[] = oldGroups.map((p) => ({
      id: p.id,
      name: p.name,
      windows: (p.mappings ?? [])
        .filter((m) => m.focusWindow)
        .map((m) => ({
          bundleId: m.focusWindow!.bundleId,
          titleMatch: m.focusWindow!.titleMatch,
          appName: m.focusWindow!.titleMatch, // best available
        })),
    }));

    return { version: 6, groups };
  }

  if (version === 2 || version === 3) {
    // v2/v3 -> v6: no focusWindow data to migrate, start with empty windows
    const oldGroups = (raw.groups as Array<{ id: string; name: string }>) ?? [];
    const groups: Group[] = oldGroups.map((p) => ({
      id: p.id,
      name: p.name,
      windows: [],
    }));
    return { version: 6, groups };
  }

  // v1 or unknown: start fresh
  return defaultData();
}

export function readStorage(): StorageData {
  ensureDirectory();
  if (!fs.existsSync(STORAGE_FILE)) {
    const data = defaultData();
    writeStorage(data);
    return data;
  }
  try {
    const raw = fs.readFileSync(STORAGE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const data = migrate(parsed);
    // Write back if migrated
    if ((parsed.version as number) !== 6) {
      writeStorage(data);
    }
    return data;
  } catch {
    const data = defaultData();
    writeStorage(data);
    return data;
  }
}

export function writeStorage(data: StorageData): void {
  ensureDirectory();
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export function generateId(): string {
  return crypto.randomUUID();
}

// --- Groups ---

export function getGroups(): Group[] {
  return readStorage().groups;
}

export function getGroup(id: string): Group | undefined {
  return readStorage().groups.find((p) => p.id === id);
}

export function getGroupByName(name: string): Group | undefined {
  return readStorage().groups.find(
    (p) => p.name.toLowerCase() === name.toLowerCase(),
  );
}

export function saveGroup(group: Group): void {
  const data = readStorage();
  const idx = data.groups.findIndex((p) => p.id === group.id);
  if (idx >= 0) {
    data.groups[idx] = group;
  } else {
    data.groups.push(group);
  }
  writeStorage(data);
}

export function deleteGroup(id: string): void {
  const data = readStorage();
  data.groups = data.groups.filter((p) => p.id !== id);
  writeStorage(data);
}

export function reorderGroup(id: string, direction: "up" | "down"): void {
  const data = readStorage();
  const idx = data.groups.findIndex((p) => p.id === id);
  if (idx < 0) return;
  const targetIdx = direction === "up" ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= data.groups.length) return;
  // Swap
  [data.groups[idx], data.groups[targetIdx]] = [
    data.groups[targetIdx],
    data.groups[idx],
  ];
  writeStorage(data);
}
