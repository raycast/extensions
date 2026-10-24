import { describe, expect, it } from "vitest";
import { integerIn, presetName } from "./validation";

describe("integerIn", () => {
  const distance = integerIn(0, 100);

  it("accepts whole numbers inside the motor range", () => {
    expect(distance("0")).toBeUndefined();
    expect(distance("100")).toBeUndefined();
  });

  it("rejects values the mount cannot reach so the user is told before anything moves", () => {
    expect(distance("101")).toBeDefined();
    expect(distance("-1")).toBeDefined();
    expect(distance("12.5")).toBeDefined();
    expect(distance("abc")).toBeDefined();
    expect(distance("")).toBeDefined();
  });
});

describe("presetName", () => {
  it("requires a name because unnamed presets are treated as empty slots by the mount", () => {
    expect(presetName("")).toBeDefined();
    expect(presetName("   ")).toBeDefined();
  });

  it("accepts names up to the 32 bytes the mount can store", () => {
    expect(presetName("a".repeat(32))).toBeUndefined();
  });

  it("counts bytes, not characters, because the mount stores UTF-8", () => {
    expect(presetName("ñ".repeat(16))).toBeUndefined();
    expect(presetName("ñ".repeat(17))).toBeDefined();
  });
});
