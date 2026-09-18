// Refuses to let the Etymonline integration reach the Raycast Store.
//
//   node scripts/check-store-ready.mjs
//
// src/sources/etymonline.ts fetches proprietary, un-licensed prose. That is
// defensible for one person reading on their own machine and not defensible in
// an extension distributed to everyone, so it lives behind a preference that is
// off by default. A preference is not a guarantee: a reviewer could flip it, and
// the code would still ship. This is the guarantee.
//
// To publish: delete src/sources/etymonline.ts, remove the `etymonlineText`
// preference from package.json and the block that renders it in
// src/components/EntryDetail.tsx, then run this until it passes.

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

const module = join(root, "src", "sources", "etymonline.ts");
if (existsSync(module)) {
  failures.push("src/sources/etymonline.ts exists - delete it before publishing");
}

const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
if ((manifest.preferences ?? []).some((p) => p.name === "etymonlineText")) {
  failures.push("package.json still declares the `etymonlineText` preference");
}

const detail = readFileSync(join(root, "src", "components", "EntryDetail.tsx"), "utf8");
if (detail.includes("etymonline")) {
  failures.push("src/components/EntryDetail.tsx still references etymonline");
}

if (failures.length) {
  console.error("NOT ready for the store:\n");
  for (const f of failures) console.error(`  - ${f}`);
  console.error("\nSee src/sources/etymonline.ts for why this is blocked.");
  process.exit(1);
}

console.log("ready for the store: no Etymonline text integration present");
