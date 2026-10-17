import { describe, expect, it, vi } from "vitest";
import { ImageCache } from "./image-cache";

describe("ImageCache", () => {
  it("renders once per key and returns the same URI", () => {
    const cache = new ImageCache();
    const render = vi.fn(() => "<svg/>");
    const first = cache.get("a", render);
    expect(cache.get("a", render)).toBe(first);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("drops the least recently used entry beyond the limit", () => {
    const cache = new ImageCache(2);
    const render = vi.fn((key: string) => `<svg id="${key}"/>`);
    cache.get("a", () => render("a"));
    cache.get("b", () => render("b"));
    cache.get("a", () => render("a")); // "a" is now the most recent
    cache.get("c", () => render("c")); // evicts "b"
    expect(cache.size).toBe(2);
    cache.get("a", () => render("a"));
    cache.get("b", () => render("b"));
    expect(render.mock.calls.map(([key]) => key)).toEqual(["a", "b", "c", "b"]);
  });
});
