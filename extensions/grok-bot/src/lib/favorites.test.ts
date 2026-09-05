import { describe, expect, it } from "vitest";
import { parseFavoriteIds, toggleFavoriteId } from "./favorites";
import { parseAgentId } from "./types";

function id(raw: string) {
  const parsed = parseAgentId(raw);
  if (!parsed.ok) {
    throw new Error("invalid test id");
  }
  return parsed.value;
}

describe("parseFavoriteIds", () => {
  it("returns [] for empty or garbage input", () => {
    expect(parseFavoriteIds(undefined)).toEqual([]);
    expect(parseFavoriteIds(null)).toEqual([]);
    expect(parseFavoriteIds("")).toEqual([]);
    expect(parseFavoriteIds("not-json")).toEqual([]);
    expect(parseFavoriteIds({})).toEqual([]);
    expect(parseFavoriteIds([1, true, null])).toEqual([]);
  });

  it("parses a JSON string array and drops invalid ids", () => {
    expect(parseFavoriteIds('["a1","", "  ", "a2"]')).toEqual([id("a1"), id("a2")]);
  });

  it("collapses duplicates while preserving first occurrence order", () => {
    expect(parseFavoriteIds(["a1", "a2", "a1", "a3", "a2"])).toEqual([id("a1"), id("a2"), id("a3")]);
  });
});

describe("toggleFavoriteId", () => {
  it("appends on add and removes on toggle while preserving order", () => {
    const a1 = id("a1");
    const a2 = id("a2");
    const a3 = id("a3");

    expect(toggleFavoriteId([], a1)).toEqual([a1]);
    expect(toggleFavoriteId([a1, a2], a3)).toEqual([a1, a2, a3]);
    expect(toggleFavoriteId([a1, a2, a3], a2)).toEqual([a1, a3]);
  });
});
