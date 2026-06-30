import { describe, expect, it } from "vitest";
import { parseRetryAfterSeconds } from "../lib/rate-limit";

describe("parseRetryAfterSeconds", () => {
  it("parses numeric retry-after values", () => {
    expect(parseRetryAfterSeconds("12")).toBe(12);
  });

  it("returns undefined for invalid values", () => {
    expect(parseRetryAfterSeconds("nope")).toBeUndefined();
  });
});
