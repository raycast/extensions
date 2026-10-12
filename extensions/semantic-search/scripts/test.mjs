import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const directory = await mkdtemp(join(tmpdir(), "semantic-search-regressions-"));
try {
  const output = join(directory, "regressions.cjs");
  await build({
    entryPoints: ["tests/regressions.test.tsx"],
    outfile: output,
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "es2022",
    plugins: [
      {
        name: "mock-launcher-and-engine",
        setup(builder) {
          builder.onResolve(
            { filter: /^react(?:\/jsx-runtime|-test-renderer)?$/ },
            (args) => ({ path: require.resolve(args.path), external: true }),
          );
          builder.onResolve({ filter: /^@raycast\/api$/ }, () => ({
            path: resolve("tests/raycast-mock.tsx"),
          }));
          builder.onResolve({ filter: /^\.\/launcher$/ }, () => ({
            path: resolve("tests/raycast-mock.tsx"),
          }));
          builder.onResolve({ filter: /^\.\/runtime$/ }, (args) =>
            args.importer.endsWith("service.ts") ||
            args.importer.endsWith("engine-setup.tsx")
              ? { path: resolve("tests/raycast-mock.tsx") }
              : undefined,
          );
        },
      },
    ],
  });
  const result = spawnSync(
    process.execPath,
    ["--test", ...process.argv.slice(2), output],
    {
      stdio: "inherit",
      timeout: 30000,
    },
  );
  process.exitCode = result.status ?? 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
