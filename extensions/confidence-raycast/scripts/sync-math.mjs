#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "MATH_101.md");
const dest = resolve(root, "src/math/content.ts");

const md = readFileSync(src, "utf8");
const out = `// AUTO-GENERATED from MATH_101.md by scripts/sync-math.mjs. Do not edit by hand.
export const MATH_101 = ${JSON.stringify(md)};
`;
writeFileSync(dest, out);
console.log(`sync-math: wrote ${dest} (${md.length} chars)`);
