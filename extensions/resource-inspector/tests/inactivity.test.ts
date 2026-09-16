import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, copyFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const execute = promisify(execFile);
let directory: string, binary: string;
before(async () => {
  directory = await mkdtemp(join(tmpdir(), "inspector-inactivity-test-"));
  binary = join(directory, "fixture");
  await copyFile(
    "tests/InactivityFixture.swift",
    join(directory, "main.swift"),
  );
  await execute(
    "/usr/bin/swiftc",
    [
      "-DINSPECTOR_TESTING",
      "-module-cache-path",
      join(tmpdir(), "resource-inspector-test-cache"),
      "native/Inspector.swift",
      "native/Inactivity.swift",
      join(directory, "main.swift"),
      "-o",
      binary,
    ],
    { timeout: 60000 },
  );
});
after(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
});
for (const scenario of [
  "threshold",
  "activity",
  "gaps",
  "app-members",
  "exclusions",
  "notifications",
  "storage",
  "force",
  "force-children",
]) {
  test(`inactivity: ${scenario}`, async () => {
    const result = await execute(binary, [scenario, directory], {
      timeout: 15000,
    });
    assert.match(result.stdout, new RegExp(`passed ${scenario}`));
  });
}
