import { describe, expect, it } from "vitest";
import { formatTime, truncate } from "../../src/lib/format";

describe("formatTime", () => {
  it("formats mm:ss", () => expect(formatTime(83)).toBe("1:23"));
  it("pads seconds", () => expect(formatTime(723)).toBe("12:03"));
  it("formats hours", () => expect(formatTime(3723)).toBe("1:02:03"));
  it("handles undefined", () => expect(formatTime(undefined)).toBe("–:––"));
  it("handles negative", () => expect(formatTime(-5)).toBe("–:––"));
});

describe("truncate", () => {
  it("passes short strings", () => expect(truncate("abc", 5)).toBe("abc"));
  it("cuts with ellipsis", () => expect(truncate("abcdefgh", 5)).toBe("abcd…"));
});
