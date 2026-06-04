import { describe, expect, it } from "vitest";
import { checkPrivacy, checkWhoisAvailability, formatDate } from "./whois-domain";

describe("whois-domain helpers", () => {
  describe("formatDate", () => {
    it("formats valid dates correctly", () => {
      expect(formatDate("2026-05-13T12:00:00Z")).toBe("2026-05-13");
      expect(formatDate("2026-05-13")).toBe("2026-05-13");
    });

    it("handles arrays by taking the first element", () => {
      expect(formatDate(["2024-01-01T00:00:00Z", "2024-01-02T00:00:00Z"])).toBe("2024-01-01");
    });

    it("returns null for invalid or missing dates", () => {
      expect(formatDate(null)).toBeNull();
      expect(formatDate(undefined)).toBeNull();
      expect(formatDate("not-a-date")).toBeNull();
      expect(formatDate([])).toBeNull();
    });
  });

  describe("checkPrivacy", () => {
    it("returns true for privacy keywords", () => {
      expect(checkPrivacy("Domains By Proxy, LLC")).toBe(true);
      expect(checkPrivacy("Contact Privacy Inc. Customer 123")).toBe(true);
      expect(checkPrivacy("REDACTED FOR PRIVACY")).toBe(true);
    });

    it("returns false for regular names", () => {
      expect(checkPrivacy("Google LLC")).toBe(false);
      expect(checkPrivacy("John Doe")).toBe(false);
    });

    it("handles null/undefined", () => {
      expect(checkPrivacy(null)).toBe(false);
      expect(checkPrivacy(undefined)).toBe(false);
    });
  });

  describe("checkWhoisAvailability", () => {
    it("returns true if not found keywords exist in text", () => {
      const data = {
        "whois.server": {
          text: ["No match for domain", "Domain not found"],
        },
      };
      expect(checkWhoisAvailability(data)).toBe(true);
    });

    it("returns true if error contains not found keywords", () => {
      const data = {
        "whois.server": {
          error: "object_not_found",
        },
      };
      expect(checkWhoisAvailability(data)).toBe(true);
    });

    it("returns false if domain is registered", () => {
      const data = {
        "whois.server": {
          text: ["Domain Name: raycast.com", "Registry Domain ID: 12345"],
        },
      };
      expect(checkWhoisAvailability(data)).toBe(false);
    });
  });
});
