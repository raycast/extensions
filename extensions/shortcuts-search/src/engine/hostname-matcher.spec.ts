import { matchesHostname } from "./hostname-matcher";

describe("matchesHostname", () => {
  describe("exact matching", () => {
    it("matches identical hostnames", () => {
      expect(matchesHostname("app.fastmail.com", "app.fastmail.com")).toBe(true);
    });

    it("does not match different hostnames", () => {
      expect(matchesHostname("app.fastmail.com", "mail.fastmail.com")).toBe(false);
    });
  });

  describe("wildcard matching", () => {
    it("matches subdomain with wildcard pattern", () => {
      expect(matchesHostname("*.zendesk.com", "company.zendesk.com")).toBe(true);
    });

    it("matches any subdomain", () => {
      expect(matchesHostname("*.zendesk.com", "acme.zendesk.com")).toBe(true);
      expect(matchesHostname("*.zendesk.com", "support.zendesk.com")).toBe(true);
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
