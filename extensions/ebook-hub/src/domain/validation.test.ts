import { describe, expect, it } from "vitest";

import {
  ValidationError,
  expectArray,
  expectNonNegativeInteger,
  expectNullableString,
  expectRecord,
  expectString,
  expectStringArray,
  isOneOf,
  isRecord,
} from "./validation";

describe("validation helpers", () => {
  it("recognizes plain records", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(() => expectRecord("text", "ctx")).toThrow(new ValidationError("ctx must be an object"));
  });

  it("validates non-empty strings", () => {
    expect(expectString({ a: "x" }, "a", "ctx")).toBe("x");
    expect(() => expectString({ a: " " }, "a", "ctx")).toThrow("ctx.a must be a non-empty string");
    expect(() => expectString({ a: 1 }, "a", "ctx")).toThrow(ValidationError);
  });

  it("validates nullable strings", () => {
    expect(expectNullableString({}, "a", "ctx")).toBeNull();
    expect(expectNullableString({ a: null }, "a", "ctx")).toBeNull();
    expect(expectNullableString({ a: "  " }, "a", "ctx")).toBeNull();
    expect(expectNullableString({ a: "v" }, "a", "ctx")).toBe("v");
    expect(() => expectNullableString({ a: 3 }, "a", "ctx")).toThrow("ctx.a must be a string or null");
  });

  it("validates arrays", () => {
    expect(expectStringArray({ a: ["x"] }, "a", "ctx")).toEqual(["x"]);
    expect(() => expectStringArray({ a: "x" }, "a", "ctx")).toThrow("ctx.a must be an array of strings");
    expect(() => expectStringArray({ a: [1] }, "a", "ctx")).toThrow(ValidationError);
    expect(expectArray({ a: [] }, "a", "ctx")).toEqual([]);
    expect(() => expectArray({ a: {} }, "a", "ctx")).toThrow("ctx.a must be an array");
  });

  it("validates non-negative integers", () => {
    expect(expectNonNegativeInteger({ a: 2 }, "a", "ctx")).toBe(2);
    for (const value of [-1, 1.5, "1"]) {
      expect(() => expectNonNegativeInteger({ a: value }, "a", "ctx")).toThrow("ctx.a must be a non-negative integer");
    }
  });

  it("checks membership in a literal list", () => {
    expect(isOneOf(["a", "b"], "a")).toBe(true);
    expect(isOneOf(["a", "b"], "c")).toBe(false);
  });
});
