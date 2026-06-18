import { normalizeNumber, buildWhatsAppUrl } from "../normalizeNumber";

// ─── International format (leading +) ────────────────────────────────────────

describe("international format (starts with +)", () => {
  test("Brazil — formatted +55 (11) 91234-5678", () => {
    expect(normalizeNumber("+55 (11) 91234-5678", "")).toBe("5511912345678");
  });

  test("USA — formatted +1 (415) 555-0123", () => {
    expect(normalizeNumber("+1 (415) 555-0123", "")).toBe("14155550123");
  });

  test("UK — +44 20 7946 0958", () => {
    expect(normalizeNumber("+44 20 7946 0958", "")).toBe("442079460958");
  });

  test("Germany — +49 30 12345678", () => {
    expect(normalizeNumber("+49 30 12345678", "")).toBe("493012345678");
  });

  test("India — +91 98765 43210", () => {
    expect(normalizeNumber("+91 98765 43210", "")).toBe("919876543210");
  });

  test("Japan — +81 90-1234-5678", () => {
    expect(normalizeNumber("+81 90-1234-5678", "")).toBe("819012345678");
  });

  test("UAE — +971 50 123 4567", () => {
    expect(normalizeNumber("+971 50 123 4567", "")).toBe("971501234567");
  });

  test("Nigeria — +234 803 123 4567", () => {
    expect(normalizeNumber("+234 803 123 4567", "")).toBe("2348031234567");
  });

  test("strips dots and slashes in international number", () => {
    expect(normalizeNumber("+33.1.23.45.67.89", "")).toBe("33123456789");
  });

  test("ignores countryCode when number starts with +", () => {
    expect(normalizeNumber("+5511912345678", "1")).toBe("5511912345678");
  });
});

// ─── Local format — country code prepended ───────────────────────────────────

describe("local format — country code prepended when ≤11 digits", () => {
  test("Brazil — 11 91234-5678 with countryCode 55", () => {
    expect(normalizeNumber("11 91234-5678", "55")).toBe("5511912345678");
  });

  test("Brazil — digits only 11912345678 with countryCode 55", () => {
    expect(normalizeNumber("11912345678", "55")).toBe("5511912345678");
  });

  test("USA — 10-digit 4155550123 with countryCode 1", () => {
    expect(normalizeNumber("4155550123", "1")).toBe("14155550123");
  });

  test("India — 9876543210 with countryCode 91", () => {
    expect(normalizeNumber("9876543210", "91")).toBe("919876543210");
  });

  test("UK — 07911 123456 strips leading zero then prepends 44", () => {
    expect(normalizeNumber("07911 123456", "44")).toBe("447911123456");
  });

  test("Germany — 030 12345678 strips leading zero then prepends 49", () => {
    expect(normalizeNumber("030 12345678", "49")).toBe("493012345678");
  });

  test("Australia — 0412 345 678 strips leading zero, prepends 61", () => {
    expect(normalizeNumber("0412 345 678", "61")).toBe("61412345678");
  });

  test("South Africa — 072 345 6789 strips zero, prepends 27", () => {
    expect(normalizeNumber("072 345 6789", "27")).toBe("27723456789");
  });

  test("Mexico — (55) 1234-5678 with countryCode 52", () => {
    expect(normalizeNumber("(55) 1234-5678", "52")).toBe("525512345678");
  });

  test("France — 01 23 45 67 89 strips leading zero, prepends 33", () => {
    expect(normalizeNumber("01 23 45 67 89", "33")).toBe("33123456789");
  });

  test("Italy — 06 12345678 strips zero, prepends 39", () => {
    expect(normalizeNumber("06 12345678", "39")).toBe("39612345678");
  });

  test("Portugal — 912 345 678 with countryCode 351", () => {
    expect(normalizeNumber("912 345 678", "351")).toBe("351912345678");
  });
});

// ─── Local format — already has country code (>11 digits) ────────────────────

describe("local format — no prepend when >11 digits (country code already included)", () => {
  test("Brazil 13-digit with country code — 5511912345678", () => {
    expect(normalizeNumber("5511912345678", "55")).toBe("5511912345678");
  });

  test("USA 11-digit already has country code — not prepended again", () => {
    // starts with "1" and remainder "4155550123" is 10 digits — detected as already having code
    expect(normalizeNumber("14155550123", "1")).toBe("14155550123");
  });

  test("12-digit number — not prepended", () => {
    expect(normalizeNumber("441234567890", "44")).toBe("441234567890");
  });
});

// ─── Duplicate country code prevention ───────────────────────────────────────

describe("duplicate country code prevention", () => {
  test("Brazil: typed 5511912345678 with countryCode 55 — not doubled", () => {
    expect(normalizeNumber("5511912345678", "55")).toBe("5511912345678");
  });

  test("Brazil: typed 55 11 91234-5678 with countryCode 55 — not doubled", () => {
    expect(normalizeNumber("55 11 91234-5678", "55")).toBe("5511912345678");
  });

  test("USA: typed 14155550123 with countryCode 1 — not doubled", () => {
    expect(normalizeNumber("14155550123", "1")).toBe("14155550123");
  });

  test("UK: typed 447911123456 with countryCode 44 — not doubled", () => {
    expect(normalizeNumber("447911123456", "44")).toBe("447911123456");
  });

  test("India: typed 919876543210 with countryCode 91 — not doubled", () => {
    expect(normalizeNumber("919876543210", "91")).toBe("919876543210");
  });

  test("ambiguous short number starting with code — treated as already containing it", () => {
    // "55123456" starts with "55"; we conservatively assume it already includes the country code
    // to avoid ever doubling. User can always type + prefix to be explicit.
    expect(normalizeNumber("55123456", "55")).toBe("55123456");
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe("edge cases", () => {
  test("extra whitespace around input is trimmed", () => {
    expect(normalizeNumber("  +5511912345678  ", "")).toBe("5511912345678");
  });

  test("number with dashes only", () => {
    expect(normalizeNumber("+1-800-555-0199", "")).toBe("18005550199");
  });

  test("empty string returns null", () => {
    expect(normalizeNumber("", "55")).toBeNull();
  });

  test("only non-digit characters returns null", () => {
    expect(normalizeNumber("---", "55")).toBeNull();
  });

  test("too short — 7 digits returns null", () => {
    expect(normalizeNumber("1234567", "")).toBeNull();
  });

  test("too long — 16 digits returns null", () => {
    expect(normalizeNumber("+1234567890123456", "")).toBeNull();
  });

  test("minimum valid — 8 digits", () => {
    expect(normalizeNumber("+12345678", "")).toBe("12345678");
  });

  test("maximum valid — 15 digits", () => {
    expect(normalizeNumber("+123456789012345", "")).toBe("123456789012345");
  });

  test("no countryCode and short number — used as-is", () => {
    expect(normalizeNumber("12345678", "")).toBe("12345678");
  });
});

// ─── buildWhatsAppUrl ─────────────────────────────────────────────────────────

describe("buildWhatsAppUrl", () => {
  test("no message", () => {
    expect(buildWhatsAppUrl("5511912345678")).toBe("https://wa.me/5511912345678");
  });

  test("with plain message", () => {
    expect(buildWhatsAppUrl("5511912345678", "Hello!")).toBe("https://wa.me/5511912345678?text=Hello!");
  });

  test("message with spaces and special chars is encoded", () => {
    expect(buildWhatsAppUrl("14155550123", "Hi there & more")).toBe(
      "https://wa.me/14155550123?text=Hi%20there%20%26%20more",
    );
  });

  test("empty message string — treated as no message", () => {
    expect(buildWhatsAppUrl("5511912345678", "")).toBe("https://wa.me/5511912345678");
  });
});
