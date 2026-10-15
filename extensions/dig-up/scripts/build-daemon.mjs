// Bundles the engine (engine/daemon.ts and what it imports) into assets/daemon.js, which Raycast's own Node runs as the
// detached daemon. `ray build` copies assets/ as it is, so the bundle must stand alone: no node_modules beside it.
// Usage: node scripts/build-daemon.mjs   (npm run build:engine)

import { build } from "esbuild";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// node:sqlite prints "ExperimentalWarning: SQLite is an experimental feature" on first use. The client sets
// NODE_NO_WARNINGS for the daemon it spawns; this keeps a daemon started by hand quiet too. Other warnings still show.
const banner = `"use strict";
{
  const emitWarning = process.emitWarning;
  process.emitWarning = function (warning, ...rest) {
    const type = typeof rest[0] === "string" ? rest[0] : rest[0] && rest[0].type;
    const name = (warning && warning.name) || type;
    const text = typeof warning === "string" ? warning : warning && warning.message;
    if (name === "ExperimentalWarning" && /SQLite/i.test(String(text))) return;
    return emitWarning.call(process, warning, ...rest);
  };
}`;

const result = await build({
  entryPoints: [join(root, "engine/daemon.ts")],
  outfile: join(root, "assets/daemon.js"),
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  sourcemap: true,
  // Builtins come from the Node that runs it (node:sqlite included).
  external: ["node:*"],
  define: { "process.env.NODE_ENV": '"production"' },
  banner: { js: banner },
  logLevel: "warning",
  metafile: true,
});

const output = result.metafile.outputs[Object.keys(result.metafile.outputs).find((file) => file.endsWith("daemon.js"))];
console.log(`assets/daemon.js: ${(output.bytes / 1024).toFixed(0)} KB from ${Object.keys(output.inputs).length} files`);
