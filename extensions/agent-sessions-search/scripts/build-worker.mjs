// Bundles the index worker into assets/ so the extension can spawn it with Raycast's Node.
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

await build({
  entryPoints: [join(root, "src/worker/index-worker.ts")],
  outfile: join(root, "assets/index-worker.cjs"),
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  external: ["node:*"],
  logLevel: "warning",
});
console.log("built assets/index-worker.cjs");
