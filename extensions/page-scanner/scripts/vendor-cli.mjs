#!/usr/bin/env node
/**
 * Vendors the `page-scanner` command into the extension, from the @page-scanner/cli release on
 * npm that package.json pins:
 *
 * 1. `assets/page-scanner.mjs`, the whole command in one file, bundled with esbuild from the
 *    package's `dist/bin.js`, not minified. Raycast ships `assets/` as it is and runs the
 *    extension on a Node of its own, so a user needs neither Node nor the npm package
 *    (`src/lib/cli.ts` runs this file with Raycast's Node).
 * 2. `assets/host.js`, the native messaging host `install` copies out, from beside it in the
 *    package, where `packagedHostPath()` in the bundle looks for it.
 * 3. `src/vendor/cli-integrity.ts`, the version and the SHA-256 of both files, which
 *    `src/lib/cli.ts` checks before it runs either.
 *
 * The same pinned version, esbuild version and options write the same bytes, so a reviewer can
 * run this and compare. The package is Apache-2.0; its source maps carry its TypeScript source.
 *
 * `--local` bundles ../cli's own build instead (`pnpm --filter @page-scanner/cli build` first),
 * to try an unreleased CLI in `ray develop`. Its integrity file names the version `local`, which
 * `src/vendor/cli-integrity.test.ts` refuses, so it cannot be committed by accident.
 */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const here = dirname(dirname(fileURLToPath(import.meta.url)));
const local = process.argv.includes("--local");
const cli = local ? join(here, "..", "cli") : realpathSync(join(here, "node_modules", "@page-scanner", "cli"));
const { version } = JSON.parse(readFileSync(join(cli, "package.json"), "utf8"));
const entry = join(cli, "dist", "bin.js");
const hostSource = join(cli, "dist", "native", "host.js");

for (const file of [entry, hostSource]) {
  if (!existsSync(file)) {
    console.error(
      local
        ? `No ${file}. Run \`pnpm --filter @page-scanner/cli build\` first.`
        : `No ${file}. Run \`pnpm install\` in raycast/.`,
    );
    process.exit(1);
  }
}

const bundle = join(here, "assets", "page-scanner.mjs");
const host = join(here, "assets", "host.js");

// ws asks for its optional native speedups with a guarded `require()`, which an ESM bundle has
// no `require` for; a global one built from the bundle's own URL lets the guard catch the miss.
// __filename and __dirname are for the CJS-shaped modules esbuild wraps. The same banner as the
// CLI's own scripts/bundle.mjs, which builds the .mcpb.
const banner = `// @page-scanner/cli ${local ? "local build" : version}, Apache-2.0, bundled by scripts/vendor-cli.mjs.
import { createRequire as __psCreateRequire } from 'node:module';
import { fileURLToPath as __psFileURLToPath } from 'node:url';
import { dirname as __psDirname } from 'node:path';
globalThis.require ??= __psCreateRequire(import.meta.url);
const __filename = __psFileURLToPath(import.meta.url);
const __dirname = __psDirname(__filename);
`;

const result = await esbuild.build({
  entryPoints: [entry],
  absWorkingDir: here,
  bundle: true,
  platform: "node",
  format: "esm",
  // Raycast's Node, which was 22 when this was written.
  target: "node20",
  sourcemap: false,
  external: ["bufferutil", "utf-8-validate"],
  banner: { js: banner },
  logLevel: "warning",
  write: false,
});
// esbuild names each module by its path, in a comment and in its wrapper, and pnpm (this
// workspace) and npm (the store's copy) lay node_modules out differently:
// `../node_modules/.pnpm/ws@8.21.3/node_modules/ws/…` against `node_modules/ws/…`. Written the
// npm way everywhere, the two installs write the same bytes, so the store's copy has the hashes
// this repository commits. A `--local` build names ../cli's own dist, which no install shares.
const code = result.outputFiles[0].text.replace(
  /(?:\.\.\/)*node_modules\/\.pnpm\/[^/"\s]+\/node_modules\//g,
  "node_modules/",
);
writeFileSync(bundle, code, { mode: 0o755 });
copyFileSync(hostSource, host);

const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
mkdirSync(join(here, "src", "vendor"), { recursive: true });
writeFileSync(
  join(here, "src", "vendor", "cli-integrity.ts"),
  `// Written by scripts/vendor-cli.mjs: the vendored CLI's version and the SHA-256 of its two files.
export const CLI_VENDOR = {
  version: "${local ? "local" : version}",
  sha256: {
    "page-scanner.mjs": "${sha256(bundle)}",
    "host.js": "${sha256(host)}",
  },
} as const;
`,
);
console.log(`Vendored @page-scanner/cli ${local ? `(local build, ${version})` : version} into assets/`);
