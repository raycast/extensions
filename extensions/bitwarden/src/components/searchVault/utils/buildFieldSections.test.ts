import { buildFieldSections } from "./buildFieldSections";
import { CARD_BRANDS, FieldType, IdentityTitle, Item, ItemType, UriMatch } from "~/types/vault";

jest.mock("@raycast/api", () => ({
  Icon: {
    PersonCircle: "person-circle",
    Clock: "clock",
    Person: "person",
    Building: "building",
    Fingerprint: "fingerprint",
    Airplane: "airplane",
    CreditCard: "credit-card",
    Envelope: "envelope",
    Phone: "phone",
    Map: "map",
    Calendar: "calendar",
    Lock: "lock",
    Key: "key",
    Document: "document",
    CheckCircle: "check-circle",
    Circle: "circle",
  },
}));

function baseItem(overrides: Partial<Item> = {}): Item {
  return {
    object: "item",
    id: "item-1",
    organizationId: null,
    folderId: null,
    type: ItemType.LOGIN,
    reprompt: 0,
    name: "Test",
    notes: null,
    favorite: false,
    collectionIds: [],
    revisionDate: "2024-01-01T00:00:00Z",
    creationDate: "2024-01-01T00:00:00Z",
    deletedDate: null,
    ...overrides,
  };
}

describe("buildFieldSections", () => {
  describe("Login", () => {
    it("returns no Login or URIs sections when login has no fields, only Notes/Custom if set", () => {
      const item = baseItem({
        type: ItemType.LOGIN,
        login: {
          username: null,
          password: null,
          totp: null,
          passwordRevisionDate: null,
        },
        notes: "my note",
        fields: [{ name: "Extra", value: "v", type: FieldType.TEXT, linkedId: null }],
      });
      const sections = buildFieldSections(item);
      expect(sections).toHaveLength(2);
      expect(sections[0]!.title).toBe("Notes");
      expect(sections[1]!.title).toBe("Custom Fields");
      expect(sections.some((s) => s.title === "Login")).toBe(false);
      expect(sections.some((s) => s.title === "URIs")).toBe(false);
    });

    it("returns Login and URIs sections with all fields when present", () => {
      const item = baseItem({
        type: ItemType.LOGIN,
        login: {
          username: "u1",
          password: "p1",
          totp: "totp-secret",
          passwordRevisionDate: null,
          uris: [{ match: UriMatch.HOST, uri: "https://example.com" }],
        },
      });
      const sections = buildFieldSections(item);
      expect(sections).toHaveLength(2);
      expect(sections[0]!.title).toBe("Login");
      expect(sections[0]!.fields).toHaveLength(3);
      expect(sections[0]!.fields[0]).toMatchObject({
        type: "text",
        id: "login.username",
        label: "Username",
        value: "u1",
      });
      expect(sections[0]!.fields[1]).toMatchObject({
        type: "hidden",
        id: "login.password",
        label: "Password",
        value: "p1",
      });
      expect(sections[0]!.fields[2]).toMatchObject({
        type: "totp",
        id: "login.totp",
        label: "TOTP",
        value: "totp-secret",
        secretLabel: "TOTP Secret",
      });
      expect(sections[1]!.title).toBe("URIs");
      expect(sections[1]!.fields).toHaveLength(1);
      expect(sections[1]!.fields[0]).toMatchObject({
        type: "link",
        id: "login.uri.0",
        label: "URI",
        value: "https://example.com",
      });
    });

    it("returns only Login section with username when only username is set", () => {
      const item = baseItem({
        type: ItemType.LOGIN,
        login: {
          username: "only-user",
          password: null,
          totp: null,
          passwordRevisionDate: null,
        },
      });
      const sections = buildFieldSections(item);
      expect(sections).toHaveLength(1);
      expect(sections[0]!.title).toBe("Login");
      expect(sections[0]!.fields).toHaveLength(1);
      expect(sections[0]!.fields[0]).toMatchObject({
        type: "text",
        id: "login.username",
        label: "Username",
        value: "only-user",
      });
    });

    it("returns only URIs section when no username/password/totp but uris present", () => {
      const item = baseItem({
        type: ItemType.LOGIN,
        login: {
          username: null,
          password: null,
          totp: null,
          passwordRevisionDate: null,
          uris: [{ match: null, uri: "https://example.com" }],
        },
      });
      const sections = buildFieldSections(item);
      expect(sections).toHaveLength(1);
      expect(sections[0]!.title).toBe("URIs");
      expect(sections[0]!.fields).toHaveLength(1);
      expect(sections[0]!.fields[0]).toMatchObject({
        type: "link",
        id: "login.uri.0",
        label: "URI",
        value: "https://example.com",
      });
    });

    it("filters out empty URIs and labels multiple as URI 1, URI 2", () => {
      const item = baseItem({
        type: ItemType.LOGIN,
        login: {
          username: null,
          password: null,
          totp: null,
          passwordRevisionDate: null,
          uris: [
            { match: null, uri: "https://a.com" },
            { match: null, uri: "" },
            { match: null, uri: "https://b.com" },
          ],
        },
      });
      const sections = buildFieldSections(item);
      expect(sections).toHaveLength(1);
      expect(sections[0]!.title).toBe("URIs");
      expect(sections[0]!.fields).toHaveLength(2);
      expect(sections[0]!.fields[0]).toMatchObject({
        id: "login.uri.0",
        label: "URI 1",
        value: "https://a.com",
      });
      expect(sections[0]!.fields[1]).toMatchObject({
        id: "login.uri.1",
        label: "URI 2",
        value: "https://b.com",
      });
    });
  });

  describe("Card", () => {
    it("returns no Card section when card is undefined or all null", () => {
      const itemUndef = baseItem({
        type: ItemType.CARD,
        card: undefined,
        notes: "x",
      });
      expect(buildFieldSections(itemUndef)).toHaveLength(1);
      expect(buildFieldSections(itemUndef)[0]!.title).toBe("Notes");

      const itemNulls = baseItem({
        type: ItemType.CARD,
        card: {
          cardholderName: null,
          brand: null,
          number: null,
          expMonth: null,
          expYear: null,
          code: null,
        },
      });
      expect(buildFieldSections(itemNulls)).toHaveLength(0);
    });

    it("returns Card section with all six fields when present", () => {
      const item = baseItem({
        type: ItemType.CARD,
        card: {
          cardholderName: "John Doe",
          brand: CARD_BRANDS.VISA,
          number: "4111111111111111",
          expMonth: "12",
          expYear: "2025",
          code: "123",
        },
      });
      const sections = buildFieldSections(item);
      expect(sections).toHaveLength(1);
      expect(sections[0]!.title).toBe("Card");
      expect(sections[0]!.fields).toHaveLength(6);
      expect(sections[0]!.fields[0]).toMatchObject({
        type: "text",
        id: "card.cardholderName",
        label: "Cardholder Name",
        value: "John Doe",
      });
      expect(sections[0]!.fields[1]).toMatchObject({
        type: "text",
        id: "card.brand",
        label: "Brand",
        value: "Visa",
      });
      expect(sections[0]!.fields[2]).toMatchObject({
        type: "hidden",
        id: "card.number",
        label: "Number",
        value: "4111111111111111",
      });
      expect(sections[0]!.fields[3]).toMatchObject({
        type: "text",
        id: "card.expMonth",
        label: "Expiry Month",
        value: "12",
      });
      expect(sections[0]!.fields[4]).toMatchObject({
        type: "text",
        id: "card.expYear",
        label: "Expiry Year",
        value: "2025",
      });
      expect(sections[0]!.fields[5]).toMatchObject({
        type: "hidden",
        id: "card.code",
        label: "Security Code",
        value: "123",
      });
    });

    it("returns Card section with only cardholderName and brand when partial", () => {
      const item = baseItem({
        type: ItemType.CARD,
        card: {
          cardholderName: "Jane",
          brand: CARD_BRANDS.MASTERCARD,
          number: null,
          expMonth: null,
          expYear: null,
          code: null,
        },
      });
      const sections = buildFieldSections(item);
      expect(sections).toHaveLength(1);
      expect(sections[0]!.title).toBe("Card");
      expect(sections[0]!.fields).toHaveLength(2);
      expect(sections[0]!.fields[0]).toMatchObject({
        id: "card.cardholderName",
        label: "Cardholder Name",
        value: "Jane",
      });
      expect(sections[0]!.fields[1]).toMatchObject({
        id: "card.brand",
        label: "Brand",
        value: "Mastercard",
      });
    });
  });

  describe("Identity", () => {
    it("returns no Personal Details, Identification, or Contact sections when all empty", () => {
      const item = baseItem({
        type: ItemType.IDENTITY,
        identity: {
          title: null,
          firstName: null,
          middleName: null,
          lastName: null,
          address1: null,
          address2: null,
          address3: null,
          city: null,
          state: null,
          postalCode: null,
          country: null,
          company: null,
          email: null,
          phone: null,
          ssn: null,
          username: null,
          passportNumber: null,
          licenseNumber: null,
        },
      });
      const sections = buildFieldSections(item);
      expect(sections).toHaveLength(0);
    });

    it("returns Personal Details, Identification, Contact in order when all populated", () => {
      const item = baseItem({
        type: ItemType.IDENTITY,
        identity: {
          title: "Mr" as IdentityTitle,
          firstName: "John",
          middleName: "M",
          lastName: "Doe",
          address1: "123 Main St",
          address2: null,
          address3: null,
          city: "Boston",
          state: "MA",
          postalCode: "02101",
          country: "USA",
          company: "Acme",
          email: "john@acme.com",
          phone: "+15551234567",
          ssn: "123-45-6789",
          username: "jdoe",
          passportNumber: "AB123",
          licenseNumber: "DL456",
        },
      });
      const sections = buildFieldSections(item);
      expect(sections).toHaveLength(3);
      expect(sections[0]!.title).toBe("Personal Details");
      expect(sections[0]!.fields).toHaveLength(3);
      expect(sections[0]!.fields[0]).toMatchObject({
        type: "text",
        id: "identity.name",
        label: "Name",
        value: "Mr John M Doe",
      });
      expect(sections[0]!.fields[1]).toMatchObject({
        id: "identity.username",
        label: "Username",
        value: "jdoe",
      });
      expect(sections[0]!.fields[2]).toMatchObject({
        id: "identity.company",
        label: "Company",
        value: "Acme",
      });
      expect(sections[1]!.title).toBe("Identification");
      expect(sections[1]!.fields).toHaveLength(3);
      expect(sections[1]!.fields[0]).toMatchObject({
        type: "hidden",
        id: "identity.ssn",
        label: "Social Security Number",
        value: "123-45-6789",
      });
      expect(sections[1]!.fields[1]).toMatchObject({
        id: "identity.passportNumber",
        label: "Passport Number",
        value: "AB123",
      });
      expect(sections[1]!.fields[2]).toMatchObject({
        id: "identity.licenseNumber",
        label: "License Number",
        value: "DL456",
      });
      expect(sections[2]!.title).toBe("Contact Information");
      expect(sections[2]!.fields).toHaveLength(3);
      expect(sections[2]!.fields[0]).toMatchObject({
        id: "identity.email",
        label: "Email",
        value: "john@acme.com",
      });
      expect(sections[2]!.fields[1]).toMatchObject({
        id: "identity.phone",
        label: "Phone",
        value: "+15551234567",
      });
      expect(sections[2]!.fields[2]).toMatchObject({
        id: "identity.address",
        label: "Address",
        displayValue: expect.any(String),
      });
    });

    it("returns only Personal Details with composed Name when only firstName and lastName set", () => {
      const item = baseItem({
        type: ItemType.IDENTITY,
        identity: {
          title: null,
          firstName: "FirstName",
          middleName: null,
          lastName: "LastName",
          address1: null,
          address2: null,
          address3: null,
          city: null,
          state: null,
          postalCode: null,
          country: null,
          company: null,
          email: null,
          phone: null,
          ssn: null,
          username: null,
          passportNumber: null,
          licenseNumber: null,
        },
      });
      const sections = buildFieldSections(item);
      expect(sections).toHaveLength(1);
      expect(sections[0]!.title).toBe("Personal Details");
      expect(sections[0]!.fields).toHaveLength(1);
      expect(sections[0]!.fields[0]).toMatchObject({
        type: "text",
        id: "identity.name",
        label: "Name",
        value: "FirstName LastName",
      });
    });

    it("returns Contact Information with Address value newlines and displayValue comma-separated", () => {
      const item = baseItem({
        type: ItemType.IDENTITY,
        identity: {
          title: null,
          firstName: null,
          middleName: null,
          lastName: null,
          address1: "123 Main",
          address2: null,
          address3: null,
          city: "Boston",
          state: "MA",
          postalCode: "02101",
          country: "USA",
          company: null,
          email: null,
          phone: null,
          ssn: null,
          username: null,
          passportNumber: null,
          licenseNumber: null,
        },
      });
      const sections = buildFieldSections(item);
      expect(sections).toHaveLength(1);
      expect(sections[0]!.title).toBe("Contact Information");
      expect(sections[0]!.fields).toHaveLength(1);
      const addr = sections[0]!.fields[0];
      expect(addr).toMatchObject({
        type: "text",
        id: "identity.address",
        label: "Address",
      });
      expect(addr!.value).toContain("\n");
      expect(addr!.displayValue).toBe("123 Main, Boston, MA, 02101, USA");
    });
  });

  describe("SSH Key", () => {
    it("returns no SSH Key section when sshKey is undefined", () => {
      const item = baseItem({
        type: ItemType.SSH_KEY,
        sshKey: undefined,
        notes: "note",
      });
      const sections = buildFieldSections(item);
      expect(sections).toHaveLength(1);
      expect(sections[0]!.title).toBe("Notes");
      expect(sections.some((s) => s.title === "SSH Key")).toBe(false);
    });

    it("returns SSH Key section with publicKey, keyFingerprint, privateKey", () => {
      const item = baseItem({
        type: ItemType.SSH_KEY,
        sshKey: {
          publicKey: "ssh-ed25519 AAAAC3...",
          keyFingerprint: "SHA256:abc...",
          privateKey: "-----BEGIN OPENSSH PRIVATE KEY-----",
        },
      });
      const sections = buildFieldSections(item);
      expect(sections).toHaveLength(1);
      expect(sections[0]!.title).toBe("SSH Key");
      expect(sections[0]!.fields).toHaveLength(3);
      expect(sections[0]!.fields[0]).toMatchObject({
        type: "text",
        id: "ssh.publicKey",
        label: "Public Key",
        value: "ssh-ed25519 AAAAC3...",
      });
      expect(sections[0]!.fields[1]).toMatchObject({
        type: "text",
        id: "ssh.fingerprint",
        label: "Key Fingerprint",
        value: "SHA256:abc...",
      });
      expect(sections[0]!.fields[2]).toMatchObject({
        type: "hidden",
        id: "ssh.privateKey",
        label: "Private Key",
        value: "-----BEGIN OPENSSH PRIVATE KEY-----",
      });
    });
  });

  describe("Notes", () => {
    it("returns no Notes section when notes is null or empty", () => {
      const emptyLogin = { username: null, password: null, totp: null, passwordRevisionDate: null };
      const itemNull = baseItem({ type: ItemType.LOGIN, login: emptyLogin, notes: null });
      expect(buildFieldSections(itemNull).some((s) => s.title === "Notes")).toBe(false);

      const itemEmpty = baseItem({ type: ItemType.LOGIN, login: emptyLogin, notes: "" });
      expect(buildFieldSections(itemEmpty).some((s) => s.title === "Notes")).toBe(false);
    });

    it("returns Notes section with id notes, label Notes, value when present", () => {
      const item = baseItem({
        type: ItemType.CARD,
        card: undefined,
        notes: "some text",
      });
      const sections = buildFieldSections(item);
      expect(sections).toHaveLength(1);
      expect(sections[0]!.title).toBe("Notes");
      expect(sections[0]!.fields).toHaveLength(1);
      expect(sections[0]!.fields[0]).toMatchObject({
        type: "text",
        id: "notes",
        label: "Notes",
        value: "some text",
      });
    });
  });

  describe("Custom fields", () => {
    it("returns no Custom Fields section when fields undefined or empty", () => {
      const itemUndef = baseItem({
        type: ItemType.LOGIN,
        login: { username: "u", password: null, totp: null, passwordRevisionDate: null },
        fields: undefined,
      });
      expect(buildFieldSections(itemUndef).some((s) => s.title === "Custom Fields")).toBe(false);

      const itemEmpty = baseItem({
        type: ItemType.LOGIN,
        login: { username: "u", password: null, totp: null, passwordRevisionDate: null },
        fields: [],
      });
      expect(buildFieldSections(itemEmpty).some((s) => s.title === "Custom Fields")).toBe(false);
    });

    it("returns Custom Fields section with TEXT and HIDDEN", () => {
      const item = baseItem({
        type: ItemType.LOGIN,
        login: { username: "u", password: null, totp: null, passwordRevisionDate: null },
        fields: [
          { name: "Plain", value: "plain-val", type: FieldType.TEXT, linkedId: null },
          { name: "Secret", value: "secret-val", type: FieldType.HIDDEN, linkedId: null },
        ],
      });
      const sections = buildFieldSections(item);
      const custom = sections.find((s) => s.title === "Custom Fields");
      expect(custom).toBeDefined();
      expect(custom!.fields).toHaveLength(2);
      expect(custom!.fields[0]).toMatchObject({
        type: "text",
        id: "custom.0.Plain",
        label: "Plain",
        value: "plain-val",
      });
      expect(custom!.fields[1]).toMatchObject({
        type: "hidden",
        id: "custom.1.Secret",
        label: "Secret",
        value: "secret-val",
      });
    });

    it("returns Yes/No and correct icon for BOOLEAN custom fields", () => {
      const item = baseItem({
        type: ItemType.LOGIN,
        login: { username: "u", password: null, totp: null, passwordRevisionDate: null },
        fields: [
          { name: "BoolTrue", value: "true", type: FieldType.BOOLEAN, linkedId: null },
          { name: "BoolFalse", value: "false", type: FieldType.BOOLEAN, linkedId: null },
        ],
      });
      const sections = buildFieldSections(item);
      const custom = sections.find((s) => s.title === "Custom Fields");
      expect(custom).toBeDefined();
      expect(custom!.fields[0]).toMatchObject({
        type: "text",
        id: "custom.0.BoolTrue",
        label: "BoolTrue",
        value: "Yes",
      });
      expect(custom!.fields[0]!.icon).toBe("check-circle");
      expect(custom!.fields[1]).toMatchObject({
        type: "text",
        id: "custom.1.BoolFalse",
        label: "BoolFalse",
        value: "No",
      });
      expect(custom!.fields[1]!.icon).toBe("circle");
    });

    it("excludes LINKED and null value fields from Custom Fields", () => {
      const item = baseItem({
        type: ItemType.LOGIN,
        login: { username: "u", password: null, totp: null, passwordRevisionDate: null },
        fields: [
          { name: "Keep", value: "keep-val", type: FieldType.TEXT, linkedId: null },
          { name: "Linked", value: "linked-val", type: FieldType.LINKED, linkedId: 1 },
          { name: "NullVal", value: null as unknown as string, type: FieldType.TEXT, linkedId: null },
        ],
      });
      const sections = buildFieldSections(item);
      const custom = sections.find((s) => s.title === "Custom Fields");
      expect(custom).toBeDefined();
      expect(custom!.fields).toHaveLength(1);
      expect(custom!.fields[0]).toMatchObject({
        id: "custom.0.Keep",
        label: "Keep",
        value: "keep-val",
      });
    });
  });

  describe("Item type and section order", () => {
    it("returns only Notes and Custom Fields for NOTE item type", () => {
      const item = baseItem({
        type: ItemType.NOTE,
        notes: "note text",
        fields: [{ name: "F", value: "v", type: FieldType.TEXT, linkedId: null }],
      });
      const sections = buildFieldSections(item);
      expect(sections).toHaveLength(2);
      expect(sections[0]!.title).toBe("Notes");
      expect(sections[1]!.title).toBe("Custom Fields");
      expect(sections.some((s) => s.title === "Login")).toBe(false);
      expect(sections.some((s) => s.title === "Card")).toBe(false);
    });

    it("returns sections in order Login, URIs, Notes, Custom Fields", () => {
      const item = baseItem({
        type: ItemType.LOGIN,
        login: {
          username: "u",
          password: "p",
          totp: null,
          passwordRevisionDate: null,
          uris: [{ match: null, uri: "https://x.com" }],
        },
        notes: "my notes",
        fields: [{ name: "Custom", value: "val", type: FieldType.TEXT, linkedId: null }],
      });
      const sections = buildFieldSections(item);
      expect(sections).toHaveLength(4);
      expect(sections[0]!.title).toBe("Login");
      expect(sections[1]!.title).toBe("URIs");
      expect(sections[2]!.title).toBe("Notes");
      expect(sections[3]!.title).toBe("Custom Fields");
    });

    it("returns empty array for login with no fields, no uris, no notes, no custom fields", () => {
      const item = baseItem({
        type: ItemType.LOGIN,
        login: {
          username: null,
          password: null,
          totp: null,
          passwordRevisionDate: null,
        },
        notes: null,
        fields: [],
      });
      const sections = buildFieldSections(item);
      expect(sections).toEqual([]);
    });
  });
});
