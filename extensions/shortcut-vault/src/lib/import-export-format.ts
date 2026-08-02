import {
  MODIFIERS,
  OWNER_TYPES,
  SCOPE_TYPES,
  SOURCE_TYPES,
  type Shortcut,
  type ShortcutExportFile,
} from "../types/shortcut";
import { isSafeHttpUrl } from "./safe-url";
import { formatShortcutDisplay, normalizeKey, normalizeModifiers } from "./shortcut-format";

export const EXPORT_FORMAT = "shortcut-vault";
export const EXPORT_VERSION = 1;
export const MAX_IMPORT_SHORTCUTS = 1_000;

const MAX_ID_LENGTH = 256;
const MAX_COMMAND_NAME_LENGTH = 512;
const MAX_KEY_LENGTH = 128;
const MAX_OWNER_NAME_LENGTH = 512;
const MAX_NOTES_LENGTH = 4_000;
const MAX_SOURCE_URL_LENGTH = 2_048;
const ISO_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

export type PreparedImport = {
  shortcuts: Shortcut[];
  regeneratedIds: number;
};

type PrepareImportOptions = {
  generateId?: () => string;
  now?: () => string;
};

export function createExportFile(shortcuts: Shortcut[]): ShortcutExportFile {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    shortcuts,
  };
}

export function prepareImportedShortcuts(
  importedShortcuts: Shortcut[],
  existingShortcuts: Shortcut[],
  options: PrepareImportOptions = {},
): PreparedImport {
  const generateId = options.generateId ?? (() => crypto.randomUUID());
  const now = options.now ?? (() => new Date().toISOString());
  const seenIds = new Set(existingShortcuts.map((shortcut) => shortcut.id));
  let regeneratedIds = 0;

  const shortcuts = importedShortcuts.map((shortcut) => {
    let id = shortcut.id;
    let wasRegenerated = false;

    let idAttempts = 0;
    while (seenIds.has(id)) {
      id = generateId();
      idAttempts += 1;

      if (idAttempts > 100) {
        throw new Error("Could not generate a unique ID for an imported shortcut.");
      }

      wasRegenerated = true;
    }

    if (wasRegenerated) {
      regeneratedIds += 1;
    }

    seenIds.add(id);

    return {
      ...shortcut,
      id,
      modifiers: normalizeModifiers(shortcut.modifiers),
      key: normalizeKey(shortcut.key),
      shortcutDisplay: formatShortcutDisplay(shortcut.modifiers, shortcut.key),
      sourceType: "custom" as const,
      updatedAt: now(),
    };
  });

  return { shortcuts, regeneratedIds };
}

export function validateExportFile(value: unknown): ShortcutExportFile {
  if (!isRecord(value)) {
    throw new Error("The import file must contain a JSON object.");
  }

  if (value.format !== EXPORT_FORMAT) {
    throw new Error("Unsupported import format. Expected shortcut-vault.");
  }

  if (value.version !== EXPORT_VERSION) {
    throw new Error(
      `Unsupported import version. Shortcut Vault currently supports version ${EXPORT_VERSION}.`,
    );
  }

  if (!Array.isArray(value.shortcuts)) {
    throw new Error("The import file is missing a shortcuts array.");
  }

  if (value.shortcuts.length === 0) {
    throw new Error("The import file does not contain any shortcuts.");
  }

  if (value.shortcuts.length > MAX_IMPORT_SHORTCUTS) {
    throw new Error(`The import file cannot contain more than ${MAX_IMPORT_SHORTCUTS} shortcuts.`);
  }

  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: requireDateString(value.exportedAt, "exportedAt"),
    shortcuts: value.shortcuts.map((shortcut, index) => validateShortcut(shortcut, index)),
  };
}

function validateShortcut(value: unknown, index: number): Shortcut {
  const label = `shortcuts[${index}]`;

  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const modifiers = value.modifiers;
  if (!Array.isArray(modifiers) || !modifiers.every((modifier) => MODIFIERS.includes(modifier))) {
    throw new Error(`${label}.modifiers contains an unsupported modifier.`);
  }

  const ownerType = requireString(value.ownerType, `${label}.ownerType`, 32);
  if (!OWNER_TYPES.includes(ownerType as Shortcut["ownerType"])) {
    throw new Error(`${label}.ownerType is not supported.`);
  }

  const scope = requireString(value.scope, `${label}.scope`, 32);
  if (!SCOPE_TYPES.includes(scope as Shortcut["scope"])) {
    throw new Error(`${label}.scope is not supported.`);
  }

  const sourceType = requireString(value.sourceType, `${label}.sourceType`, 32);
  if (!SOURCE_TYPES.includes(sourceType as Shortcut["sourceType"])) {
    throw new Error(`${label}.sourceType is not supported.`);
  }

  if (sourceType !== "custom") {
    throw new Error(`${label}.sourceType must be custom.`);
  }

  const key = requireString(value.key, `${label}.key`, MAX_KEY_LENGTH);
  const typedModifiers = modifiers as Shortcut["modifiers"];
  const sourceUrl = getOptionalHttpUrl(value.sourceUrl, `${label}.sourceUrl`);

  return {
    id: requireString(value.id, `${label}.id`, MAX_ID_LENGTH),
    commandName: requireString(value.commandName, `${label}.commandName`, MAX_COMMAND_NAME_LENGTH),
    modifiers: typedModifiers,
    key,
    shortcutDisplay: formatShortcutDisplay(typedModifiers, key),
    ownerName: requireString(value.ownerName, `${label}.ownerName`, MAX_OWNER_NAME_LENGTH),
    ownerType: ownerType as Shortcut["ownerType"],
    scope: scope as Shortcut["scope"],
    notes: getOptionalString(value.notes, `${label}.notes`, MAX_NOTES_LENGTH),
    sourceType: "custom",
    sourceUrl,
    createdAt: requireDateString(value.createdAt, `${label}.createdAt`),
    updatedAt: requireDateString(value.updatedAt, `${label}.updatedAt`),
  };
}

function requireDateString(value: unknown, fieldName: string): string {
  const text = requireString(value, fieldName, 64);
  const match = text.match(ISO_DATE_TIME_PATTERN);

  if (!match || Number.isNaN(Date.parse(text)) || !hasValidCalendarDate(match)) {
    throw new Error(`${fieldName} must be an ISO 8601 date-time.`);
  }

  return text;
}

function hasValidCalendarDate(match: RegExpMatchArray): boolean {
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function getOptionalHttpUrl(value: unknown, fieldName: string): string | undefined {
  const text = getOptionalString(value, fieldName, MAX_SOURCE_URL_LENGTH);

  if (text && !isSafeHttpUrl(text)) {
    throw new Error(`${fieldName} must use an http or https URL.`);
  }

  return text;
}

function getOptionalString(
  value: unknown,
  fieldName: string,
  maxLength: number,
): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return requireString(value, fieldName, maxLength);
}

function requireString(value: unknown, fieldName: string, maxLength: number): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is required.`);
  }

  const text = value.trim();
  if (text.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or fewer.`);
  }

  return text;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const EXAMPLE_EXPORT: ShortcutExportFile = {
  format: "shortcut-vault",
  version: 1,
  exportedAt: "2026-07-04T00:00:00.000Z",
  shortcuts: [
    {
      id: "example-custom-shortcut",
      commandName: "Open Command Menu",
      modifiers: ["command", "shift"],
      key: "P",
      shortcutDisplay: "⌘ + ⇧ + P",
      ownerName: "VS Code",
      ownerType: "mac-app",
      scope: "app",
      notes: "Example custom shortcut.",
      sourceType: "custom",
      createdAt: "2026-07-04T00:00:00.000Z",
      updatedAt: "2026-07-04T00:00:00.000Z",
    },
  ],
};
