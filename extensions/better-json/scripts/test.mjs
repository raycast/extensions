import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = mkdtempSync(path.join(tmpdir(), "better-json-tests-"));
const tests = ["document", "jsonTools", "navigation"];
try {
  const compile = spawnSync(process.execPath, [
    path.join(root, "node_modules/typescript/bin/tsc"),
    "--module", "commonjs", "--target", "ES2023", "--strict", "--esModuleInterop", "--skipLibCheck",
    "--rootDir", root, "--outDir", output, ...tests.map((name) => `tests/${name}.test.ts`),
  ], { cwd: root, stdio: "inherit" });
  if (compile.error) throw compile.error;
  if (compile.status !== 0) process.exitCode = compile.status ?? 1;
  else {
    const run = spawnSync(process.execPath, ["--test", ...tests.map((name) => path.join(output, `tests/${name}.test.js`))], { cwd: root, stdio: "inherit" });
    if (run.error) throw run.error;
    process.exitCode = run.status ?? 1;
  }
} finally {
  rmSync(output, { recursive: true, force: true });
}
