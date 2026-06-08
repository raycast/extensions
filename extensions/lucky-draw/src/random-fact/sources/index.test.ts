import { describe, expect, it } from "vitest";

import {
  HISTORY_MUFFINLABS_SOURCE,
  RANDOM_FACT_SOURCES,
  USELESS_FACTS_SOURCE,
  WIKIFEEDS_SOURCE,
  pickRandomFactSource,
} from ".";

describe("random-fact sources", () => {
  it("selects sources deterministically", () => {
    expect(pickRandomFactSource(() => 0)).toBe(USELESS_FACTS_SOURCE);
    expect(pickRandomFactSource(() => 0.999)).toBe(HISTORY_MUFFINLABS_SOURCE);
    expect(RANDOM_FACT_SOURCES).toEqual([USELESS_FACTS_SOURCE, WIKIFEEDS_SOURCE, HISTORY_MUFFINLABS_SOURCE]);
  });

  it("normalizes fact payloads", () => {
    expect(USELESS_FACTS_SOURCE.parse({ permalink: "https://example.com/fact", text: "A fact." })[0]).toEqual({
      description: "Random fact",
      itemUrl: "https://example.com/fact",
      title: "A fact.",
    });
  });

  it("normalizes quote and history feeds", () => {
    expect(
      WIKIFEEDS_SOURCE.parse({
        events: [
          {
            pages: [{ content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Example" } } }],
            text: "A Wikipedia event.",
            year: "1999",
          },
        ],
      }),
    ).toEqual([
      {
        description: "1999",
        itemUrl: "https://en.wikipedia.org/wiki/Example",
        title: "A Wikipedia event.",
        year: "1999",
      },
    ]);

    expect(
      HISTORY_MUFFINLABS_SOURCE.parse({
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
    ).toEqual([
      {
        description: "1900",
        itemUrl: "https://example.com/story",
        title: "A history event.",
        year: "1900",
      },
    ]);
  });
});
