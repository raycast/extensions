/**
 * Unit Tests for Utility Functions
 */

import { getContactDisplayName, getContactSubtitle, formatContactDetails, getContactInitials } from "../utils";
import { DexContact } from "../types";

describe("Utility Functions", () => {
  describe("getContactDisplayName", () => {
    it("should return full name when both first and last name exist", () => {
      const contact: DexContact = {
        id: "1",
        first_name: "John",
        last_name: "Doe",
        emails: [],
        phones: [],
      };

      expect(getContactDisplayName(contact)).toBe("John Doe");
    });

    it("should return first name only when last name is missing", () => {
      const contact: DexContact = {
        id: "1",
        first_name: "John",
        last_name: null,
        emails: [],
        phones: [],
      };

      expect(getContactDisplayName(contact)).toBe("John");
    });

    it("should return email when name is missing", () => {
      const contact: DexContact = {
        id: "1",
        first_name: null,
        last_name: null,
        emails: [{ email: "john@example.com" }],
        phones: [],
      };

      expect(getContactDisplayName(contact)).toBe("john@example.com");
    });

    it("should return 'Unnamed Contact' when no name or email", () => {
      const contact: DexContact = {
        id: "1",
        first_name: null,
        last_name: null,
        emails: [],
        phones: [],
      };

      expect(getContactDisplayName(contact)).toBe("Unnamed Contact");
    });
  });

  describe("getContactSubtitle", () => {
    it("should return job title when available", () => {
      const contact: DexContact = {
        id: "1",
        first_name: "John",
        last_name: "Doe",
        job_title: "Software Engineer",
        emails: [],
        phones: [],
      };

      expect(getContactSubtitle(contact)).toBe("Software Engineer");
    });

    it("should return 'No job title' when not available", () => {
      const contact: DexContact = {
        id: "1",
        first_name: "John",
        last_name: "Doe",
        emails: [],
        phones: [],
      };

      expect(getContactSubtitle(contact)).toBe("No job title");
    });
  });

  describe("formatContactDetails", () => {
    it("should format contact with all details", () => {
      const contact: DexContact = {
        id: "1",
        first_name: "John",
        last_name: "Doe",
        job_title: "Software Engineer",
        emails: [{ email: "john@example.com" }],
        phones: [{ phone_number: "+1234567890" }],
        website: "https://example.com",
        linkedin: "https://linkedin.com/in/johndoe",
        description: "Test description",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };

      const formatted = formatContactDetails(contact);

      expect(formatted).toContain("# John Doe");
      expect(formatted).toContain("### Software Engineer");
      expect(formatted).toContain("john@example.com");
      expect(formatted).toContain("+1234567890");
      expect(formatted).toContain("example.com");
      expect(formatted).toContain("@johndoe");
      expect(formatted).toContain("Test description");
      expect(formatted).toContain("📋 Quick Overview");
      expect(formatted).toContain("⏰ Timeline");
    });

    it("should handle minimal contact information", () => {
      const contact: DexContact = {
        id: "1",
        first_name: "John",
        last_name: null,
        emails: [],
        phones: [],
      };

      const formatted = formatContactDetails(contact);

      expect(formatted).toContain("# John");
      expect(formatted).not.toContain("## Email");
      expect(formatted).not.toContain("## Phone");
    });
  });

  describe("getContactInitials", () => {
    it("should return initials from first and last name", () => {
      const contact: DexContact = {
        id: "1",
        first_name: "John",
        last_name: "Doe",
        emails: [],
        phones: [],
      };

      expect(getContactInitials(contact)).toBe("JD");
    });

    it("should return two chars from first name only", () => {
      const contact: DexContact = {
        id: "1",
        first_name: "John",
        last_name: null,
        emails: [],
        phones: [],
      };

      expect(getContactInitials(contact)).toBe("JO");
    });

    it("should return two chars from email when no name", () => {
      const contact: DexContact = {
        id: "1",
        first_name: null,
        last_name: null,
        emails: [{ email: "john@example.com" }],
        phones: [],
      };

      expect(getContactInitials(contact)).toBe("JO");
    });

    it("should return ?? when no information", () => {
      const contact: DexContact = {
        id: "1",
        first_name: null,
        last_name: null,
        emails: [],
        phones: [],
      };

      expect(getContactInitials(contact)).toBe("??");
    });
  });
});
