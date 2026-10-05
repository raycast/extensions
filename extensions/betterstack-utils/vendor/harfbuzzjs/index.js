// Satori requires harfbuzzjs, whose index.js starts the Emscripten loader with no options.
// The loader then reads hb.wasm from the bundle's directory, which Raycast doesn't ship.
// Raycast's esbuild config inlines .wasm imports as bytes, so hand those to the loader instead.
const createHarfBuzz = require("harfbuzzjs-upstream/hb.js");
const wrapHarfBuzz = require("harfbuzzjs-upstream/hbjs.js");

function loadInlinedWasmBinary() {
  try {
    const wasmModule = require("harfbuzzjs-upstream/hb.wasm");
    return wasmModule.default ?? wasmModule;
  } catch (error) {
    // Unbundled (e.g. under vitest) Node parses the .wasm as JavaScript and throws a SyntaxError.
    // The loader then finds hb.wasm next to hb.js on its own.
    if (error instanceof SyntaxError) return undefined;
    throw error;
  }
}

module.exports = createHarfBuzz({ wasmBinary: loadInlinedWasmBinary() }).then(wrapHarfBuzz);
