import { describe, expect, it } from "vitest";
import { resolveApiKey } from "../src/lib/auth";

describe("resolveApiKey", () => {
  it("returns the trimmed preference key", () => {
    expect(resolveApiKey("  abc123  ")).toBe("abc123");
  });

  it("returns null when the preference is unset", () => {
    expect(resolveApiKey(null)).toBeNull();
    expect(resolveApiKey(undefined)).toBeNull();
  });

  it("returns null for an empty or whitespace-only key", () => {
    expect(resolveApiKey("")).toBeNull();
    expect(resolveApiKey("   ")).toBeNull();
  });
});