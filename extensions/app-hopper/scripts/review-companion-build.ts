// Standalone reviewer build, copied as build.ts into the source submission.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";

execFileSync(process.execPath, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"], { stdio: "inherit" });
mkdirSync("build", { recursive: true });
copyFileSync("companion/manifest.json", "build/manifest.json");
