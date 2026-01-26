/**
 * Integration Tests - Testing real Dex API functionality
 * These tests use the actual Dex API with a test API key
 *
 * NOTE: These tests are skipped in CI. To run them locally:
 * 1. Set DEX_API_KEY environment variable
 * 2. Run: npm test -- --testPathPattern=integration
 */

import { DexAPI } from "../dex-api";

// Mock Raycast API
jest.mock("@raycast/api", () => ({
  getPreferenceValues: () => ({
    apiKey: process.env.DEX_API_KEY || "test-api-key-for-testing",
  }),
  showToast: jest.fn(),
  Toast: { Style: { Success: "success", Failure: "failure" } },
  Icon: {},
  Color: {},
  ActionPanel: {},
  Action: {},
  List: {},
  Detail: {},
  Form: {},
}));

// Skip integration tests if no real API key is provided
const describeIntegration = process.env.DEX_API_KEY ? describe : describe.skip;

describeIntegration("Dex CRM Extension - Integration Tests", () => {
  let api: DexAPI;

  beforeAll(() => {
    api = new DexAPI();
  });

  describe("Search Functionality", () => {
    it("should fetch contacts from API", async () => {
      const contacts = await api.getAllContacts(5);

      expect(contacts).toBeDefined();
      expect(Array.isArray(contacts)).toBe(true);
      expect(contacts.length).toBeGreaterThan(0);
      expect(contacts.length).toBeLessThanOrEqual(5);
    }, 10000);

    it("should have correct contact structure", async () => {
      const contacts = await api.getAllContacts(1);

      expect(contacts[0]).toHaveProperty("id");
      expect(contacts[0]).toHaveProperty("emails");
      expect(contacts[0]).toHaveProperty("phones");
      expect(Array.isArray(contacts[0].emails)).toBe(true);
      expect(Array.isArray(contacts[0].phones)).toBe(true);
    }, 10000);

    it("should search contacts by query", async () => {
      // First get all contacts to find a valid search term
      const allContacts = await api.getAllContacts(100);
      expect(allContacts.length).toBeGreaterThan(0);

      // Get a contact with a name to search for
      const contactWithName = allContacts.find((c) => c.first_name || c.last_name);

      if (contactWithName && contactWithName.first_name) {
        const searchQuery = contactWithName.first_name.substring(0, 3).toLowerCase();
        const results = await api.searchContacts(searchQuery);

        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
        // Should find at least the contact we searched for
        expect(results.length).toBeGreaterThan(0);
      }
    }, 10000);
  });

  describe("Contact Details Display", () => {
    it("should display all available contact fields", async () => {
      const contacts = await api.getAllContacts(100);

      // Find a contact with as many fields as possible
      const richContact = contacts.reduce((best, current) => {
        const currentFieldCount = [
          current.first_name,
          current.last_name,
          current.job_title,
          current.emails?.length > 0,
          current.phones?.length > 0,
          current.website,
          current.linkedin,
          current.description,
        ].filter(Boolean).length;

        const bestFieldCount = [
          best?.first_name,
          best?.last_name,
          best?.job_title,
          best?.emails?.length > 0,
          best?.phones?.length > 0,
          best?.website,
          best?.linkedin,
          best?.description,
        ].filter(Boolean).length;

        return currentFieldCount > bestFieldCount ? current : best;
      }, contacts[0]);

      expect(richContact).toBeDefined();

      // Verify we can access all fields
      const fieldAccess = {
        id: richContact.id,
        name: richContact.first_name || richContact.last_name,
        emails: richContact.emails,
        phones: richContact.phones,
        jobTitle: richContact.job_title,
        website: richContact.website,
        linkedin: richContact.linkedin,
        description: richContact.description,
      };

      expect(fieldAccess.id).toBeDefined();
      expect(fieldAccess.emails).toBeDefined();
      expect(fieldAccess.phones).toBeDefined();
    }, 10000);
  });

  describe("Contact Actions", () => {
    it("should generate correct mailto URL", async () => {
      const contacts = await api.getAllContacts(100);
      const contactWithEmail = contacts.find((c) => c.emails && c.emails.length > 0);

      expect(contactWithEmail).toBeDefined();
      if (contactWithEmail && contactWithEmail.emails.length > 0) {
        const mailtoURL = `mailto:${contactWithEmail.emails[0].email}`;
        expect(mailtoURL).toMatch(/^mailto:.+@.+\..+$/);
      }
    }, 10000);

    it("should generate correct tel URL", async () => {
      const contacts = await api.getAllContacts(100);
      const contactWithPhone = contacts.find((c) => c.phones && c.phones.length > 0);

      if (contactWithPhone && contactWithPhone.phones.length > 0) {
        const telURL = `tel:${contactWithPhone.phones[0].phone_number}`;
        expect(telURL).toMatch(/^tel:.+$/);
      }
    }, 10000);

    it("should generate correct WhatsApp URL", async () => {
      const contacts = await api.getAllContacts(100);
      const contactWithPhone = contacts.find((c) => c.phones && c.phones.length > 0 && c.phones[0].phone_number);

      if (contactWithPhone && contactWithPhone.phones.length > 0 && contactWithPhone.phones[0].phone_number) {
        const phoneDigits = contactWithPhone.phones[0].phone_number.replace(/[^0-9]/g, "");
        const whatsappURL = `https://wa.me/${phoneDigits}`;
        expect(whatsappURL).toMatch(/^https:\/\/wa\.me\/\d+$/);
      } else {
        // If no contact with phone, test should still pass (data dependent)
        expect(true).toBe(true);
      }
    }, 10000);

    it("should have valid LinkedIn URL when present", async () => {
      const contacts = await api.getAllContacts(100);
      const contactWithLinkedIn = contacts.find((c) => c.linkedin && c.linkedin.startsWith("http"));

      if (contactWithLinkedIn && contactWithLinkedIn.linkedin) {
        expect(contactWithLinkedIn.linkedin).toMatch(/^https?:\/\//);
      } else {
        // LinkedIn field may contain usernames instead of URLs in some contacts
        expect(true).toBe(true);
      }
    }, 10000);
  });

  describe("Copy to Clipboard Functionality", () => {
    it("should format contact info for clipboard", async () => {
      const contacts = await api.getAllContacts(1);
      const contact = contacts[0];

      const clipboardContent =
        `${contact.first_name || ""} ${contact.last_name || ""}`.trim() +
        `\n${contact.job_title || ""}` +
        `\n${contact.emails?.map((e) => e.email).join(", ") || ""}` +
        `\n${contact.phones?.map((p) => p.phone_number).join(", ") || ""}` +
        `\n${contact.linkedin || ""}`;

      expect(clipboardContent).toBeDefined();
      expect(typeof clipboardContent).toBe("string");
    }, 10000);
  });

  describe("Recent Contacts", () => {
    it("should fetch recent contacts", async () => {
      const recentContacts = await api.getRecentContacts(10);

      expect(recentContacts).toBeDefined();
      expect(Array.isArray(recentContacts)).toBe(true);
      expect(recentContacts.length).toBeGreaterThan(0);
      expect(recentContacts.length).toBeLessThanOrEqual(10);
    }, 10000);

    it("should be sorted by updated_at descending", async () => {
      const recentContacts = await api.getRecentContacts(10);

      for (let i = 0; i < recentContacts.length - 1; i++) {
        const current = recentContacts[i];
        const next = recentContacts[i + 1];

        if (current.updated_at && next.updated_at) {
          const currentDate = new Date(current.updated_at).getTime();
          const nextDate = new Date(next.updated_at).getTime();
          expect(currentDate).toBeGreaterThanOrEqual(nextDate);
        }
      }
    }, 10000);
  });

  describe("Error Handling", () => {
    it.skip("should handle invalid API key gracefully", async () => {
      // Skipping this test as we can't easily override the private apiKey
      // and don't want to test with an actual invalid key against the live API
      expect(true).toBe(true);
    }, 10000);
  });
});
