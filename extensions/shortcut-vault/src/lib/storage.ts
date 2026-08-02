import { LocalStorage, environment } from "@raycast/api";
import { MODIFIERS, OWNER_TYPES, SCOPE_TYPES, type Shortcut, type ShortcutFormValues } from "../types/shortcut";
import { GENERAL_OWNER_NAME, inferCustomOwnerType } from "./owner-type";
import { isSafeHttpUrl } from "./safe-url";
import { createSerialTaskQueue } from "./serial-task-queue";
import { formatShortcutDisplay, normalizeKey, normalizeModifiers } from "./shortcut-format";
import { prepareImportedShortcuts, type PreparedImport } from "./import-export-format";
import fs from "fs";
import path from "path";

const LEGACY_CUSTOM_SHORTCUTS_KEY = "shortcut-vault.custom-shortcuts";
const SHORTCUT_KEY_PREFIX = "shortcut-vault.shortcut.";

// Raycast LocalStorage has asynchronous reads and writes but no transaction or CAS API.
// Keep every access in one FIFO queue so a same-runtime command cannot interleave a read-modify-write sequence.
const storageOperationQueue = createSerialTaskQueue();

class CrossProcessMutex {
  private readonly lockDir = path.join(environment.supportPath, "storage.lock");
  private readonly lockFile = path.join(this.lockDir, "pid.txt");
  private static readonly HEARTBEAT_INTERVAL_MS = 2000;
  private static readonly STALE_THRESHOLD_MS = 15000;
  private static readonly ACQUIRE_TIMEOUT_MS = 5000;

  async runExclusive<T>(task: () => Promise<T>): Promise<T> {
    const start = Date.now();

    while (Date.now() - start < CrossProcessMutex.ACQUIRE_TIMEOUT_MS) {
      try {
        fs.mkdirSync(this.lockDir);
        this.writeLockContent();
        break;
      } catch (e: unknown) {
        const err = e as { code?: string };
        if (err.code === "EEXIST") {
          if (this.tryBreakStaleLock()) {
            continue;
          }
          await new Promise((resolve) => setTimeout(resolve, 50));
        } else if (err.code === "ENOENT") {
          fs.mkdirSync(environment.supportPath, { recursive: true });
          continue;
        } else {
          throw err;
        }
      }
    }

    if (Date.now() - start >= CrossProcessMutex.ACQUIRE_TIMEOUT_MS) {
      throw new Error("Could not acquire cross-process storage lock. Please try again.");
    }

    const heartbeat = setInterval(() => {
      try {
        this.writeLockContent();
      } catch {
        // Ignore heartbeat write errors; the lock dir may have been removed
      }
    }, CrossProcessMutex.HEARTBEAT_INTERVAL_MS);

    try {
      return await task();
    } finally {
      clearInterval(heartbeat);
      this.releaseIfOwned();
    }
  }

  private releaseIfOwned(): void {
    try {
      const content = fs.readFileSync(this.lockFile, "utf-8");
      const ownerPid = parseInt(content.split(":")[0] ?? "", 10);
      if (ownerPid !== process.pid) {
        // Lock was reclaimed by another process — do not touch it
        return;
      }
      fs.unlinkSync(this.lockFile);
      fs.rmdirSync(this.lockDir);
    } catch {
      // Lock was already released or never fully acquired — nothing to clean up
    }
  }

  private writeLockContent(): void {
    fs.writeFileSync(this.lockFile, `${process.pid}:${Date.now()}`);
  }

  private tryBreakStaleLock(): boolean {
    try {
      const content = fs.readFileSync(this.lockFile, "utf-8");
      const parts = content.split(":");
      const pid = parseInt(parts[0] ?? "", 10);
      const timestamp = parseInt(parts[1] ?? "", 10);

      if (isNaN(timestamp) || isNaN(pid)) {
        // Corrupt lock file — treat as stale and break immediately
        this.removeLock();
        return true;
      }

      const isStale = Date.now() - timestamp > CrossProcessMutex.STALE_THRESHOLD_MS;
      if (!isStale) {
        return false;
      }

      // Timestamp is stale — verify the holder process is actually dead before breaking
      if (!this.isProcessAlive(pid)) {
        this.removeLock();
        return true;
      }

      // Process is alive but hasn't refreshed the heartbeat. This should be rare
      // (heartbeat fires every 2 s, stale threshold is 15 s). Do NOT break; let
      // the holder finish and release naturally.
      return false;
    } catch {
      // Could not read the lock file (e.g. race: holder just released) — retry acquire
      return false;
    }
  }

  private isProcessAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  private removeLock(): void {
    try {
      if (fs.existsSync(this.lockFile)) fs.unlinkSync(this.lockFile);
      if (fs.existsSync(this.lockDir)) fs.rmdirSync(this.lockDir);
    } catch {
      // Ignore removal errors
    }
  }
}

const storageMutex = new CrossProcessMutex();

let hasMigratedLegacyStorage = false;

export { GENERAL_OWNER_NAME };

export async function getCustomShortcuts(): Promise<Shortcut[]> {
  return withStorageAccess(readCustomShortcuts);
}

async function readCustomShortcuts(): Promise<Shortcut[]> {
  const allItems = await LocalStorage.allItems();
  const shortcuts: Shortcut[] = [];
  const seenIds = new Set<string>();

  for (const [key, raw] of Object.entries(allItems)) {
    if (!key.startsWith(SHORTCUT_KEY_PREFIX) || !raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw);
      const shortcut = parseStoredShortcut(parsed);

      if (seenIds.has(shortcut.id)) {
        const oldKey = getItemKey(shortcut.id);
        shortcut.id = crypto.randomUUID();
        // The ID was duplicated in storage. Fix it by saving the new one and deleting the old duplicate entry
        await LocalStorage.setItem(getItemKey(shortcut.id), JSON.stringify(shortcut));
        await LocalStorage.removeItem(oldKey);
      }

      seenIds.add(shortcut.id);
      shortcuts.push(shortcut);
    } catch {
      // Ignore unparseable items
    }
  }

  return shortcuts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createCustomShortcut(values: ShortcutFormValues): Promise<Shortcut> {
  return withStorageAccess(async () => {
    const now = new Date().toISOString();
    const shortcut: Shortcut = {
      id: crypto.randomUUID(),
      commandName: values.commandName.trim(),
      modifiers: normalizeModifiers(values.modifiers),
      key: normalizeKey(values.key),
      shortcutDisplay: formatShortcutDisplay(values.modifiers, values.key),
      ownerName: normalizeOwnerName(values.ownerName),
      ownerType: values.ownerType ?? inferCustomOwnerType(values.ownerName, values.scope),
      scope: values.scope,
      notes: values.notes.trim() || undefined,
      sourceType: "custom",
      createdAt: now,
      updatedAt: now,
    };

    await LocalStorage.setItem(getItemKey(shortcut.id), JSON.stringify(shortcut));
    return shortcut;
  });
}

export async function updateCustomShortcut(id: string, values: ShortcutFormValues): Promise<Shortcut> {
  return withStorageAccess(async () => {
    const itemKey = getItemKey(id);
    const rawBefore = await LocalStorage.getItem<string>(itemKey);

    if (!rawBefore) {
      throw new Error("That custom shortcut could not be found or was deleted.");
    }

    let existing: Shortcut;
    try {
      existing = parseStoredShortcut(JSON.parse(rawBefore));
    } catch {
      throw new Error("That custom shortcut is invalid and cannot be updated.");
    }

    const updated: Shortcut = {
      ...existing,
      commandName: values.commandName.trim(),
      modifiers: normalizeModifiers(values.modifiers),
      key: normalizeKey(values.key),
      shortcutDisplay: formatShortcutDisplay(values.modifiers, values.key),
      ownerName: normalizeOwnerName(values.ownerName),
      ownerType: values.ownerType ?? inferCustomOwnerType(values.ownerName, values.scope),
      scope: values.scope,
      notes: values.notes.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    const rawCheck = await LocalStorage.getItem<string>(itemKey);
    if (!rawCheck) {
      throw new Error("That custom shortcut was deleted prior to saving updates.");
    }
    if (rawCheck !== rawBefore) {
      throw new Error("That custom shortcut was modified concurrently. Please try your edit again.");
    }

    await LocalStorage.setItem(itemKey, JSON.stringify(updated));
    return updated;
  });
}

export async function importCustomShortcuts(
  shortcutsToImport: Shortcut[],
  reservedShortcuts: Shortcut[] = [],
): Promise<PreparedImport> {
  return withStorageAccess(async () => {
    const prepared = prepareImportedShortcuts(shortcutsToImport, [
      ...(await readCustomShortcuts()),
      ...reservedShortcuts,
    ]);

    for (const shortcut of prepared.shortcuts) {
      await LocalStorage.setItem(getItemKey(shortcut.id), JSON.stringify(shortcut));
    }

    return prepared;
  });
}

export async function deleteCustomShortcut(id: string): Promise<void> {
  await withStorageAccess(async () => {
    const itemKey = getItemKey(id);
    const rawCheck = await LocalStorage.getItem<string>(itemKey);
    if (rawCheck) {
      await LocalStorage.removeItem(itemKey);
    }
  });
}

export async function duplicateCustomShortcut(id: string): Promise<Shortcut> {
  return withStorageAccess(async () => {
    const itemKey = getItemKey(id);
    const rawBefore = await LocalStorage.getItem<string>(itemKey);

    if (!rawBefore) {
      throw new Error("That custom shortcut could not be found or was deleted.");
    }

    let existing: Shortcut;
    try {
      existing = parseStoredShortcut(JSON.parse(rawBefore));
    } catch {
      throw new Error("That custom shortcut is invalid and cannot be duplicated.");
    }

    const rawCheck = await LocalStorage.getItem<string>(itemKey);
    if (!rawCheck) {
      throw new Error("That custom shortcut was deleted prior to duplicating.");
    }

    const now = new Date().toISOString();
    const duplicate: Shortcut = {
      ...existing,
      id: crypto.randomUUID(),
      commandName: `${existing.commandName} Copy`,
      createdAt: now,
      updatedAt: now,
    };

    await LocalStorage.setItem(getItemKey(duplicate.id), JSON.stringify(duplicate));
    return duplicate;
  });
}

export async function findDuplicateCustomShortcut(
  values: ShortcutFormValues,
  excludedId?: string,
): Promise<Shortcut | undefined> {
  return withStorageAccess(async () => {
    const shortcuts = await readCustomShortcuts();
    const ownerName = normalizeOwnerName(values.ownerName).toLocaleLowerCase();
    const key = normalizeKey(values.key);
    const modifiers = normalizeModifiers(values.modifiers);

    return shortcuts.find((shortcut) => {
      if (shortcut.id === excludedId) {
        return false;
      }

      return (
        shortcut.ownerName.toLocaleLowerCase() === ownerName &&
        shortcut.scope === values.scope &&
        shortcut.key === key &&
        areModifiersEqual(shortcut.modifiers, modifiers)
      );
    });
  });
}

export function normalizeOwnerName(ownerName: string): string {
  return ownerName.trim() || GENERAL_OWNER_NAME;
}

function getItemKey(id: string): string {
  return `${SHORTCUT_KEY_PREFIX}${id}`;
}

async function migrateLegacyStorageIfNeeded(): Promise<void> {
  if (hasMigratedLegacyStorage) {
    return;
  }

  const legacyRaw = await LocalStorage.getItem<string>(LEGACY_CUSTOM_SHORTCUTS_KEY);
  if (!legacyRaw) {
    hasMigratedLegacyStorage = true;
    return;
  }

  try {
    const parsed = JSON.parse(legacyRaw);
    if (Array.isArray(parsed)) {
      const existingItems = await LocalStorage.allItems();

      for (const item of parsed) {
        try {
          const shortcut = parseStoredShortcut(item);
          const itemKey = getItemKey(shortcut.id);
          if (!existingItems[itemKey]) {
            const serializedShortcut = JSON.stringify(shortcut);
            await LocalStorage.setItem(itemKey, serializedShortcut);
            existingItems[itemKey] = serializedShortcut;
          }
        } catch {
          // Ignore unparseable legacy items
        }
      }
    }
  } catch {
    // Ignore invalid legacy JSON
  } finally {
    await LocalStorage.removeItem(LEGACY_CUSTOM_SHORTCUTS_KEY);
    hasMigratedLegacyStorage = true;
  }
}

function withStorageAccess<T>(operation: () => Promise<T>): Promise<T> {
  return storageOperationQueue.run(async () => {
    return storageMutex.runExclusive(async () => {
      await migrateLegacyStorageIfNeeded();
      return await operation();
    });
  });
}

function parseStoredShortcut(value: unknown): Shortcut {
  if (!isRecord(value)) {
    throw new Error("Stored custom shortcuts include an invalid item.");
  }

  const modifiers = value.modifiers;
  if (!Array.isArray(modifiers) || !modifiers.every((modifier) => MODIFIERS.includes(modifier))) {
    throw new Error("Stored custom shortcuts include unsupported modifiers.");
  }

  if (value.sourceType !== "custom") {
    throw new Error("Stored shortcuts must be custom shortcuts.");
  }

  const scope = requireString(value.scope, "scope");
  if (!SCOPE_TYPES.includes(scope as Shortcut["scope"])) {
    throw new Error("Stored custom shortcuts include an unsupported scope.");
  }

  const ownerType = typeof value.ownerType === "string" ? value.ownerType : undefined;
  if (ownerType !== undefined && !OWNER_TYPES.includes(ownerType as Shortcut["ownerType"])) {
    throw new Error("Stored custom shortcuts include an unsupported owner type.");
  }

  const sourceUrl = getSafeStoredUrl(value.sourceUrl);
  const key = requireString(value.key, "key");
  const typedModifiers = modifiers as Shortcut["modifiers"];
  const ownerName = requireString(value.ownerName, "ownerName");
  const typedScope = scope as Shortcut["scope"];
  const typedOwnerType = ownerType as Shortcut["ownerType"] | undefined;

  return {
    id: requireString(value.id, "id"),
    commandName: requireString(value.commandName, "commandName"),
    modifiers: normalizeModifiers(typedModifiers),
    key: normalizeKey(key),
    shortcutDisplay: formatShortcutDisplay(typedModifiers, key),
    ownerName,
    ownerType: normalizeStoredOwnerType(ownerName, typedScope, typedOwnerType),
    scope: typedScope,
    notes: getOptionalStoredString(value.notes),
    sourceType: "custom",
    sourceUrl,
    createdAt: requireString(value.createdAt, "createdAt"),
    updatedAt: requireString(value.updatedAt, "updatedAt"),
  };
}

function getSafeStoredUrl(value: unknown): string | undefined {
  const sourceUrl = getOptionalStoredString(value);

  if (sourceUrl && !isSafeHttpUrl(sourceUrl)) {
    throw new Error("Stored custom shortcuts include an unsafe source URL.");
  }

  return sourceUrl;
}

function getOptionalStoredString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeStoredOwnerType(
  ownerName: string,
  scope: Shortcut["scope"],
  ownerType: Shortcut["ownerType"] | undefined,
): Shortcut["ownerType"] {
  if (!ownerType || ownerType === "other") {
    return inferCustomOwnerType(ownerName, scope);
  }

  return ownerType;
}

function areModifiersEqual(left: Shortcut["modifiers"], right: Shortcut["modifiers"]): boolean {
  return left.length === right.length && left.every((modifier, index) => modifier === right[index]);
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Stored custom shortcut ${fieldName} is missing.`);
  }

  return value.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
