import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const directory = path.join(root, "dist/companion/extension");
execFileSync(
  process.execPath,
  [path.join(root, "node_modules/typescript/bin/tsc"), "-p", "tsconfig.companion.json", "--outDir", directory],
  {
    cwd: root,
    stdio: "inherit",
  },
);
mkdirSync(directory, { recursive: true });
copyFileSync(path.join(root, "companion/manifest.json"), path.join(directory, "manifest.json"));
