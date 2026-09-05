import assert from "node:assert/strict";
import { validateExportFile } from "../src/lib/import-export-format";

const validShortcut = {
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

assert.throws(
  () =>
    validateExportFile({
      ...makeExport(),
      shortcuts: Array.from({ length: 1_001 }, () => validShortcut),
    }),
  /cannot contain more than 1000 shortcuts/,
);

console.log("import/export format tests passed");
