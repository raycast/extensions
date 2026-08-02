import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "src", "data", "default-shortcuts");

const modifiers = new Set(["command", "option", "control", "shift", "fn"]);
const ownerTypes = new Set(["mac-app", "webapp", "system", "other"]);
const scopes = new Set(["global", "app", "webapp"]);

const files = (await readdir(dataDir)).filter((file) => file.endsWith(".json")).sort();
const generatedIds = new Set();
let shortcutCount = 0;

for (const file of files) {
  const filePath = path.join(dataDir, file);
  const dataset = JSON.parse(await readFile(filePath, "utf8"));

  validateString(dataset.ownerName, `${file}.ownerName`);
  validateEnum(dataset.ownerType, ownerTypes, `${file}.ownerType`);
  validateOptionalString(dataset.sourceUrl, `${file}.sourceUrl`);

  if (!Array.isArray(dataset.shortcuts) || dataset.shortcuts.length === 0) {
    fail(`${file}.shortcuts must be a non-empty array.`);
  }

  const localIds = new Set();

  for (const [index, shortcut] of dataset.shortcuts.entries()) {
    const label = `${file}.shortcuts[${index}]`;

    validateString(shortcut.id, `${label}.id`);
    validateString(shortcut.commandName, `${label}.commandName`);
    validateString(shortcut.key, `${label}.key`);
    validateEnum(shortcut.scope, scopes, `${label}.scope`);
    validateOptionalString(shortcut.notes, `${label}.notes`);
    validateOptionalString(shortcut.sourceUrl, `${label}.sourceUrl`);

    if (!Array.isArray(shortcut.modifiers)) {
      fail(`${label}.modifiers must be an array.`);
    }

    for (const modifier of shortcut.modifiers) {
      validateEnum(modifier, modifiers, `${label}.modifiers`);
    }

    if (localIds.has(shortcut.id)) {
      fail(`${file} contains duplicate shortcut id "${shortcut.id}".`);
    }

    localIds.add(shortcut.id);

    const generatedId = `default:${dataset.ownerName.toLowerCase().replaceAll(" ", "-")}:${shortcut.id}`;
    if (generatedIds.has(generatedId)) {
      fail(`Duplicate generated shortcut id "${generatedId}".`);
    }

    generatedIds.add(generatedId);
    shortcutCount += 1;
  }
}

console.log(`Validated ${shortcutCount} default shortcuts across ${files.length} datasets.`);

function validateString(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    fail(`${fieldName} must be a non-empty string.`);
  }
}

function validateOptionalString(value, fieldName) {
  if (value !== undefined && typeof value !== "string") {
    fail(`${fieldName} must be a string when provided.`);
  }
}

function validateEnum(value, allowed, fieldName) {
  if (typeof value !== "string" || !allowed.has(value)) {
    fail(`${fieldName} contains unsupported value "${String(value)}".`);
  }
}

function fail(message) {
  throw new Error(message);
}
