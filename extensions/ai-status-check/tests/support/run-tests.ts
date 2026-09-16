import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";

const testDirectory = path.resolve("node_modules/.cache/ai-status-check-tests/tests");
const testFiles = readdirSync(testDirectory)
  .filter((file) => file.endsWith(".test.js"))
  .sort()
  .map((file) => path.join(testDirectory, file));

if (testFiles.length === 0) throw new Error("No compiled test files were found");

const result = spawnSync(process.execPath, ["--test", ...testFiles], { stdio: "inherit" });

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
