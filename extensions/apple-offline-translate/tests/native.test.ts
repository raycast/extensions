import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test(
  "native text width, layout, translation and rich formatting",
  { skip: process.platform !== "darwin" || process.arch !== "arm64" },
  () => {
    const folder = mkdtempSync(join(tmpdir(), "apple-translate-tests-"));
    try {
      const binary = join(folder, "native-tests");
      execFileSync(
        "xcrun",
        [
          "swiftc",
          "-parse-as-library",
          "-target",
          "arm64-apple-macos26.4",
          "swift/AppleTranslate/Sources/AppleTranslate/Engine.swift",
          "swift/AppleTranslate/Sources/AppleTranslate/Preview.swift",
          "tests/NativeTests.swift",
          "-o",
          binary,
        ],
        { stdio: "inherit" },
      );
      execFileSync(binary, [], { stdio: "inherit", timeout: 60_000 });
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  },
);
