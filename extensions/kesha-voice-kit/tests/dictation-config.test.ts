import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAX_SECONDS,
  MAX_ALLOWED_SECONDS,
  parseMaxSeconds,
} from "../src/lib/dictation-config";

describe("parseMaxSeconds", () => {
  it("uses the default when preference is blank", () => {
    expect(parseMaxSeconds(undefined)).toBe(DEFAULT_MAX_SECONDS);
    expect(parseMaxSeconds("   ")).toBe(DEFAULT_MAX_SECONDS);
  });

  it("accepts an integer inside the allowed range", () => {
    expect(parseMaxSeconds("1")).toBe(1);
    expect(parseMaxSeconds("120")).toBe(120);
    expect(parseMaxSeconds(String(MAX_ALLOWED_SECONDS))).toBe(
      MAX_ALLOWED_SECONDS,
    );
  });

  it("rejects invalid values before starting recording", () => {
    for (const value of [
      "0",
      "-1",
      "1.5",
      "abc",
      String(MAX_ALLOWED_SECONDS + 1),
    ]) {
      expect(() => parseMaxSeconds(value)).toThrow(
        `Max recording seconds must be an integer between 1 and ${MAX_ALLOWED_SECONDS}.`,
      );
    }
  });
});
