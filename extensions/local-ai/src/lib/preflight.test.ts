import { describe, expect, it } from "vitest";
import { evaluatePreflight, isPreflightCacheFresh } from "./preflight";

const licenseOk = { exitCode: 0, stdout: "Agreed to license FM1 version 1.0 on 21 Oct 2026 at 19:07.\n", stderr: "" };
const availableOk = { exitCode: 0, stdout: "System model available\n", stderr: "" };

function statuses(result: ReturnType<typeof evaluatePreflight>) {
  return result.checks.map((check) => check.status);
}

describe("evaluatePreflight", () => {
  it("fails on a missing binary and skips the rest", () => {
    const result = evaluatePreflight({ binaryExists: false });
    expect(result.ok).toBe(false);
    expect(result.firstFailure).toBe("binary");
    expect(statuses(result)).toEqual(["failed", "skipped", "skipped"]);
  });

  it("passes when every probe succeeds", () => {
    const result = evaluatePreflight({ binaryExists: true, license: licenseOk, available: availableOk });
    expect(result.ok).toBe(true);
    expect(result.firstFailure).toBeUndefined();
    expect(statuses(result)).toEqual(["ok", "ok", "ok"]);
  });

  it("fails on the license exit code and skips availability", () => {
    const result = evaluatePreflight({ binaryExists: true, license: { exitCode: 69, stdout: "", stderr: "" } });
    expect(result.firstFailure).toBe("license");
    expect(statuses(result)).toEqual(["ok", "failed", "skipped"]);
  });

  it("fails when the license output does not start with Agreed", () => {
    const result = evaluatePreflight({
      binaryExists: true,
      license: { exitCode: 0, stdout: "You have not agreed", stderr: "" },
    });
    expect(result.checks[1].status).toBe("failed");
  });

  it("fails when the model is not available", () => {
    const result = evaluatePreflight({
      binaryExists: true,
      license: licenseOk,
      available: { exitCode: 1, stdout: "", stderr: "Error: ..." },
    });
    expect(result.firstFailure).toBe("available");
    expect(statuses(result)).toEqual(["ok", "ok", "failed"]);
  });
});

describe("isPreflightCacheFresh", () => {
  it("expires at the TTL boundary", () => {
    expect(isPreflightCacheFresh(0, 299_999)).toBe(true);
    expect(isPreflightCacheFresh(0, 300_000)).toBe(false);
  });
});
