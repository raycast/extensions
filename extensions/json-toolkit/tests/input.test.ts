import { describe, expect, it } from "vitest";

import {
  InputTooLargeError,
  MAX_INPUT_BYTES,
  assertInputWithinLimit,
  getUtf8ByteLength,
  requireNonEmptyText,
} from "../src/lib/input";

describe("input limits", () => {
  it("accepts exactly 5 MB of UTF-8 input", () => {
    expect(() =>
      assertInputWithinLimit("a".repeat(MAX_INPUT_BYTES)),
    ).not.toThrow();
  });

  it("rejects input larger than 5 MB before processing", () => {
    expect(() =>
      assertInputWithinLimit("a".repeat(MAX_INPUT_BYTES + 1)),
    ).toThrow(InputTooLargeError);
  });

  it("measures multibyte text as UTF-8 bytes", () => {
    expect(getUtf8ByteLength("你")).toBe(3);
  });

  it("does not substitute an unavailable explicit source", () => {
    expect(() => requireNonEmptyText(undefined, "Clipboard")).toThrow(
      "Clipboard does not contain text.",
    );
  });
});
