import { describe, expect, it, vi } from "vitest";

import { fetchRandomFact } from "./fetch-random-fact";

describe("random-fact service", () => {
  it("fetches and normalizes the selected source", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      expect(url).toContain("history.muffinlabs.com/date/05/28");

      return {
        json: async () => ({
          data: {
            Events: [
              {
                links: [{ link: "https://example.com/story" }],
                text: "A history event.",
                year: "1900",
              },
            ],
          },
        }),
        ok: true,
      };
    });

    await expect(
      fetchRandomFact({
        date: new Date("2026-05-28T00:00:00.000Z"),
        fetchImpl,
        random: () => 0.999,
      }),
    ).resolves.toEqual({
      event: {
        description: "1900",
        itemUrl: "https://example.com/story",
        title: "A history event.",
        year: "1900",
      },
      source: expect.objectContaining({ id: "history-muffinlabs", name: "History Muffin Labs" }),
    });
  });

  it("falls back to the next source when a source has no items", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes("history.muffinlabs.com")) {
        return {
          json: async () => ({ data: { Events: [] } }),
          ok: true,
        };
      }

      return {
        json: async () => ({
          events: [
            {
              pages: [{ content_urls: { desktop: { page: "https://example.com/wiki" } } }],
              text: "A fallback event.",
              year: "1950",
            },
          ],
        }),
        ok: true,
      };
    });

    await expect(
      fetchRandomFact({
        date: new Date("2026-05-28T00:00:00.000Z"),
        fetchImpl,
        random: () => 0.999,
      }),
    ).resolves.toEqual({
      event: {
        description: "1950",
        itemUrl: "https://example.com/wiki",
        title: "A fallback event.",
        year: "1950",
      },
      source: expect.objectContaining({ id: "wikifeeds", name: "Wikifeeds" }),
    });
  });

  it("returns a generic error when all sources fail", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    });

    await expect(
      fetchRandomFact({
        fetchImpl,
        random: () => 0,
      }),
    ).rejects.toThrow("Unable to load a random fact.");
  });
});
