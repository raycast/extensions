import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Compiles swift/PrayerTimes/Sources/StatusLine.swift with its self-test (test/swift/main.swift) and runs it.
// The /usr/bin shim, which finds the SDK (the toolchain's own swiftc can't load the standard library alone).
const swiftc = "/usr/bin/swiftc";

describe.skipIf(!existsSync(swiftc))("Swift status line", () => {
  it("keeps the status line through syncs and marks", () => {
    const dir = mkdtempSync(join(tmpdir(), "prayer-status-line-"));
    try {
      const binary = join(dir, "status-line");
      execFileSync(swiftc, ["-o", binary, "swift/PrayerTimes/Sources/StatusLine.swift", "test/swift/main.swift"]);
      expect(execFileSync(binary, { encoding: "utf8" }).trim()).toBe("OK");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 120_000);
});
