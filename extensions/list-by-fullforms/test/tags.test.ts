import { describe, it, expect } from "vitest";
import { parseTagNames, tagsFieldInfo } from "../src/lib/tags";

describe("parseTagNames", () => {
  it("splits on commas and trims each name", () => {
    expect(parseTagNames("biology, physics ,math")).toEqual([
      "biology",
      "physics",
      "math",
    ]);
  });

  it("drops empty segments", () => {
    expect(parseTagNames("foo, , bar,,")).toEqual(["foo", "bar"]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseTagNames("")).toEqual([]);
  });

  it("tolerates null / undefined", () => {
    expect(parseTagNames(null)).toEqual([]);
    expect(parseTagNames(undefined)).toEqual([]);
  });
});

describe("tagsFieldInfo", () => {
  it("lists existing tag names when the list has tags", () => {
    const info = tagsFieldInfo([
      { id: 1, name: "biology" },
      { id: 2, name: "physics" },
    ]);
    expect(info).toContain("biology, physics");
  });

  it("returns the generic copy when there are no tags", () => {
    expect(tagsFieldInfo([])).toBe(
      "Comma-separated tag names. Any new names are created on this list.",
    );
  });

  it("tolerates undefined (cross-deploy cache window)", () => {
    expect(tagsFieldInfo(undefined)).toContain("Comma-separated");
  });
});
