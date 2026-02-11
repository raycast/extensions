import { describe, expect, it } from "vitest";
import { applyPrefixPreference, replacePrefix } from "../lib/prefix";

describe("replacePrefix", () => {
  it("replaces numpy. with np.", () => {
    expect(replacePrefix("numpy.array")).toBe("np.array");
    expect(replacePrefix("numpy.linspace")).toBe("np.linspace");
    expect(replacePrefix("numpy.ndarray.any")).toBe("np.ndarray.any");
  });

  it("handles multiple occurrences", () => {
    expect(replacePrefix("numpy.array and numpy.linspace")).toBe("np.array and np.linspace");
  });

  it("only replaces word boundaries", () => {
    expect(replacePrefix("mynumpy.array")).toBe("mynumpy.array");
    expect(replacePrefix("numpy.array")).toBe("np.array");
  });

  it("handles text without numpy. prefix", () => {
    expect(replacePrefix("array")).toBe("array");
    expect(replacePrefix("some text")).toBe("some text");
  });

  it("handles function signatures", () => {
    expect(replacePrefix("numpy.linspace(start, stop, num=50)")).toBe("np.linspace(start, stop, num=50)");
  });
});

describe("applyPrefixPreference", () => {
  it("applies prefix replacement when useShortPrefix is true", () => {
    expect(applyPrefixPreference("numpy.array", true)).toBe("np.array");
    expect(applyPrefixPreference("numpy.linspace", true)).toBe("np.linspace");
  });

  it("does not apply prefix replacement when useShortPrefix is false", () => {
    expect(applyPrefixPreference("numpy.array", false)).toBe("numpy.array");
    expect(applyPrefixPreference("numpy.linspace", false)).toBe("numpy.linspace");
  });

  it("handles text without numpy. prefix", () => {
    expect(applyPrefixPreference("array", true)).toBe("array");
    expect(applyPrefixPreference("array", false)).toBe("array");
  });
});
