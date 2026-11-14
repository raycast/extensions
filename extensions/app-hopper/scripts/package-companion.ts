import { execFileSync } from "node:child_process";
import { rmSync, readFileSync } from "node:fs";
import path from "node:path";
import "./build-companion.ts";

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(readFileSync(path.join(root, "companion/manifest.json"), "utf8"));
const directory = path.join(root, "dist/companion");
const output = path.join(directory, `app-hopper-companion-${manifest.version}.zip`);
rmSync(output, { force: true });
execFileSync("/usr/bin/zip", ["-X", output, "manifest.json", "background.js"], {
  cwd: path.join(directory, "extension"),
  stdio: "ignore",
});
console.log(`Unsigned shared companion: ${output}`);
console.log("Submit this ZIP to Mozilla for signing before installing it in regular Firefox.");
