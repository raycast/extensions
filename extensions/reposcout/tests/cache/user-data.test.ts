import { describe, expect, it } from "vitest";
import { defaultUserData, getUserData, recordOpen, toggleFavorite, togglePin } from "../../src/cache/user-data";

describe("user-data transforms", () => {
  it("provides sensible defaults", () => {
    expect(defaultUserData()).toEqual({
      pinned: false,
      favorite: false,
      lastOpenedAt: null,
      openCount: 0,
    });
  });

  it("getUserData falls back to defaults for unknown paths", () => {
    const map = new Map([["/a", { ...defaultUserData(), favorite: true }]]);
    expect(getUserData(map, "/a").favorite).toBe(true);
    expect(getUserData(map, "/missing")).toEqual(defaultUserData());
  });

  it("recordOpen increments count and sets timestamp immutably", () => {
    const base = defaultUserData();
    const opened = recordOpen(base, 1000);
    expect(opened).toEqual({ pinned: false, favorite: false, lastOpenedAt: 1000, openCount: 1 });
    // Original is unchanged.
    expect(base.openCount).toBe(0);
    const again = recordOpen(opened, 2000);
    expect(again.openCount).toBe(2);
    expect(again.lastOpenedAt).toBe(2000);
  });

  it("toggleFavorite and togglePin flip flags immutably", () => {
    const base = defaultUserData();
    expect(toggleFavorite(base).favorite).toBe(true);
    expect(togglePin(base).pinned).toBe(true);
    expect(base.favorite).toBe(false);
    expect(togglePin(togglePin(base)).pinned).toBe(false);
  });
});
