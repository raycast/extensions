import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const folder = mkdtempSync(join(tmpdir(), "apple-translate-test-"));
try {
  const binary = join(folder, "engine-tests");
  execFileSync(
    "xcrun",
    [
      "swiftc",
      "-parse-as-library",
      "-target",
      "arm64-apple-macos26.4",
      "native/Engine.swift",
      "tests/EngineTests.swift",
      "-o",
      binary,
    ],
    { stdio: "inherit" },
  );
  execFileSync(binary, [], { stdio: "inherit", timeout: 60_000 });
} finally {
  rmSync(folder, { recursive: true, force: true });
}
