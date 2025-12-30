import { describe, it, expect } from "vitest";
import { getDisplayName, getSubtitle, Contact } from "./contacts-jxa";

// Mock contact factory
function createMockContact(overrides: Partial<Contact> = {}): Contact {
  return {
    identifier: "test-id-123",
    givenName: "",
    familyName: "",
    nickname: "",
    organizationName: "",
    jobTitle: "",
    departmentName: "",
    phoneNumbers: [],
    emailAddresses: [],
    postalAddresses: [],
    urlAddresses: [],
    birthday: null,
    imageDataAvailable: false,
    thumbnailBase64: null,
    ...overrides,
  };
}

describe("getDisplayName", () => {
  it("returns full name when both given and family name exist", () => {
    const contact = createMockContact({
      givenName: "John",
      familyName: "Doe",
    });
    expect(getDisplayName(contact)).toBe("John Doe");
  });

  it("returns given name only when family name is empty", () => {
    const contact = createMockContact({
      givenName: "John",
    });
    expect(getDisplayName(contact)).toBe("John");
  });

  it("returns family name only when given name is empty", () => {
    const contact = createMockContact({
      familyName: "Doe",
    });
    expect(getDisplayName(contact)).toBe("Doe");
  });

  it("returns organization name when no personal name exists", () => {
    const contact = createMockContact({
      organizationName: "Acme Corp",
    });
    expect(getDisplayName(contact)).toBe("Acme Corp");
  });

  it("returns nickname when no name or organization exists", () => {
    const contact = createMockContact({
      nickname: "Johnny",
    });
    expect(getDisplayName(contact)).toBe("Johnny");
  });

  it("returns 'No Name' when nothing is available", () => {
    const contact = createMockContact();
    expect(getDisplayName(contact)).toBe("No Name");
  });

  it("prefers personal name over organization", () => {
    const contact = createMockContact({
      givenName: "John",
      organizationName: "Acme Corp",
    });
    expect(getDisplayName(contact)).toBe("John");
  });
});

describe("getSubtitle", () => {
  it("returns organization name when available", () => {
    const contact = createMockContact({
      organizationName: "Acme Corp",
      emailAddresses: [{ label: "work", value: "john@acme.com" }],
    });
    expect(getSubtitle(contact)).toBe("Acme Corp");
  });

  it("returns email when no organization exists", () => {
    const contact = createMockContact({
      emailAddresses: [{ label: "work", value: "john@example.com" }],
    });
    expect(getSubtitle(contact)).toBe("john@example.com");
  });

  it("returns phone when no organization or email exists", () => {
    const contact = createMockContact({
      phoneNumbers: [{ label: "mobile", value: "+1234567890" }],
    });
    expect(getSubtitle(contact)).toBe("+1234567890");
  });

  it("returns empty string when nothing is available", () => {
    const contact = createMockContact();
    expect(getSubtitle(contact)).toBe("");
  });

  it("returns first email when multiple exist", () => {
    const contact = createMockContact({
      emailAddresses: [
        { label: "work", value: "work@example.com" },
        { label: "home", value: "home@example.com" },
      ],
    });
    expect(getSubtitle(contact)).toBe("work@example.com");
  });
});

describe("Contact interface", () => {
  it("has all required fields", () => {
    const contact = createMockContact({
      identifier: "abc-123",
      givenName: "Jane",
      familyName: "Smith",
      nickname: "Janie",
      organizationName: "Tech Inc",
      jobTitle: "Engineer",
      departmentName: "R&D",
      phoneNumbers: [{ label: "mobile", value: "+1555123456" }],
      emailAddresses: [{ label: "work", value: "jane@tech.com" }],
      postalAddresses: [
        {
          label: "home",
          street: "123 Main St",
          city: "Springfield",
          state: "IL",
          postalCode: "62701",
          country: "USA",
          isoCountryCode: "US",
        },
      ],
      urlAddresses: [{ label: "website", value: "https://jane.dev" }],
      birthday: "1990-05-15",
      imageDataAvailable: true,
      thumbnailBase64: "base64data",
    });

    expect(contact.identifier).toBe("abc-123");
    expect(contact.givenName).toBe("Jane");
    expect(contact.familyName).toBe("Smith");
    expect(contact.phoneNumbers).toHaveLength(1);
    expect(contact.emailAddresses).toHaveLength(1);
    expect(contact.postalAddresses).toHaveLength(1);
    expect(contact.postalAddresses[0].city).toBe("Springfield");
    expect(contact.urlAddresses).toHaveLength(1);
    expect(contact.birthday).toBe("1990-05-15");
    expect(contact.imageDataAvailable).toBe(true);
  });
});

describe("Complex contact scenarios", () => {
  it("handles contact with multiple phone numbers", () => {
    const contact = createMockContact({
      givenName: "Multi",
      familyName: "Phone",
      phoneNumbers: [
        { label: "mobile", value: "+1111111111" },
        { label: "work", value: "+2222222222" },
        { label: "home", value: "+3333333333" },
        { label: null, value: "+4444444444" },
      ],
    });

    expect(contact.phoneNumbers).toHaveLength(4);
    expect(contact.phoneNumbers[0].value).toBe("+1111111111");
    expect(contact.phoneNumbers[3].label).toBeNull();
    expect(getDisplayName(contact)).toBe("Multi Phone");
    expect(getSubtitle(contact)).toBe("+1111111111");
  });

  it("handles contact with multiple email addresses", () => {
    const contact = createMockContact({
      givenName: "Multi",
      familyName: "Email",
      emailAddresses: [
        { label: "work", value: "work@example.com" },
        { label: "home", value: "home@example.com" },
        { label: "iCloud", value: "icloud@example.com" },
        { label: null, value: "other@example.com" },
      ],
    });

    expect(contact.emailAddresses).toHaveLength(4);
    expect(contact.emailAddresses[0].value).toBe("work@example.com");
    expect(contact.emailAddresses[3].label).toBeNull();
    expect(getSubtitle(contact)).toBe("work@example.com");
  });

  it("handles contact with multiple postal addresses", () => {
    const contact = createMockContact({
      givenName: "Multi",
      familyName: "Address",
      postalAddresses: [
        {
          label: "home",
          street: "123 Home St",
          city: "Hometown",
          state: "HT",
          postalCode: "11111",
          country: "USA",
          isoCountryCode: "US",
        },
        {
          label: "work",
          street: "456 Work Ave",
          city: "Worktown",
          state: "WT",
          postalCode: "22222",
          country: "USA",
          isoCountryCode: "US",
        },
        {
          label: null,
          street: "",
          city: "CityOnly",
          state: "",
          postalCode: "",
          country: "",
          isoCountryCode: "",
        },
      ],
    });

    expect(contact.postalAddresses).toHaveLength(3);
    expect(contact.postalAddresses[0].city).toBe("Hometown");
    expect(contact.postalAddresses[2].street).toBe("");
    expect(contact.postalAddresses[2].city).toBe("CityOnly");
  });

  it("handles contact with everything empty", () => {
    const contact = createMockContact({
      givenName: "",
      familyName: "",
      nickname: "",
      organizationName: "",
      phoneNumbers: [],
      emailAddresses: [],
      postalAddresses: [],
      urlAddresses: [],
    });

    expect(getDisplayName(contact)).toBe("No Name");
    expect(getSubtitle(contact)).toBe("");
    expect(contact.phoneNumbers).toHaveLength(0);
    expect(contact.emailAddresses).toHaveLength(0);
  });

  it("handles contact with only organization (company contact)", () => {
    const contact = createMockContact({
      organizationName: "Acme Corporation",
      phoneNumbers: [{ label: "main", value: "+1800ACME" }],
      emailAddresses: [{ label: "info", value: "info@acme.com" }],
    });

    expect(getDisplayName(contact)).toBe("Acme Corporation");
    expect(getSubtitle(contact)).toBe("Acme Corporation");
  });

  it("handles contact with special characters in names", () => {
    const contact = createMockContact({
      givenName: "José María",
      familyName: "O'Connor-Smith",
      nickname: "JM 🎉",
    });

    expect(getDisplayName(contact)).toBe("José María O'Connor-Smith");
  });

  it("handles contact with very long values", () => {
    const longName = "A".repeat(200);
    const longEmail = "a".repeat(100) + "@" + "b".repeat(100) + ".com";
    const contact = createMockContact({
      givenName: longName,
      emailAddresses: [{ label: "work", value: longEmail }],
    });

    expect(getDisplayName(contact)).toBe(longName);
    expect(contact.emailAddresses[0].value).toBe(longEmail);
  });

  it("handles contact with null labels throughout", () => {
    const contact = createMockContact({
      givenName: "Null",
      familyName: "Labels",
      phoneNumbers: [
        { label: null, value: "+1111111111" },
        { label: null, value: "+2222222222" },
      ],
      emailAddresses: [
        { label: null, value: "null1@example.com" },
        { label: null, value: "null2@example.com" },
      ],
      postalAddresses: [
        {
          label: null,
          street: "123 Null St",
          city: "Nullville",
          state: "NL",
          postalCode: "00000",
          country: "Nulland",
          isoCountryCode: "NL",
        },
      ],
    });

    expect(contact.phoneNumbers[0].label).toBeNull();
    expect(contact.emailAddresses[0].label).toBeNull();
    expect(contact.postalAddresses[0].label).toBeNull();
    expect(getDisplayName(contact)).toBe("Null Labels");
  });

  it("handles contact with mixed data completeness", () => {
    const contact = createMockContact({
      givenName: "Partial",
      familyName: "",
      organizationName: "Some Org",
      jobTitle: "",
      phoneNumbers: [{ label: "mobile", value: "+1234567890" }],
      emailAddresses: [],
      postalAddresses: [
        {
          label: "home",
          street: "",
          city: "JustCity",
          state: "",
          postalCode: "",
          country: "",
          isoCountryCode: "",
        },
      ],
    });

    expect(getDisplayName(contact)).toBe("Partial");
    expect(getSubtitle(contact)).toBe("Some Org");
    expect(contact.postalAddresses[0].street).toBe("");
    expect(contact.postalAddresses[0].city).toBe("JustCity");
  });

  it("handles contact with birthday", () => {
    const contact = createMockContact({
      givenName: "Birthday",
      familyName: "Person",
      birthday: "1990-12-25",
    });

    expect(contact.birthday).toBe("1990-12-25");
  });

  it("handles contact with null birthday", () => {
    const contact = createMockContact({
      givenName: "No",
      familyName: "Birthday",
      birthday: null,
    });

    expect(contact.birthday).toBeNull();
  });

  it("handles contact with thumbnail data", () => {
    const contact = createMockContact({
      givenName: "Has",
      familyName: "Photo",
      imageDataAvailable: true,
      thumbnailBase64:
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    });

    expect(contact.imageDataAvailable).toBe(true);
    expect(contact.thumbnailBase64).toBeTruthy();
    expect(contact.thumbnailBase64?.length).toBeGreaterThan(10);
  });

  it("handles contact with imageDataAvailable but no thumbnail", () => {
    const contact = createMockContact({
      givenName: "Missing",
      familyName: "Thumbnail",
      imageDataAvailable: true,
      thumbnailBase64: null,
    });

    expect(contact.imageDataAvailable).toBe(true);
    expect(contact.thumbnailBase64).toBeNull();
  });

  it("handles contact with URL addresses", () => {
    const contact = createMockContact({
      givenName: "Web",
      familyName: "Person",
      urlAddresses: [
        { label: "homepage", value: "https://example.com" },
        { label: "blog", value: "https://blog.example.com" },
        { label: null, value: "https://other.example.com" },
      ],
    });

    expect(contact.urlAddresses).toHaveLength(3);
    expect(contact.urlAddresses[0].value).toBe("https://example.com");
    expect(contact.urlAddresses[2].label).toBeNull();
  });
});
