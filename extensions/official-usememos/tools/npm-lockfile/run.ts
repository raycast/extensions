import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = process.cwd();
// npm's arborist crashes walking pnpm's symlinked node_modules, so resolve in a clean directory
const workspace = mkdtempSync(join(tmpdir(), "memos-lockfile-"));

try {
  copyFileSync(join(root, "package.json"), join(workspace, "package.json"));
  execFileSync("npm", ["install", "--package-lock-only", "--no-audit", "--no-fund"], {
    cwd: workspace,
    stdio: "inherit",
  });
  copyFileSync(join(workspace, "package-lock.json"), join(root, "package-lock.json"));
  console.log("wrote package-lock.json");
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
