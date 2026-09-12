import { describe, expect, it } from "vitest";
import { getSitemapEntryAccessories, getSitemapEntryTitle } from "../src/sitemap-view";

describe("sitemap entry presentation", () => {
  it("uses the final path segment as the title", () => {
    expect(getSitemapEntryTitle("https://example.com/articles/hello-world/?draft=true")).toBe("hello-world");
    expect(getSitemapEntryTitle("https://example.com/")).toBe("https://example.com/");
  });

  it("shows only valid metadata", () => {
    expect(
      getSitemapEntryAccessories({
        url: "https://example.com/article",
        lastModified: "2024-04-03T12:00:00Z",
        changeFrequency: "daily",
        priority: "0.8",
      }),
    ).toEqual([{ text: "2024-04-03" }, { text: "daily" }, { text: "0.8" }]);

    expect(
      getSitemapEntryAccessories({
        url: "https://example.com/article",
        lastModified: undefined,
        changeFrequency: undefined,
        priority: undefined,
      }),
    ).toEqual([]);
  });
});
