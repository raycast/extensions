import { execSync } from "node:child_process";
import { renameSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const scriptsDir = join(root, "scripts/swift");

execSync("swift build --configuration=release --arch arm64 --arch x86_64", {
  cwd: scriptsDir,
  stdio: "inherit",
});

renameSync(join(scriptsDir, ".build/apple/Products/Release/recognizeText"), join(root, "assets/recognizeText"));

rmSync(join(scriptsDir, ".build"), { recursive: true, force: true });
rmSync(join(scriptsDir, ".swiftpm"), { recursive: true, force: true });
