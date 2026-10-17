import { rmSync } from "node:fs";
rmSync(new URL("../.test-dist/", import.meta.url), { recursive: true, force: true });
