import { bind, type Xeet } from "@xeet/core";
import { createRequire } from "node:module";
import { join } from "node:path";

let engine: Xeet | undefined;

/** Only load the audited, open-font WASM shipped inside Raycast's assets. */
export function loadEngine(assetsPath: string): Xeet {
  if (!engine) {
    const requireAsset = createRequire(join(assetsPath, "xeet", "package.json"));
    engine = bind(requireAsset("./xeet_wasm.js"));
  }
  return engine;
}
