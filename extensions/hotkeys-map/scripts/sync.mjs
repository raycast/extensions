#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const jsonPath = path.join(rootDir, "assets", "hotkeys.json");
const jsOutPath = path.join(rootDir, "assets", "hotkeys-data.js");

const inputArg = process.argv[2];

if (inputArg) {
  const srcPath = path.resolve(inputArg);
  if (!fs.existsSync(srcPath)) {
    console.error(`File not found: ${srcPath}`);
    process.exit(1);
  }
  const incoming = JSON.parse(fs.readFileSync(srcPath, "utf8"));
  const current = fs.existsSync(jsonPath)
    ? JSON.parse(fs.readFileSync(jsonPath, "utf8"))
    : { groups: {}, hotkeys: [], aliases: [] };

  if (Array.isArray(incoming)) {
    current.hotkeys = incoming;
  } else {
    if (incoming.groups) current.groups = incoming.groups;
    if (incoming.hotkeys) current.hotkeys = incoming.hotkeys;
    if (incoming.aliases) current.aliases = incoming.aliases;
  }
  fs.writeFileSync(jsonPath, JSON.stringify(current, null, 2) + "\n");
  console.log(`Updated ${jsonPath} from ${srcPath} (${current.hotkeys.length} hotkeys)`);
}

if (!fs.existsSync(jsonPath)) {
  console.error(`Missing ${jsonPath}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const jsContent = `// Auto-generated from assets/hotkeys.json by scripts/sync.mjs — do not edit directly\nwindow.HOTKEYS_DATA = ${JSON.stringify(data, null, 2)};\n`;
fs.writeFileSync(jsOutPath, jsContent);
console.log(`Synced ${data.hotkeys.length} hotkeys & ${data.aliases.length} aliases -> assets/hotkeys-data.js`);
