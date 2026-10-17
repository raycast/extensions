import { environment } from "@raycast/api";
import { join } from "path";
import { pathToFileURL } from "url";

// SDK does new URL('oak_session_wasm_nodejs_bg.wasm', import.meta.url); in Raycast's bundle
// import.meta.url is undefined, so we patch URL to supply the assets path as base when base is missing.
const OriginalURL = globalThis.URL;
const wasmBase = pathToFileURL(join(environment.assetsPath, "oak_session_wasm_nodejs_bg.wasm")).href.replace(
  /[^/]+$/,
  ""
);
globalThis.URL = class PatchedURL extends OriginalURL {
  constructor(input: string | URL, base?: string | URL) {
    const isWasm =
      base === undefined &&
      (input === "oak_session_wasm_nodejs_bg.wasm" || String(input).endsWith("oak_session_wasm_nodejs_bg.wasm"));
    super(input as string, isWasm ? wasmBase : base);
  }
} as typeof URL;
