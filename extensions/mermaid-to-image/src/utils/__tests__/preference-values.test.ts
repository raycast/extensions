import { describe, expect, it } from "vitest";
import { resolveCompatibleScale, resolveGenerationTimeoutMs } from "../preference-values";

describe("resolveGenerationTimeoutMs", () => {
  it("converts a string preference value to milliseconds", () => {
    expect(resolveGenerationTimeoutMs({ generationTimeout: "15" })).toBe(15_000);
  });

  it("falls back to the default timeout for invalid values", () => {
    expect(resolveGenerationTimeoutMs({ generationTimeout: "" })).toBe(10_000);
    expect(resolveGenerationTimeoutMs({ generationTimeout: "abc" })).toBe(10_000);
    expect(resolveGenerationTimeoutMs({ generationTimeout: "0" })).toBe(10_000);
  });
});

describe("resolveCompatibleScale", () => {
  it("converts a string preference value to a numeric scale", () => {
    expect(resolveCompatibleScale({ scale: "4" })).toBe(4);
  });

  it("falls back to the default scale for invalid values", () => {
    expect(resolveCompatibleScale({ scale: undefined })).toBe(4);
    expect(resolveCompatibleScale({ scale: "" as never })).toBe(4);
    expect(resolveCompatibleScale({ scale: "invalid" as never })).toBe(4);
    expect(resolveCompatibleScale({ scale: "0" as never })).toBe(4);
  });
});
