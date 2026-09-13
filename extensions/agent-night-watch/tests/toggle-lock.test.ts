import { describe, expect, it } from "vitest";
import {
  LOCK_STALE_AFTER_MS,
  lockLeaseExpired,
  parseLockOwnerToken,
  serializeLockOwner,
} from "../src/toggle-lock";

describe("toggle lock lease", () => {
  it("round-trips the unique owner token", () => {
    const contents = serializeLockOwner({
      version: 1,
      pid: 42,
      token: "operation-a",
      acquiredAt: "2026-08-13T00:00:00.000Z",
    });

    expect(parseLockOwnerToken(contents)).toBe("operation-a");
  });

  it("does not trust the legacy long-lived Raycast backend PID format", () => {
    expect(parseLockOwnerToken("69240\n")).toBeUndefined();
  });

  it("reclaims an abandoned lease promptly but not an active lease", () => {
    const now = 100_000;
    expect(lockLeaseExpired(now - LOCK_STALE_AFTER_MS + 1, now)).toBe(false);
    expect(lockLeaseExpired(now - LOCK_STALE_AFTER_MS, now)).toBe(true);
  });
});
