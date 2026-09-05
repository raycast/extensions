#!/usr/bin/env node
/**
 * Copy the Lucide icons this extension uses into assets/icons.
 *
 * lucide-static is not a dependency: it carries 2000+ files and we need about
 * thirty. Install it for the duration instead:
 *
 *     npm install --no-save lucide-static
 *     npm run icons
 *
 * The names here must match src/icons.ts. Running this is the only way an icon
 * gets into assets/, so a typo in either place fails loudly rather than
 * shipping a missing image.
 */

import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const SOURCE = "node_modules/lucide-static/icons";
const TARGET = "assets/icons";

/**
 * Entity types only.
 *
 * Interface icons - add, edit, remove, filter, warn - stay on Raycast's built-in
 * set, so they are deliberately absent here. Kept in sync with src/icons.ts by
 * hand; the check below catches drift.
 */
const ICONS = [
  // Work items
  "file-text",
  "bug",
  "square-check-big",
  "sparkles",
  "crown",
  "layers",
  "inbox",
  "octagon-alert",
  // Planning containers
  "rocket",
  "repeat",
  "repeat-2",
  "milestone",
  "hammer",
  // Organisation
  "folder-kanban",
  "boxes",
  "users",
  "building-2",
  "contact",
  // Testing and tracking
  "flask-conical",
  "clipboard-list",
  "list-checks",
  "clock",
  // Fallback
  "circle-dashed",
];

let source;
try {
  source = readdirSync(SOURCE);
} catch {
  console.error("\n  lucide-static is not installed. Run `npm install --no-save lucide-static` first.\n");
  process.exitCode = 1;
}

if (source) {
  rmSync(TARGET, { recursive: true, force: true });
  mkdirSync(TARGET, { recursive: true });

  const missing = ICONS.filter((name) => !source.includes(`${name}.svg`));
  if (missing.length > 0) {
    console.error(`\n  Not in this version of Lucide: ${missing.join(", ")}\n`);
    process.exitCode = 1;
  } else {
    for (const name of ICONS) {
      copyFileSync(join(SOURCE, `${name}.svg`), join(TARGET, `${name}.svg`));
    }

    // Cross-check against src/icons.ts so the two lists cannot drift apart.
    const used = new Set([...readFileSync("src/icons.ts", "utf8").matchAll(/lucide\("([a-z0-9-]+)"/g)].map((m) => m[1]));
    const unused = ICONS.filter((name) => !used.has(name));
    const uncopied = [...used].filter((name) => !ICONS.includes(name));

    console.log(`${TARGET}: ${ICONS.length} icons`);
    if (unused.length > 0) console.log(`  copied but unused: ${unused.join(", ")}`);
    if (uncopied.length > 0) {
      console.error(`  referenced by src/icons.ts but not copied: ${uncopied.join(", ")}`);
      process.exitCode = 1;
    }
  }
}
