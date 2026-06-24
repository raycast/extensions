import { describe, expect, it } from "vitest";
import { parseSearchQuery } from "./search-query";

describe("parseSearchQuery", () => {
  it("extracts repo filters and derives owner", () => {
    expect(parseSearchQuery("repo:alice/project broken auth")).toEqual({
      owner: "alice",
      repo: "project",
      query: "broken auth",
    });
  });

  it("extracts owner filters", () => {
    expect(parseSearchQuery("owner:alice broken auth")).toEqual({
      owner: "alice",
      repo: undefined,
      query: "broken auth",
    });
  });

  it("prefers owner over repo owner filter", () => {
    expect(parseSearchQuery("owner:bob repo:alice/project broken auth")).toEqual({
      owner: "bob",
      repo: "project",
      query: "broken auth",
    });
  });

  it("omit repo/owner filters without values", () => {
    expect(parseSearchQuery("owner: repo: broken auth")).toEqual({
      owner: undefined,
      repo: undefined,
      query: "broken auth",
    });

    expect(parseSearchQuery("owner: repo:app broken auth")).toEqual({
      owner: undefined,
      repo: "app",
      query: "broken auth",
    });

    expect(parseSearchQuery("owner:alice repo:app broken auth")).toEqual({
      owner: "alice",
      repo: "app",
      query: "broken auth",
    });

    expect(parseSearchQuery("owner:alice repo: broken auth")).toEqual({
      owner: "alice",
      repo: undefined,
      query: "broken auth",
    });

    expect(parseSearchQuery("owner:alice repo:org/app broken auth")).toEqual({
      owner: "alice",
      repo: "app",
      query: "broken auth",
    });
  });
});
