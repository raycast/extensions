import { describe, expect, it } from "vitest";
import { RECENTLY_USED_LIMIT, updateRecentlyUsed } from "../src/recently-used";

const emoji = (symbol: string): string => symbol;

describe("updateRecentlyUsed", () => {
  it("prepends a newly used emoji", () => {
    expect(updateRecentlyUsed([emoji("A"), emoji("B")], emoji("C"))).toEqual([emoji("C"), emoji("A"), emoji("B")]);
  });

  it("moves a reused emoji back to the front", () => {
    expect(updateRecentlyUsed([emoji("A"), emoji("B"), emoji("C")], emoji("C"))).toEqual([
      emoji("C"),
      emoji("A"),
      emoji("B"),
    ]);
  });

  it("does not create duplicates", () => {
    const result = updateRecentlyUsed([emoji("A"), emoji("B"), emoji("A")], emoji("A"));

    expect(result).toEqual([emoji("A"), emoji("B")]);
  });

  it("retains the 25 most recently used unique emojis", () => {
    const existing = Array.from({ length: RECENTLY_USED_LIMIT }, (_, index) => emoji(String(index)));
    const result = updateRecentlyUsed(existing, emoji("new"));

    expect(result).toHaveLength(RECENTLY_USED_LIMIT);
    expect(result[0]).toEqual(emoji("new"));
    expect(result.at(-1)).toEqual(emoji(String(RECENTLY_USED_LIMIT - 2)));
  });
});
