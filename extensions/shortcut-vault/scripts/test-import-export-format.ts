import assert from "node:assert/strict";
import { createExportFile, serializeExportFile, validateExportFile } from "../src/lib/import-export-format";
import type { Shortcut } from "../src/types/shortcut";

const validShortcut: Shortcut = {
  id: "open-command-menu",
  commandName: "Open Command Menu",
  modifiers: ["command", "shift"],
  key: "P",
  shortcutDisplay: "⌘ + ⇧ + P",
  ownerName: "Raycast",
  ownerType: "mac-app",
  scope: "app",
  notes: "Open the command launcher.",
  sourceType: "custom",
  createdAt: "2026-07-04T00:00:00.000Z",
  updatedAt: "2026-07-04T00:00:00.000Z",
};

function makeExport(shortcut: Record<string, unknown> = validShortcut): Record<string, unknown> {
  return {
    format: "shortcut-vault",
    version: 1,
    exportedAt: "2026-07-04T00:00:00.000Z",
    shortcuts: [shortcut],
  };
}

assert.throws(
  () => validateExportFile(makeExport({ ...validShortcut, sourceUrl: "file:///private/secret" })),
  /sourceUrl must use an http or https URL/,
);

assert.throws(
  () => validateExportFile(makeExport({ ...validShortcut, createdAt: "2026-07-04" })),
  /createdAt must be an ISO 8601 date-time/,
);

const imported = validateExportFile(
  makeExport({
    ...validShortcut,
    id: "  open-command-menu  ",
    commandName: "  Open Command Menu  ",
    ownerName: "  Raycast  ",
    notes: "  Open the command launcher.  ",
    sourceUrl: "  https://www.raycast.com  ",
  }),
);

assert.deepEqual(imported.shortcuts[0], {
  ...validShortcut,
  sourceUrl: "https://www.raycast.com",
});

// Round-trip regression for 1,001 shortcuts
const thousandOneShortcuts = Array.from({ length: 1001 }, (_, i) => ({
  ...validShortcut,
  id: String(i),
}));
assert.doesNotThrow(() => validateExportFile(createExportFile(thousandOneShortcuts)));

// Exceeding MAX_SHORTCUTS_PER_FILE throws consistently on export and import validation
assert.throws(
  () => createExportFile(Array.from({ length: 10_001 }, (_, i) => ({ ...validShortcut, id: String(i) }))),
  /Cannot export more than 10000 shortcuts/,
);

assert.throws(
  () =>
    validateExportFile({
      ...makeExport(),
      shortcuts: Array.from({ length: 10_001 }, (_, i) => ({ ...validShortcut, id: String(i) })),
    }),
  /cannot contain more than 10000 shortcuts/,
);

// serializeExportFile succeeds for valid export
const serialized = serializeExportFile(createExportFile(thousandOneShortcuts));
assert.ok(serialized.length > 0);

// serializeExportFile throws if payload exceeds MAX_FILE_BYTES (6 MB)
const oversizedShortcuts = Array.from({ length: 2000 }, (_, i) => ({
  ...validShortcut,
  id: String(i),
  notes: "x".repeat(3500),
}));
const oversizedFile = createExportFile(oversizedShortcuts);
assert.throws(
  () => serializeExportFile(oversizedFile),
  /exceeds the 6 MB limit/,
);

console.log("import/export format tests passed");
