import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUrlOrCurrentTab, load } = vi.hoisted(() => ({ getUrlOrCurrentTab: vi.fn(), load: vi.fn() }));

vi.mock("../src/get-url-or-current-tab", () => ({ getUrlOrCurrentTab }));
vi.mock("../src/sitemap", () => ({ sitemapLoader: { load } }));

import { searchSitemap } from "../src/search-sitemap-data";

beforeEach(() => {
  getUrlOrCurrentTab.mockReset();
  load.mockReset();
});

describe("searchSitemap", () => {
  it("loads entries for the resolved Website URL", async () => {
    const entries = [{ url: "https://example.com/a" }];
    getUrlOrCurrentTab.mockResolvedValue({ kind: "argument", websiteUrl: "https://example.com/" });
    load.mockResolvedValue(entries);

    await expect(searchSitemap("https://example.com")).resolves.toBe(entries);
    expect(load).toHaveBeenCalledWith("https://example.com/");
  });

  it("surfaces source resolution errors", async () => {
    getUrlOrCurrentTab.mockResolvedValue({ kind: "missing", reason: "Browser extension required." });

    await expect(searchSitemap(undefined)).rejects.toThrow("Browser extension required.");
    expect(load).not.toHaveBeenCalled();
  });
});
