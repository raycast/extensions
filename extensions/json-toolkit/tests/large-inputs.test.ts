import { describe, expect, it } from "vitest";

import { formatJsonInput } from "../src/lib/format-json";
import { MAX_INPUT_BYTES, getUtf8ByteLength } from "../src/lib/input";
import { buildCodeBlock } from "../src/lib/markdown";
import {
  createCompactJsonFixture,
  createInvalidLogFixture,
  createNestedJsonFixture,
} from "./fixtures/large-inputs";

describe("5 MB fixtures", () => {
  it.each([
    ["compact", createCompactJsonFixture],
    ["nested", createNestedJsonFixture],
  ])("formats and renders the complete %s fixture", (_name, createFixture) => {
    const input = createFixture();
    expect(getUtf8ByteLength(input)).toBe(MAX_INPUT_BYTES);

    const result = formatJsonInput(input);
    expect(result.kind).toBe("valid");
    if (result.kind === "valid") {
      expect(result.minified).toBe(input);
      expect(buildCodeBlock(result.pretty, "json")).toContain(result.pretty);
    }
  });

  it("formats and renders the complete invalid fixture", () => {
    const input = createInvalidLogFixture();
    expect(getUtf8ByteLength(input)).toBe(MAX_INPUT_BYTES);

    const result = formatJsonInput(input);
    expect(result.kind).toBe("fallback");
    if (result.kind === "fallback") {
      expect(result.formatted).toContain("user: 'alice'");
      expect(buildCodeBlock(result.formatted, "text")).toContain(
        result.formatted,
      );
    }
  });

  it("rejects an oversized fixture", () => {
    const input = createCompactJsonFixture(MAX_INPUT_BYTES + 1);
    expect(() => formatJsonInput(input)).toThrow(
      "Input is larger than the 5 MB limit.",
    );
  });
});
