#!/usr/bin/env node
/** Génère NOTICE.md à partir de src/legal.ts (source unique des mentions légales). */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(root, "src", "legal.ts"), "utf8");

const field = (k) => src.match(new RegExp(`\\b${k}:\\s*\\n?\\s*"([^"]+)"`))[1];
const url = (k) => src.match(new RegExp(`export const ${k} = "([^"]+)"`))[1];

let md = src.match(/LEGAL_MARKDOWN = `([\s\S]*?)`;/)[1];
md = md
  .replace(/\$\{GAFFIOT_CREDITS\.(\w+)\}/g, (_, k) => field(k))
  .replace(/\$\{(\w+_URL)\}/g, (_, k) => url(k))
  .replace(/\\`/g, "`");

writeFileSync(join(root, "NOTICE.md"), md);
console.log("→ NOTICE.md");
