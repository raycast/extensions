import { findHostnameMatch, matchesHostname } from "./hostname-matcher";

describe("matchesHostname", () => {
  describe("exact matching", () => {
    it("matches identical hostnames", () => {
      expect(matchesHostname("app.fastmail.com", "app.fastmail.com")).toBe(true);
    });

    it("does not match different hostnames", () => {
      expect(matchesHostname("app.fastmail.com", "mail.fastmail.com")).toBe(false);
    });

    it("matches a catalog domain against the browser's www hostname", () => {
      expect(matchesHostname("github.com", "www.github.com")).toBe(true);
      expect(matchesHostname("www.github.com", "www.github.com")).toBe(true);
      expect(matchesHostname("github.com", "www.github.com.evil.example")).toBe(false);
      expect(matchesHostname("github.com", "other.github.com")).toBe(false);
    });
  });

  describe("wildcard matching", () => {
    it("matches subdomain with wildcard pattern", () => {
      expect(matchesHostname("*.zendesk.com", "company.zendesk.com")).toBe(true);
    });

    it("matches any subdomain", () => {
      expect(matchesHostname("*.zendesk.com", "acme.zendesk.com")).toBe(true);
      expect(matchesHostname("*.zendesk.com", "support.zendesk.com")).toBe(true);
      expect(matchesHostname("*.zendesk.com", "www.zendesk.com")).toBe(true);
    });

    it("does not match bare domain without subdomain", () => {
      expect(matchesHostname("*.zendesk.com", "zendesk.com")).toBe(false);
    });

    it("does not match unrelated domains", () => {
      expect(matchesHostname("*.zendesk.com", "zendesk.org")).toBe(false);
      expect(matchesHostname("*.zendesk.com", "notzendesk.com")).toBe(false);
    });

    it("does not match partial suffix", () => {
      expect(matchesHostname("*.zendesk.com", "fakezendesk.com")).toBe(false);
    });
  });
});

describe("findHostnameMatch", () => {
  const catalog = { slug: "public", hostname: "example.com" };
  const custom = { slug: "custom", hostname: "www.example.com" };
  const wildcard = { slug: "wildcard", hostname: "*.example.com" };

  it.each([
    [catalog, custom],
    [wildcard, catalog, custom],
    [custom, catalog],
  ])("prefers an exact host over aliases and wildcards regardless of catalog order", (...apps) =>
    expect(findHostnameMatch(apps, "www.example.com")).toBe(custom)
  );

  it("retains www fallback, wildcard support, and exact-host isolation", () => {
    expect(findHostnameMatch([catalog], "www.example.com")).toBe(catalog);
    expect(findHostnameMatch([wildcard], "mail.example.com")).toBe(wildcard);
    expect(findHostnameMatch([catalog], "www.example.com.evil.test")).toBeUndefined();
    expect(findHostnameMatch([custom], "example.com")).toBeUndefined();
  });
});
