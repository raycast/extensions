import { describe, it, expect } from "vitest";
import { extractHttp } from "./extractHttp";

describe("extractHttp (EXT-01)", () => {
  it("extracts a single http URL", () => {
    const result = extractHttp("see https://example.com here");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      raw: "https://example.com",
      url: "https://example.com",
      type: "web",
    });
  });

  it("extracts multiple URLs in order", () => {
    const result = extractHttp("a https://a.com b https://b.com");
    expect(result.map((i) => i.url)).toEqual(["https://a.com", "https://b.com"]);
  });

  it("captures correct index", () => {
    const result = extractHttp("xx https://a.com");
    expect(result[0].index).toBe(3);
  });

  it("handles https://", () => {
    const result = extractHttp("https://anthropic.com");
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("web");
  });

  it("returns empty array for no URLs", () => {
    expect(extractHttp("just plain text")).toEqual([]);
  });

  it("trims trailing punctuation per v1.1.0 regex", () => {
    // The v1.1.0 baseline regex strips a single trailing . ) ; : etc
    const result = extractHttp("Visit https://example.com.");
    expect(result[0].url).toBe("https://example.com");
  });
});
