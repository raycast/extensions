import { describe, expect, it } from "vitest";
import { addRoots, mergeRoots, normalizeRoots, removeRoot } from "../../src/preferences/roots";

const home = "/Users/tester";

describe("normalizeRoots", () => {
  it("expands ~, trims, and drops blanks", () => {
    expect(normalizeRoots([" ~/code ", "", "  ", "~/work"], home)).toEqual([
      "/Users/tester/code",
      "/Users/tester/work",
    ]);
  });

  it("de-duplicates while preserving first-seen order", () => {
    expect(normalizeRoots(["~/a", "~/b", "~/a"], home)).toEqual([
      "/Users/tester/a",
      "/Users/tester/b",
    ]);
  });

  it("treats ~ and its expansion as the same entry", () => {
    expect(normalizeRoots(["~/code", "/Users/tester/code"], home)).toEqual(["/Users/tester/code"]);
  });
});

describe("addRoots", () => {
  it("appends new folders without duplicating existing ones", () => {
    const existing = ["/Users/tester/code"];
    expect(addRoots(existing, ["~/work", "~/code"], home)).toEqual([
      "/Users/tester/code",
      "/Users/tester/work",
    ]);
  });

  it("adds multiple folders at once", () => {
    expect(addRoots([], ["~/a", "~/b"], home)).toEqual(["/Users/tester/a", "/Users/tester/b"]);
  });
});

describe("removeRoot", () => {
  it("removes a folder by its expanded path", () => {
    const existing = ["/Users/tester/code", "/Users/tester/work"];
    expect(removeRoot(existing, "~/code", home)).toEqual(["/Users/tester/work"]);
  });

  it("is a no-op when the folder is absent", () => {
    const existing = ["/Users/tester/code"];
    expect(removeRoot(existing, "~/missing", home)).toEqual(["/Users/tester/code"]);
  });
});

describe("mergeRoots", () => {
  it("unions two sources with primary entries first, de-duplicated", () => {
    expect(mergeRoots(["/a", "/b"], ["/b", "/c"])).toEqual(["/a", "/b", "/c"]);
  });

  it("returns an empty array when both are empty", () => {
    expect(mergeRoots([], [])).toEqual([]);
  });
});
