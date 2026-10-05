import { describe, expect, it } from "vitest";
import { hyphenateGuid } from "./guid";

describe("hyphenateGuid", () => {
  it("formats 32-character GUIDs", () => {
    expect(hyphenateGuid("0123456789abcdef0123456789abcdef")).toBe("01234567-89ab-cdef-0123-456789abcdef");
  });

  it("leaves already formatted or unexpected values unchanged", () => {
    expect(hyphenateGuid("01234567-89ab-cdef-0123-456789abcdef")).toBe("01234567-89ab-cdef-0123-456789abcdef");
    expect(hyphenateGuid("short")).toBe("short");
  });
});
