import { describe, expect, it } from "vitest";
import { periodWindow, postKeywords, postTitle, postsInWindow } from "./format";

describe("postTitle", () => {
  it("uses the first non-empty line", () => {
    expect(postTitle("\n\n  Hello world  \nsecond line")).toBe("Hello world");
  });

  it("falls back for an empty post and truncates long lines", () => {
    expect(postTitle("   ")).toBe("(No text)");
    const long = "x".repeat(200);
    expect(postTitle(long)).toHaveLength(80);
    expect(postTitle(long).endsWith("…")).toBe(true);
  });

  it("takes a tighter cap and its own fallback, for the menu bar", () => {
    expect(postTitle("x".repeat(50), { maxChars: 20 })).toBe(`${"x".repeat(19)}…`);
    expect(postTitle("  ", { fallback: "No posts yet" })).toBe("No posts yet");
    // A line already within the cap is left exactly as it is.
    expect(postTitle("short", { maxChars: 20 })).toBe("short");
  });

  it("never splits an emoji when truncating", () => {
    // 18 letters put the 19th visible character, a two-unit emoji, across the old cut.
    expect(postTitle(`${"x".repeat(18)}😀😀😀`, { maxChars: 20 })).toBe(`${"x".repeat(18)}😀…`);
    // Fits in characters even though it is longer in UTF-16 units: left alone.
    expect(postTitle("😀".repeat(20), { maxChars: 20 })).toBe("😀".repeat(20));
  });
});

describe("postKeywords", () => {
  it("splits on whitespace, drops blanks, and caps the list", () => {
    expect(postKeywords("  hello   world\nagain ")).toEqual(["hello", "world", "again"]);
    expect(postKeywords(Array.from({ length: 200 }, (_, i) => `w${i}`).join(" "))).toHaveLength(50);
  });
});

describe("postsInWindow", () => {
  const since = new Date("2026-09-20T00:00:00Z");
  /** Newest first, as `getPosts` returns them. */
  const loaded = ["2026-09-26", "2026-09-22", "2026-09-10", "2026-09-01"].map((day, i) => ({
    id: i,
    post: { timestamp: `${day}T12:00:00+0000` },
  }));

  it("keeps only the posts inside the window", () => {
    expect(postsInWindow(loaded, false, since).posts.map((item) => item.id)).toEqual([0, 1]);
  });

  it("calls the window complete once the loaded posts reach back past it, even if older ones exist", () => {
    expect(postsInWindow(loaded, true, since).truncated).toBe(false);
  });

  it("calls the window incomplete when the post cap was hit inside it", () => {
    // All loaded posts are inside the window and more exist: the window may hold more.
    const insideOnly = loaded.slice(0, 2);
    expect(postsInWindow(insideOnly, true, since)).toMatchObject({ posts: insideOnly, truncated: true });
  });

  it("is never incomplete when nothing was cut off", () => {
    expect(postsInWindow(loaded.slice(0, 2), false, since).truncated).toBe(false);
    expect(postsInWindow([], false, since)).toEqual({ posts: [], truncated: false });
  });
});

describe("periodWindow", () => {
  it("spans the requested number of days back from now", () => {
    const { since, until } = periodWindow(7);
    expect(Math.round((until.getTime() - since.getTime()) / 86_400_000)).toBe(7);
    expect(until.getTime()).toBeLessThanOrEqual(Date.now());
  });
});
