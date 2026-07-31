import { describe, it, expect } from "vitest";
import { parseMetadata, stringifyMetadata } from "./metadata";

describe("parseMetadata", () => {
  it("treats empty/whitespace as an empty object", () => {
    expect(parseMetadata("")).toEqual({});
    expect(parseMetadata("   ")).toEqual({});
  });
  it("parses a JSON object", () => {
    expect(parseMetadata('{"a":1,"b":"x"}')).toEqual({ a: 1, b: "x" });
  });
  it("throws on arrays, primitives, and invalid JSON", () => {
    expect(() => parseMetadata("[1,2]")).toThrow();
    expect(() => parseMetadata("42")).toThrow();
    expect(() => parseMetadata("nope")).toThrow();
  });
});

describe("stringifyMetadata", () => {
  it("pretty-prints an object", () => {
    expect(stringifyMetadata({ a: 1 })).toBe('{\n  "a": 1\n}');
  });
  it("renders empty/missing as an empty string", () => {
    expect(stringifyMetadata({})).toBe("");
    expect(stringifyMetadata(undefined)).toBe("");
    expect(stringifyMetadata(null)).toBe("");
  });
});
