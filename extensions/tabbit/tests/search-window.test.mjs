import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

async function loadTabbitModule() {
  const outdir = await mkdtemp(join(tmpdir(), "tabbit-test-"));
  const outfile = join(outdir, "tabbit.mjs");

  await esbuild.build({
    entryPoints: ["src/tabbit.ts"],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    plugins: [
      {
        name: "raycast-api-stub",
        setup(build) {
          build.onResolve({ filter: /^@raycast\/api$/ }, () => ({
            path: "raycast-api",
            namespace: "raycast-api-stub",
          }));
          build.onLoad(
            { filter: /^raycast-api$/, namespace: "raycast-api-stub" },
            () => ({
              contents:
                "export const Toast = { Style: { Failure: 'failure' } }; export function getPreferenceValues() { return {}; } export async function showToast() {}",
              loader: "js",
            }),
          );
        },
      },
    ],
  });

  try {
    return await import(pathToFileURL(outfile));
  } finally {
    await rm(outdir, { force: true, recursive: true });
  }
}

test("tabbit internal URLs are excluded from searchable results", async () => {
  const { isSearchableTabbitUrl } = await loadTabbitModule();

  assert.equal(isSearchableTabbitUrl("tabbit://newtab/"), false);
  assert.equal(isSearchableTabbitUrl("Tabbit://settings"), false);
});

test("web URLs remain searchable", async () => {
  const { isSearchableTabbitUrl } = await loadTabbitModule();

  assert.equal(isSearchableTabbitUrl("https://example.com"), true);
  assert.equal(isSearchableTabbitUrl("http://localhost:3000"), true);
});

test("installed CN version is selected when it is the only installed Tabbit app", async () => {
  const { resolveTabbitApp } = await loadTabbitModule();

  const app = resolveTabbitApp("auto", (path) =>
    path.includes("Tabbit Browser.app"),
  );

  assert.equal(app.version, "cn");
  assert.equal(app.bundleId, "com.tab-browser.Tabbit");
});

test("installed global version is selected when it is the only installed Tabbit app", async () => {
  const { resolveTabbitApp } = await loadTabbitModule();

  const app = resolveTabbitApp("auto", (path) => path.includes("Tabbit.app"));

  assert.equal(app.version, "global");
  assert.equal(app.bundleId, "com.tabbit-ai.Tabbit");
});

test("configured version is selected when both Tabbit apps are installed", async () => {
  const { resolveTabbitApp } = await loadTabbitModule();

  const exists = () => true;

  assert.equal(resolveTabbitApp("cn", exists).version, "cn");
  assert.equal(resolveTabbitApp("global", exists).version, "global");
});

test("auto keeps the CN version as the default when both Tabbit apps are installed", async () => {
  const { resolveTabbitApp } = await loadTabbitModule();

  const app = resolveTabbitApp("auto", () => true);

  assert.equal(app.version, "cn");
  assert.equal(app.bundleId, "com.tab-browser.Tabbit");
});
