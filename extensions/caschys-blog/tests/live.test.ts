import { describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  getPreferenceValues: vi.fn(),
  LocalStorage: { getItem: vi.fn(), setItem: vi.fn() },
  showToast: vi.fn(),
  Toast: { Style: { Failure: "failure" } },
}));

import { fetchData, parseRssFeed, searchArticleFeed } from "../src/utils";

describe("Caschys Blog live feed", () => {
  it("loads and parses current articles", async () => {
    const articles = await parseRssFeed(await fetchData("feed=rss2&paged=1"));
    expect(articles.length).toBeGreaterThan(0);
    expect(articles[0]?.title).toBeTruthy();
    expect(articles[0]?.link).toMatch(/^https:\/\/stadt-bremerhaven\.de\//);

    const articleResponse = await fetch(articles[0]!.link);
    expect(articleResponse.ok).toBe(true);
    expect(articleResponse.headers.get("content-type")).toContain("text/html");
  }, 20_000);

  it("searches the public WordPress feed", async () => {
    const articles = await searchArticleFeed("iPhone", 5);
    expect(articles.length).toBeGreaterThan(0);
    expect(articles.length).toBeLessThanOrEqual(5);
  }, 20_000);

  it("opens the homepage and privacy policy", async () => {
    const responses = await Promise.all([
      fetch("https://www.stadt-bremerhaven.de"),
      fetch("https://stadt-bremerhaven.de/datenschutzerklaerung/"),
    ]);
    expect(responses.every((response) => response.ok)).toBe(true);
  }, 20_000);
});
