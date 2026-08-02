import { LocalStorage } from "@raycast/api";
import { MODIFIERS, OWNER_TYPES, SCOPE_TYPES, type Shortcut, type ShortcutFormValues } from "../types/shortcut";
import { GENERAL_OWNER_NAME, inferCustomOwnerType } from "./owner-type";
import { isSafeHttpUrl } from "./safe-url";
import { createSerialTaskQueue } from "./serial-task-queue";
import { formatShortcutDisplay, normalizeKey, normalizeModifiers } from "./shortcut-format";

const CUSTOM_SHORTCUTS_KEY = "shortcut-vault.custom-shortcuts";
const CUSTOM_SHORTCUTS_LOCK_KEY = "shortcut-vault.custom-shortcuts-lock";
const customShortcutMutationQueue = createSerialTaskQueue();

let activeProcessLockId: string | null = null;

export { GENERAL_OWNER_NAME };

type CustomShortcutMutation<T> = {
  shortcuts: Shortcut[];
  result: T;
};

async function withCrossProcessLock<T>(fn: () => Promise<T>): Promise<T> {
  if (activeProcessLockId) {
    return await fn();
  }

  const lockId = `${Date.now()}-${crypto.randomUUID()}`;
  let acquired = false;

  for (let i = 0; i < 30; i++) {
    const existingLock = await LocalStorage.getItem<string>(CUSTOM_SHORTCUTS_LOCK_KEY);
    if (!existingLock) {
      await LocalStorage.setItem(CUSTOM_SHORTCUTS_LOCK_KEY, lockId);
      const verifyLock = await LocalStorage.getItem<string>(CUSTOM_SHORTCUTS_LOCK_KEY);
      if (verifyLock === lockId) {
        acquired = true;
        activeProcessLockId = lockId;
        break;
      }
    } else {
      const lockTime = parseInt(existingLock.split("-")[0] ?? "0", 10);
      if (!isNaN(lockTime) && Date.now() - lockTime > 10000) {
        await LocalStorage.removeItem(CUSTOM_SHORTCUTS_LOCK_KEY);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  if (!acquired) {
    throw new Error("Storage lock timeout. Please retry.");
  }

  try {
    return await fn();
  } finally {
    if (activeProcessLockId === lockId) {
      activeProcessLockId = null;
      const currentLock = await LocalStorage.getItem<string>(CUSTOM_SHORTCUTS_LOCK_KEY);
      if (currentLock === lockId) {
        await LocalStorage.removeItem(CUSTOM_SHORTCUTS_LOCK_KEY);
      }
    }
  }
}

export async function getCustomShortcuts(): Promise<Shortcut[]> {
  const raw = await LocalStorage.getItem<string>(CUSTOM_SHORTCUTS_KEY);
  if (!raw) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn("Shortcut Vault encountered invalid JSON in custom shortcut storage.");
    return [];
  }

  if (!Array.isArray(parsed)) {
    console.warn("Shortcut Vault encountered an unexpected non-array value in custom shortcut storage.");
    return [];
  }

  const shortcuts: Shortcut[] = [];
  const seenIds = new Set<string>();

  for (const value of parsed) {
    try {
      const shortcut = parseStoredShortcut(value);

      if (seenIds.has(shortcut.id)) {
        shortcut.id = crypto.randomUUID();
      }

      seenIds.add(shortcut.id);
      shortcuts.push(shortcut);
    } catch {
      // Ignore invalid individual items during read without mutation side-effects
    }
  }

  return shortcuts;
}

/**
 * Executes a cross-command safe serial mutation on custom shortcuts using cross-process LocalStorage locking.
 * Enforces re-entrant atomic lock acquisition across independent command runtimes before executing mutations.
 */
export function mutateCustomShortcuts<T>(
  mutation: (shortcuts: Shortcut[]) => CustomShortcutMutation<T> | Promise<CustomShortcutMutation<T>>,
): Promise<T> {
  return customShortcutMutationQueue.run(() =>
    withCrossProcessLock(async () => {
      const currentShortcuts = await getCustomShortcuts();
      const { shortcuts, result } = await mutation(currentShortcuts);
      await writeCustomShortcuts(shortcuts);
      return result;
    }),
  );
}

export async function createCustomShortcut(values: ShortcutFormValues): Promise<Shortcut> {
  return mutateCustomShortcuts((shortcuts) => {
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

    return { shortcuts: [shortcut, ...shortcuts], result: shortcut };
  });
}

export async function updateCustomShortcut(id: string, values: ShortcutFormValues): Promise<Shortcut> {
  return mutateCustomShortcuts((shortcuts) => {
    const existing = shortcuts.find((shortcut) => shortcut.id === id);

    if (!existing) {
      throw new Error("That custom shortcut could not be found.");
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

    return {
      shortcuts: shortcuts.map((shortcut) => (shortcut.id === id ? updated : shortcut)),
      result: updated,
    };
  });
}

export async function findDuplicateCustomShortcut(
  values: ShortcutFormValues,
  excludedId?: string,
): Promise<Shortcut | undefined> {
  const shortcuts = await getCustomShortcuts();
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
}

export function normalizeOwnerName(ownerName: string): string {
  return ownerName.trim() || GENERAL_OWNER_NAME;
}

export async function deleteCustomShortcut(id: string): Promise<void> {
  await mutateCustomShortcuts((shortcuts) => ({
    shortcuts: shortcuts.filter((shortcut) => shortcut.id !== id),
    result: undefined,
  }));
}

export async function duplicateCustomShortcut(id: string): Promise<Shortcut> {
  return mutateCustomShortcuts((shortcuts) => {
    const existing = shortcuts.find((shortcut) => shortcut.id === id);

    if (!existing) {
      throw new Error("That custom shortcut could not be found.");
    }

    const now = new Date().toISOString();
    const duplicate: Shortcut = {
      ...existing,
      id: crypto.randomUUID(),
      commandName: `${existing.commandName} Copy`,
      createdAt: now,
      updatedAt: now,
    };

    return { shortcuts: [duplicate, ...shortcuts], result: duplicate };
  });
}

async function writeCustomShortcuts(shortcuts: Shortcut[]): Promise<void> {
  await LocalStorage.setItem(CUSTOM_SHORTCUTS_KEY, JSON.stringify(shortcuts));
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
