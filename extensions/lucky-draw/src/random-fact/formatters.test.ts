import { describe, expect, it } from "vitest";

import { formatRandomFactEmptyMarkdown, formatRandomFactErrorMarkdown, formatRandomFactMarkdown } from "./formatters";

describe("random-fact formatters", () => {
  it("builds markdown for content and empty/error states", () => {
    expect(
      formatRandomFactMarkdown(
        { buildUrl: () => "", id: "source", name: "Source", parse: () => [], homepageUrl: "https://example.com" },
        { description: "Some context.", itemUrl: "https://example.com/story", title: "A story", year: "1900" },
      ),
    ).toContain("# A story");

    expect(
      formatRandomFactEmptyMarkdown({ buildUrl: () => "", id: "source", name: "Source", parse: () => [] }),
    ).toContain("did not return any content");

    expect(formatRandomFactErrorMarkdown("Source", "Boom")).toContain("Unable to load Source");
  });
});
