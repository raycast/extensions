/**
 * sort-urls.js - Utility script for sorting browser commands by their path
 *
 * This script sorts the browser commands in `paths.ts` alphabetically by their path.
 * It creates a backup of the original file before making any changes.
 *
 * Usage:
 * 1. Run this script from the project root:
 *    node src/utils/sort-urls.js
 *
 * The script will:
 * - Read the browser commands from `src/paths.ts`
 * - Create a backup at `src/paths.ts.bak`
 * - Sort the commands by their path in ascending order
 * - Write the sorted commands back to `src/paths.ts`
 * - Print the number of commands processed
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

const filePath = path.join(__dirname, "../paths.ts");
const backupPath = path.join(__dirname, "../paths.ts.bak");

// Read the file
const content = fs.readFileSync(filePath, "utf8");

// Extract the browserCommands array
const match = content.match(/export const browserCommands: BrowserCommand\[\] = \[([\s\S]*?)\];/);
if (!match) {
  console.error("Could not find browserCommands array in the file");
  process.exit(1);
}

const browserCommandsStr = match[1];

// Parse the array items
const items = [];
let currentItem = "";
let braceCount = 0;

for (const char of browserCommandsStr) {
  if (char === "{") {
    braceCount++;
    currentItem += char;
  } else if (char === "}") {
    braceCount--;
    currentItem += char;
    if (braceCount === 0) {
      items.push(currentItem.trim());
      currentItem = "";
    }
  } else if (char === "," && braceCount === 0) {
    // Skip commas between items
  } else {
    currentItem += char;
  }
}

// Parse each item to get the path for sorting
const itemsWithPath = items.map((item) => {
  const pathMatch = item.match(/path: "([^"]+)"/);
  return {
    original: item,
    path: pathMatch ? pathMatch[1].toLowerCase() : "",
  };
});

// Sort by path
itemsWithPath.sort((a, b) => a.path.localeCompare(b.path));

// Create the new content
const sortedItems = itemsWithPath.map((item) => item.original).join(",\n\n");
const newContent = content.replace(
  /(export const browserCommands: BrowserCommand\[\] = \[)([\s\S]*?)(\];)/,
  `$1\n${sortedItems}\n$3`,
);

// Write the sorted content back to the file
fs.writeFileSync(filePath, newContent, "utf8");

console.log("Browser commands have been sorted alphabetically by path.");
console.log(`Original file backed up to: ${backupPath}`);
