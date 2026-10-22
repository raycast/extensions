// Runs before every test file (bunfig.toml). bun's module mocks are process-wide and never
// restored, so the stand-ins for @raycast/api, @raycast/utils and React's hooks are installed
// here, once: whatever order bun loads files in, every file sees the same world.
import { afterAll, afterEach, mock } from "bun:test";
import { join } from "node:path";
import { tmp } from "./raycast-mock";
import { RUN_REAL } from "./real-fabric";
import { hooks } from "./render-harness";
import { guardBun, takeRefusals } from "./spawn-guard";

const realReact = await import("react");
mock.module("react", () => ({ ...realReact, ...hooks, default: { ...realReact, ...hooks } }));

// No static import in this file reaches lib/loaders, so setting this before the dynamic import below
// moves its folders under tmp in every test file, with or without FABRIC_REAL (ISC-47.1). Real fabric
// still reads its own folder; only our reads and writes move.
process.env.FABRIC_RAYCAST_TEST_DIR = join(tmp, "fabric");
// Fail closed: if the seam ever stops working, no test file runs, so none can write the real folder.
const loaders = await import("../lib/loaders");
for (const [name, dir] of Object.entries(loaders).filter(([k]) => k.endsWith("_DIR")))
  if (!String(dir).startsWith(`${tmp}/`)) throw new Error(`test preload: ${name} is ${dir}, outside ${tmp}`);

// Real fabric reads its own .env: outside FABRIC_REAL=1 no test may start it (test/spawn-guard.ts).
if (!RUN_REAL) {
  guardBun(Bun);
  const fail = () => {
    const refused = takeRefusals();
    if (refused.length) throw new Error(refused.join("\n"));
  };
  afterEach(fail);
  afterAll(fail);
}
