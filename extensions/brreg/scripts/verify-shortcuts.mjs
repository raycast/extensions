import { readFileSync } from "node:fs";
import { join } from "node:path";

function assertMatch(source, regex, message) {
  if (!regex.test(source)) {
    throw new Error(message);
  }
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function getKeyboardShortcutsSection(source) {
  const heading = "## Keyboard Shortcuts";
  const headingIndex = source.indexOf(heading);
  assertCondition(headingIndex !== -1, "README 'Keyboard Shortcuts' section is missing.");

  const afterHeading = source.slice(headingIndex + heading.length);
  const nextHeadingIndex = afterHeading.search(/\n##\s+/);
  return nextHeadingIndex === -1 ? afterHeading : afterHeading.slice(0, nextHeadingIndex);
}

function parseMarkdownTable(section) {
  const tableLines = section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));

  assertCondition(tableLines.length >= 3, "README shortcut table is missing or malformed.");

  const headerColumns = tableLines[0]
    .split("|")
    .map((column) => column.trim())
    .filter(Boolean);
  assertCondition(
    headerColumns[0] === "Action" && headerColumns[1] === "Shortcut",
    "README shortcut table must have 'Action' and 'Shortcut' columns.",
  );

  const rows = tableLines.slice(2);
  const shortcutsByAction = new Map();

  for (const row of rows) {
    const columns = row
      .split("|")
      .map((column) => column.trim())
      .filter(Boolean);
    if (columns.length < 2) continue;

    const action = columns[0].replace(/\s+/g, " ");
    const shortcut = columns[1].replace(/`/g, "").replace(/\s+/g, " ").trim();
    shortcutsByAction.set(action, shortcut);
  }

  return shortcutsByAction;
}

function assertShortcut(shortcutsByAction, action, expectedShortcut) {
  const actualShortcut = shortcutsByAction.get(action);
  if (actualShortcut !== expectedShortcut) {
    throw new Error(
      `README shortcut for '${action}' is out of sync. Expected '${expectedShortcut}', got '${actualShortcut ?? "missing"}'.`,
    );
  }
}

const root = process.cwd();
const constantsPath = join(root, "src/constants/index.ts");
const readmePath = join(root, "README.md");

const constants = readFileSync(constantsPath, "utf8");
const readme = readFileSync(readmePath, "utf8");

assertMatch(
  constants,
  /COPY_ORG_NUMBER:\s*\{\s*modifiers:\s*\["cmd",\s*"shift"\],\s*key:\s*"c"\s*\}/m,
  "COPY_ORG_NUMBER must remain cmd+shift+c.",
);

assertMatch(
  constants,
  /COPY_ADDRESS:\s*\{\s*modifiers:\s*\["cmd",\s*"shift"\],\s*key:\s*"b"\s*\}/m,
  "COPY_ADDRESS must remain cmd+shift+b.",
);

const keyboardShortcutsSection = getKeyboardShortcutsSection(readme);
const shortcutsByAction = parseMarkdownTable(keyboardShortcutsSection);
assertShortcut(shortcutsByAction, "Copy organisation number", "⌘⇧C");
assertShortcut(shortcutsByAction, "Copy business address", "⌘⇧B");

console.log("Shortcut consistency checks passed.");
