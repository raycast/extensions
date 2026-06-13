import { describe, expect, it } from "vitest";

import { bestEffortFormat } from "../src/lib/best-effort-format";
import { formatJsonInput } from "../src/lib/format-json";

describe("strict JSON formatting", () => {
  it("pretty-prints and minifies a valid document", () => {
    expect(formatJsonInput('{"name":"Alice","active":true}')).toEqual({
      kind: "valid",
      minified: '{"name":"Alice","active":true}',
      pretty: '{\n  "name": "Alice",\n  "active": true\n}',
    });
  });

  it.each([
    ["string", '"hello"', '"hello"'],
    ["number", "42", "42"],
    ["boolean", "true", "true"],
    ["null", "null", "null"],
  ])("accepts a primitive %s root", (_name, input, expected) => {
    expect(formatJsonInput(input)).toEqual({
      kind: "valid",
      minified: expected,
      pretty: expected,
    });
  });

  it("keeps stringified JSON as one JSON string", () => {
    const input = '"{\\"name\\":\\"Alice\\"}"';
    expect(formatJsonInput(input)).toEqual({
      kind: "valid",
      minified: input,
      pretty: input,
    });
  });
});

describe("best-effort formatting", () => {
  it("formats JSON embedded in logs without removing surrounding text", () => {
    expect(bestEffortFormat('INFO payload={"a":1,"b":[true,false]} done')).toBe(
      'INFO payload={\n  "a": 1,\n  "b": [\n    true,\n    false\n  ]\n} done',
    );
  });

  it("formats multiple spans in their original order", () => {
    expect(bestEffortFormat('left {"a":1} middle [1,2] right')).toBe(
      'left {\n  "a": 1\n} middle [\n  1,\n  2\n] right',
    );
  });

  it("preserves relaxed syntax and comments", () => {
    expect(
      bestEffortFormat("{user:'alice',roles:['admin',],/* keep */active:true}"),
    ).toBe(
      "{\n  user: 'alice',\n  roles: [\n    'admin',\n  ],\n  /* keep */active: true\n}",
    );
  });

  it("leaves an unbalanced region unchanged", () => {
    const input = 'INFO {"a":1';
    expect(bestEffortFormat(input)).toBe(input);
  });

  it("still formats a balanced inner span after an unclosed delimiter", () => {
    expect(bestEffortFormat('broken { then {"a":1}')).toBe(
      'broken { then {\n  "a": 1\n}',
    );
  });

  it("handles many unclosed delimiters in one pass", () => {
    const input = "{".repeat(100_000);
    expect(bestEffortFormat(input)).toBe(input);
  });

  it("does not treat a log level as a JSON array", () => {
    expect(bestEffortFormat("[INFO] started")).toBe("[INFO] started");
  });

  it("uses the fallback result for invalid complete input", () => {
    expect(formatJsonInput("INFO {value:1}")).toEqual({
      kind: "fallback",
      formatted: "INFO {\n  value: 1\n}",
    });
  });
});
