import { describe, expect, it } from "vitest";
import { isLikelyUrl, normalizeUrl, resolveInput } from "../src/lib/url";

describe("URL and query resolution", () => {
  it.each(["https://raycast.com", "raycast.com", "localhost:3000", "custom://path"])(
    "recognizes %s as a URL",
    (value) => expect(isLikelyUrl(value)).toBe(true),
  );

  it.each(["project proposal", "raycast docs"])('recognizes "%s" as a search query', (value) =>
    expect(isLikelyUrl(value)).toBe(false),
  );

  it("normalizes a bare domain", () => {
    expect(normalizeUrl("raycast.com/path")).toBe("https://raycast.com/path");
  });

  it("encodes Unicode, quotes, backslashes, and newlines in a query", () => {
    expect(resolveInput('café "notes" \\ next\nline', "duckduckgo")).toBe(
      "https://duckduckgo.com/?q=caf%C3%A9%20%22notes%22%20%5C%20next%0Aline",
    );
  });
});
