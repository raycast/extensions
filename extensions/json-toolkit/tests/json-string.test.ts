import { describe, expect, it } from "vitest";

import { formatJsonInput } from "../src/lib/format-json";
import {
  InvalidJsonStringError,
  escapeJsonString,
  unescapeJsonString,
} from "../src/lib/json-string";

describe("JSON string escaping", () => {
  it("escapes the entire input as one JSON string", () => {
    expect(escapeJsonString('{"name":"Alice"}')).toBe(
      '"{\\"name\\":\\"Alice\\"}"',
    );
  });

  it("escapes control characters", () => {
    expect(escapeJsonString('line 1\n\t"line 2"\\')).toBe(
      '"line 1\\n\\t\\"line 2\\"\\\\"',
    );
  });
});

describe("JSON string unescaping", () => {
  it("decodes exactly one layer", () => {
    expect(unescapeJsonString('"{\\"name\\":\\"Alice\\"}"')).toBe(
      '{"name":"Alice"}',
    );
  });

  it("does not automatically decode a second layer", () => {
    const twiceEncoded = JSON.stringify(JSON.stringify({ name: "Alice" }));
    expect(unescapeJsonString(twiceEncoded)).toBe(
      JSON.stringify({ name: "Alice" }),
    );
  });

  it("can send the unescaped text through the format pipeline", () => {
    const unescaped = unescapeJsonString('"{\\"name\\":\\"Alice\\"}"');
    expect(formatJsonInput(unescaped)).toEqual({
      kind: "valid",
      minified: '{"name":"Alice"}',
      pretty: '{\n  "name": "Alice"\n}',
    });
  });

  it("rejects valid non-string JSON", () => {
    expect(() => unescapeJsonString('{"name":"Alice"}')).toThrow(
      InvalidJsonStringError,
    );
  });

  it("rejects invalid JSON string syntax", () => {
    expect(() => unescapeJsonString('"unfinished')).toThrow(
      "Input must be a valid JSON string literal.",
    );
  });
});
