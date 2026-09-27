import assert from "node:assert/strict";
import { homedir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { trashAsAdmin } from "../src/lib/elevate";
import { UnsafePathError } from "../src/lib/safety";

// None of these reach osascript: validation throws first, so no authentication
// dialog is ever shown. That is the property being tested.
describe("trashAsAdmin refuses before escalating", () => {
  const forbidden = [
    "/etc/passwd",
    "/System/Library/CoreServices",
    "/",
    join(homedir(), "Documents"),
    join(homedir(), "Library"),
    join(homedir(), "Library/Caches"),
    join(homedir(), "Library/Application Support/Google"),
    "relative/path",
  ];

  for (const path of forbidden) {
    it(path, async () => {
      await assert.rejects(() => trashAsAdmin([path]), UnsafePathError);
    });
  }

  it("refuses the whole batch when any single path is unsafe", async () => {
    // Root ignores the file permissions that would otherwise contain a mistake,
    // so a partially applied batch is not acceptable.
    await assert.rejects(
      () => trashAsAdmin([join(homedir(), "Library/Caches/com.example.app"), "/etc/passwd"]),
      UnsafePathError,
    );
  });

  it("does nothing at all for an empty list", async () => {
    await assert.doesNotReject(() => trashAsAdmin([]));
  });
});
