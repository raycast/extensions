// Raycast bundles JavaScript but does not follow Xeet's filesystem reads.
// Stage the installed npm renderer and font packs as generated runtime assets.
import { build } from "esbuild";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
const entry = require.resolve("@xeet/core/node");
const packageRoot = dirname(dirname(entry));
const destination = join(root, "assets", "xeet-runtime");

await rm(destination, { recursive: true, force: true });
await mkdir(join(destination, "src"), { recursive: true });
await cp(join(packageRoot, "wasm"), join(destination, "wasm"), { recursive: true });
await cp(join(packageRoot, "README.md"), join(destination, "README.md"));
await writeFile(join(destination, "package.json"), JSON.stringify({ type: "commonjs" }) + "\n");
await build({
  entryPoints: [entry],
  outfile: join(destination, "src", "node.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  // Keep the upstream loader's paths relative to its relocated src directory.
  define: { "import.meta.url": "__xeetModuleUrl" },
  banner: { js: 'const __xeetModuleUrl = require("node:url").pathToFileURL(__filename).href;' },
});
