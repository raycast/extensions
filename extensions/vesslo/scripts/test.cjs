const { execFileSync } = require("node:child_process");
const { mkdtempSync, readdirSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");

const output = mkdtempSync(join(tmpdir(), "vesslo-raycast-tests-"));
try {
  execFileSync(
    process.execPath,
    [
      require.resolve("typescript/bin/tsc"),
      "--outDir",
      output,
      "--pretty",
      "false",
    ],
    { stdio: "inherit" },
  );
  const tests = readdirSync("tests")
    .filter((name) => name.endsWith(".test.cjs"))
    .sort()
    .map((name) => resolve("tests", name));
  execFileSync(process.execPath, ["--test", ...tests], {
    stdio: "inherit",
    env: {
      ...process.env,
      VESSLO_TEST_BUILD: output,
      NODE_PATH: resolve("node_modules"),
    },
  });
} finally {
  rmSync(output, { recursive: true, force: true });
}
