import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
const directory = await mkdtemp(join(tmpdir(), "cliproxy-tests-"));
try {
  const entries = ["tests/usage.test.ts", "tests/providers.test.ts", "tests/api.test.ts"];
  await build({
    entryPoints: entries,
    outdir: directory,
    outExtension: { ".js": ".cjs" },
    bundle: true,
    platform: "node",
    format: "cjs",
    plugins: [
      {
        name: "raycast-test-preferences",
        setup(build) {
          build.onResolve({ filter: /^@raycast\/api$/ }, () => ({
            path: "raycast-test-preferences",
            namespace: "test",
          }));
          build.onLoad({ filter: /.*/, namespace: "test" }, () => ({
            contents:
              "export const getPreferenceValues = () => globalThis.__quotaTestPreferences; const caches = new Map(); export class Cache { constructor(options = {}) { this.store = caches.get(options.namespace) ?? new Map(); caches.set(options.namespace, this.store); } get(key) { return this.store.get(key); } set(key, value) { this.store.set(key, value); } } export const environment = {appearance: 'dark'};",
            loader: "js",
          }));
        },
      },
    ],
  });
  const result = spawnSync(
    process.execPath,
    ["--test", ...entries.map((path) => join(directory, path.split("/").at(-1).replace(".ts", ".cjs")))],
    { stdio: "inherit" },
  );
  process.exitCode = result.status ?? 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
