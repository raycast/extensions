import type { Xeet } from "@xeet/core";
import { createRequire } from "node:module";
import { join } from "node:path";

let engine: Xeet | undefined;

/** Load the npm renderer staged by scripts/prepare-xeet.mjs. */
export function loadEngine(assetsPath: string): Xeet {
  if (!engine) {
    const requireAsset = createRequire(join(assetsPath, "xeet-runtime", "package.json"));
    const { loadXeetSync } = requireAsset("./src/node.cjs") as typeof import("@xeet/core/node");
    engine = loadXeetSync();
  }
  return engine;
}
