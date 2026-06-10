// Remove node_modules without touching package-lock.json, which is the
// dependency pin and must survive a reset.
// Invoked from a mise task as `node scripts/clean.mjs`. Inline `-e` quoting breaks
// under PowerShell, so this always runs as a script file.
import { rmSync } from "node:fs";

rmSync("node_modules", { recursive: true, force: true });
console.log("cleaned: node_modules (kept package-lock.json)");
