import { rmSync } from "node:fs";

// Raycast preserves existing output, including orphan source maps. Only clean
// this repository's generated distribution, never the registered extension.
rmSync(new URL("../dist", import.meta.url), { recursive: true, force: true });
