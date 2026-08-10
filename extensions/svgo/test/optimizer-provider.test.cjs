const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const Module = require("node:module");

const repositoryRoot = path.resolve(__dirname, "..");
const buildDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "raycast-svgo-test-"));

async function main() {
  const manifest = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "package.json"), "utf8"));
  assert.deepEqual(manifest.platforms, ["macOS"]);
  assert.doesNotMatch(fs.readFileSync(path.join(repositoryRoot, "src/index.tsx"), "utf8"), /type Provider =/);
  assert.doesNotMatch(fs.readFileSync(path.join(repositoryRoot, "src/optimizer.ts"), "utf8"), /type Provider =/);

  execFileSync("npx", ["tsc", "--project", "tsconfig.json", "--rootDir", "src", "--outDir", buildDirectory], {
    cwd: repositoryRoot,
    stdio: "pipe",
  });
  fs.mkdirSync(path.join(buildDirectory, "vendor"), { recursive: true });
  fs.copyFileSync(
    path.join(repositoryRoot, "src/vendor/oxvg-wasm.cjs"),
    path.join(buildDirectory, "vendor/oxvg-wasm.cjs"),
  );

  const originalLoad = Module._load;
  Module._load = function loadMockedRaycastApi(request, parent, isMain) {
    if (request === "@raycast/api") {
      return {
        environment: {
          assetsPath: path.join(repositoryRoot, "assets"),
        },
        getPreferenceValues() {
          return { provider: "oxvg" };
        },
      };
    }

    try {
      return originalLoad.call(this, request, parent, isMain);
    } catch (error) {
      if (request.startsWith(".")) {
        throw error;
      }

      const resolvedRequest = require.resolve(request, { paths: [repositoryRoot] });
      return originalLoad.call(this, resolvedRequest, parent, isMain);
    }
  };

  const { optimizeSvg } = require(path.join(buildDirectory, "optimizer.js"));
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  console.error = () => {};
  console.warn = () => {};

  let result;
  try {
    result = await optimizeSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><title>Title</title><rect width="10" height="10"/></svg>',
      ["removeTitle"],
    );
  } finally {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    Module._load = originalLoad;
  }

  assert.match(result, /^<svg/);
  assert.doesNotMatch(result, /<title>/);
}

main().finally(() => {
  fs.rmSync(buildDirectory, { recursive: true, force: true });
});
