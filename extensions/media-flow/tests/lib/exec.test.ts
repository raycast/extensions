import { describe, expect, it } from "vitest";
import { execSafe } from "../../src/lib/exec";

describe("execSafe", () => {
  it("returns trimmed stdout on success", async () => {
    expect(await execSafe("echo", ["hello"])).toBe("hello");
  });
  it("returns null for missing binary", async () => {
    expect(await execSafe("definitely-not-a-binary-xyz", [])).toBeNull();
  });
  it("returns null on timeout", async () => {
    expect(await execSafe("sleep", ["2"], { timeoutMs: 100, retries: 0 })).toBeNull();
  });
  it("returns null on non-zero exit", async () => {
    expect(await execSafe("false", [], { retries: 0 })).toBeNull();
  });
});
