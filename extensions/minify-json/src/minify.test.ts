import { describe, expect, it } from "vitest";
import { isValidJson, transformJson } from "./minify";

describe("isValidJson", () => {
  it("accepts valid JSON values", () => {
    expect(isValidJson('{"a":1}')).toBe(true);
    expect(isValidJson("null")).toBe(true);
    expect(isValidJson('"text"')).toBe(true);
  });

  it("rejects invalid or empty input", () => {
    expect(isValidJson("{")).toBe(false);
    expect(isValidJson("not json")).toBe(false);
    expect(isValidJson("")).toBe(false);
  });
});

describe("transformJson", () => {
  it("minifies an object onto a single line", () => {
    expect(transformJson('{\n  "a": 1\n}')).toBe('{"a":1}');
  });

  it("minifies an array", () => {
    expect(transformJson("[1,  2,  3]")).toBe("[1,2,3]");
  });

  it("minifies nested structures", () => {
    expect(transformJson('{ "a": { "b": [1, 2] } }')).toBe('{"a":{"b":[1,2]}}');
  });

  it("pretty prints with two-space indentation", () => {
    expect(transformJson('{"a":1,"b":2}', true)).toBe('{\n  "a": 1,\n  "b": 2\n}');
  });

  it("pretty and minified outputs differ", () => {
    const input = '{"a":1,"b":[1,2,3]}';
    expect(transformJson(input, true)).not.toBe(transformJson(input));
  });

  it("preserves primitive values", () => {
    expect(transformJson("null")).toBe("null");
    expect(transformJson("true")).toBe("true");
    expect(transformJson('"hi"')).toBe('"hi"');
    expect(transformJson("42")).toBe("42");
  });

  it("preserves string escapes", () => {
    expect(transformJson('"a\\nb"')).toBe('"a\\nb"');
  });

  it("throws SyntaxError on invalid json", () => {
    expect(() => transformJson("{")).toThrow(SyntaxError);
    expect(() => transformJson("not json")).toThrow(SyntaxError);
  });

  it("throws SyntaxError on empty input", () => {
    expect(() => transformJson("")).toThrow(SyntaxError);
  });
});
