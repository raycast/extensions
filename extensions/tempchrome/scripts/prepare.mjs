import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..", "..");

if (existsSync(resolve(repoRoot, ".git"))) {
  execFileSync("git", ["config", "core.hooksPath", ".githooks"], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  console.info(
    "\x1b[36mℹ [prepare] Git hooks path set to .githooks\x1b[0m",
  );
}
