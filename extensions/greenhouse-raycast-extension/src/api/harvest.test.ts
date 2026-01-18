import { describe, expect, it } from "vitest";
import { HarvestClient } from "./harvest";

describe("HarvestClient.parseNextLink", () => {
  const client = new HarvestClient({ apiKey: "test-key" });

  it("returns null when header is missing", () => {
    expect(client.parseNextLink(undefined)).toBeNull();
    expect(client.parseNextLink(null)).toBeNull();
  });

  it("returns next link when present", () => {
    const header =
      '<https://harvest.greenhouse.io/v1/jobs?page=2>; rel="next", <https://harvest.greenhouse.io/v1/jobs?page=5>; rel="last"';
    expect(client.parseNextLink(header)).toBe(
      "https://harvest.greenhouse.io/v1/jobs?page=2",
    );
  });

  it("returns null when next link is absent", () => {
    const header =
      '<https://harvest.greenhouse.io/v1/jobs?page=1>; rel="prev", <https://harvest.greenhouse.io/v1/jobs?page=3>; rel="last"';
    expect(client.parseNextLink(header)).toBeNull();
  });
});

describe("HarvestClient baseUrl handling", () => {
  it("falls back to the default base URL when baseUrl is empty", () => {
    const client = new HarvestClient({ apiKey: "test-key", baseUrl: "" });
    expect(client.buildUrl("/jobs")).toBe(
      "https://harvest.greenhouse.io/v1/jobs",
    );
  });

  it("falls back to the default base URL when baseUrl is whitespace", () => {
    const client = new HarvestClient({ apiKey: "test-key", baseUrl: "  " });
    expect(client.buildUrl("jobs")).toBe(
      "https://harvest.greenhouse.io/v1/jobs",
    );
  });
});
