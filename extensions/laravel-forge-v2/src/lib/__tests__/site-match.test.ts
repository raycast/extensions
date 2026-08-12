import { describe, expect, it } from "vitest";
import { findBestSiteMatch, keywordsByServer } from "../site-match";
import type { ISite } from "../../types";

const site = (name: string, aliases: string[] = []): ISite => ({ id: name, name, aliases } as unknown as ISite);

const siteOn = (serverId: string, name: string, aliases: string[] = []): ISite =>
  ({ id: name, server_id: serverId, name, aliases } as unknown as ISite);

describe("findBestSiteMatch", () => {
  const sites = [site("api.acme.com"), site("app.acme.com", ["www.acme.com"]), site("acme.com")];

  it("prefers an exact name match over a substring match", () => {
    expect(findBestSiteMatch(sites, "acme.com")?.name).toBe("acme.com");
  });

  it("is case-insensitive", () => {
    expect(findBestSiteMatch(sites, "API.ACME.COM")?.name).toBe("api.acme.com");
  });

  it("falls back to a substring match on the name", () => {
    expect(findBestSiteMatch(sites, "app.")?.name).toBe("app.acme.com");
  });

  it("matches on an alias when no name matches", () => {
    expect(findBestSiteMatch(sites, "www.acme.com")?.name).toBe("app.acme.com");
  });

  it("returns undefined for a blank query", () => {
    expect(findBestSiteMatch(sites, "   ")).toBeUndefined();
  });

  it("returns undefined when nothing matches", () => {
    expect(findBestSiteMatch(sites, "nope.example")).toBeUndefined();
  });

  it("prefers an exact name match even when an earlier element only substring-matches", () => {
    const ordered = [site("shop.acme.com"), site("acme.com")];
    expect(findBestSiteMatch(ordered, "acme.com")?.name).toBe("acme.com");
  });
});

describe("keywordsByServer", () => {
  it("groups each server's site names and aliases", () => {
    const result = keywordsByServer([
      siteOn("1", "api.acme.com"),
      siteOn("1", "app.acme.com", ["www.acme.com"]),
      siteOn("2", "other.com"),
    ]);
    expect(result["1"]).toEqual(["api.acme.com", "app.acme.com", "www.acme.com"]);
    expect(result["2"]).toEqual(["other.com"]);
  });

  it("skips sites without a resolved server and dedupes", () => {
    const result = keywordsByServer([siteOn("", "orphan.com"), siteOn("1", "dup.com"), siteOn("1", "dup.com")]);
    expect(Object.keys(result)).toEqual(["1"]);
    expect(result["1"]).toEqual(["dup.com"]);
  });
});
