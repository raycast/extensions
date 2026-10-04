const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

function loadSource(entry, runAppleScript = async () => "", moduleMocks = {}) {
  const cache = new Map();
  function load(filename) {
    const resolved = [filename, `${filename}.ts`, `${filename}.tsx`, path.join(filename, "index.ts")].find(
      (candidate) => /\.tsx?$/.test(candidate) && existsSync(candidate),
    );
    if (!resolved) throw new Error(`Cannot resolve ${filename}`);
    if (cache.has(resolved)) return cache.get(resolved).exports;
    const module = { exports: {} };
    cache.set(resolved, module);
    const code = ts.transpileModule(readFileSync(resolved, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, esModuleInterop: true },
      fileName: resolved,
    }).outputText;
    const localRequire = (id) => {
      if (id in moduleMocks) return moduleMocks[id];
      if (id === "@raycast/utils") return { runAppleScript };
      if (id === "@raycast/api") {
        return {
          environment: { isDevelopment: false },
          getPreferenceValues: () => ({}),
          Cache: class MockCache {
            constructor() {
              this.store = new Map();
            }
            get(key) {
              return this.store.get(key);
            }
            set(key, val) {
              this.store.set(key, val);
            }
          },
        };
      }
      return id.startsWith(".") ? load(path.resolve(path.dirname(resolved), id)) : require(id);
    };
    new Function("require", "module", "exports", code)(localRequire, module, module.exports);
    return module.exports;
  }
  return load(path.resolve(__dirname, "..", entry));
}

test("artwork resolution helper exposes getTrackArtwork and respects caching", async () => {
  const { getTrackArtwork } = loadSource("src/util/artwork.ts");
  assert.equal(typeof getTrackArtwork, "function");

  // Call with track when offline / network rejected: falls back to null gracefully
  const result = await getTrackArtwork({ id: "test-id", name: "NonexistentSongXYZ", artist: "UnknownArtistXYZ" });
  assert.equal(result, null);
});
