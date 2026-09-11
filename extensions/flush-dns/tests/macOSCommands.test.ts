import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { getMacOSCommandsForVersion } from "../src/macOSCommands.ts";

describe("getMacOSCommandsForVersion", () => {
  test("selects both OS-level cache commands on modern macOS", () => {
    assert.deepEqual(getMacOSCommandsForVersion("27.0"), [
      { executable: "/usr/bin/dscacheutil", args: ["-flushcache"] },
      { executable: "/usr/bin/killall", args: ["-HUP", "mDNSResponder"] },
    ]);
  });

  const legacyCases = [
    ["10.15.7", [{ executable: "/usr/bin/killall", args: ["-HUP", "mDNSResponder"] }]],
    ["10.6.8", [{ executable: "/usr/bin/dscacheutil", args: ["-flushcache"] }]],
    ["10.9.5", [{ executable: "/usr/bin/discoveryutil", args: ["mdnsflushcache"] }]],
  ] as const;

  for (const [version, expected] of legacyCases) {
    test(`preserves the legacy command mapping for macOS ${version}`, () => {
      assert.deepEqual(getMacOSCommandsForVersion(version), expected);
    });
  }

  test("returns null for an untested major version", () => {
    assert.equal(getMacOSCommandsForVersion("9.5"), null);
  });

  test("rejects an unparsable version", () => {
    assert.throws(() => getMacOSCommandsForVersion("unknown"), /Unparsable macOS version: unknown/);
  });
});
