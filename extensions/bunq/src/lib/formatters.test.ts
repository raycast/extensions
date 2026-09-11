import { describe, it, expect, vi } from "vitest";
import { formatCurrency, formatDate, formatDateForApi, formatDateTimeForApi, detectPointerType } from "./formatters";

// Mock the constants module to control locale
vi.mock("./constants", () => ({
  getLocale: vi.fn(() => "en-US"),
  DEFAULT_CURRENCY: "EUR",
}));

describe("formatters", () => {
  describe("formatCurrency", () => {
    it("formats a positive amount", () => {
      const result = formatCurrency("123.45", "EUR");
      expect(result).toContain("123");
      expect(result).toContain("45");
    });

    it("formats a negative amount", () => {
      const result = formatCurrency("-50.00", "EUR");
      expect(result).toContain("50");
    });

    it("uses absolute value when option is set", () => {
      const result = formatCurrency("-50.00", "EUR", { absolute: true });
      expect(result).not.toContain("-");
      expect(result).toContain("50");
    });

    it("handles zero amount", () => {
      const result = formatCurrency("0.00", "EUR");
      expect(result).toContain("0");
    });

    it("handles different currencies", () => {
      const eurResult = formatCurrency("100.00", "EUR");
      const usdResult = formatCurrency("100.00", "USD");
      const gbpResult = formatCurrency("100.00", "GBP");

      // Each should contain the amount but different currency symbols
      expect(eurResult).toContain("100");
      expect(usdResult).toContain("100");
      expect(gbpResult).toContain("100");
    });

    it("uses default currency when not specified", () => {
      const result = formatCurrency("50.00");
      expect(result).toContain("50");
    });

    it("handles large amounts", () => {
      const result = formatCurrency("1234567.89", "EUR");
      expect(result).toBeDefined();
    });

    it("handles amounts with many decimal places", () => {
      const result = formatCurrency("123.456789", "EUR");
      expect(result).toBeDefined();
    });
  });

  describe("formatDate", () => {
    it("formats a date string with short style", () => {
      const result = formatDate("2024-01-15T10:30:00Z");
      expect(result).toContain("2024");
      expect(result).toContain("15");
    });

    it("formats a date string with long style", () => {
      const result = formatDate("2024-01-15T10:30:00Z", { style: "long" });
      expect(result).toContain("2024");
      expect(result).toContain("15");
    });

    it("handles ISO date strings", () => {
      // Use a date that won't roll over to a different day in any timezone
      const result = formatDate("2024-12-15T12:00:00.000Z");
      expect(result).toContain("2024");
      expect(result).toContain("15");
    });

    it("handles date strings without time", () => {
      const result = formatDate("2024-06-15");
      expect(result).toContain("2024");
    });
  });

  describe("formatDateForApi", () => {
    it("formats a date for API submission", () => {
      const date = new Date("2024-01-15T10:30:00Z");
      const result = formatDateForApi(date);
      expect(result).toBe("2024-01-15");
    });

    it("returns empty string for null date", () => {
      const result = formatDateForApi(null);
      expect(result).toBe("");
    });

    it("handles end of year dates", () => {
      // Use local date components (month is 0-indexed) to avoid timezone conversion issues
      const date = new Date(2024, 11, 31);
      const result = formatDateForApi(date);
      expect(result).toBe("2024-12-31");
    });

    it("handles beginning of year dates", () => {
      const date = new Date("2024-01-01T00:00:00Z");
      const result = formatDateForApi(date);
      expect(result).toBe("2024-01-01");
    });
  });

  describe("formatDateTimeForApi", () => {
    it("formats a datetime for API submission", () => {
      const date = new Date("2024-01-15T10:30:00Z");
      const result = formatDateTimeForApi(date);
      expect(result).toBe("2024-01-15 00:00:00");
    });

    it("returns empty string for null date", () => {
      const result = formatDateTimeForApi(null);
      expect(result).toBe("");
    });

    it("always uses 00:00:00 for time", () => {
      const date = new Date("2024-06-15T14:45:30Z");
      const result = formatDateTimeForApi(date);
      expect(result).toContain("00:00:00");
    });
  });

  describe("detectPointerType", () => {
    it("detects IBAN format", () => {
      expect(detectPointerType("NL91ABNA0417164300")).toBe("IBAN");
      expect(detectPointerType("DE89370400440532013000")).toBe("IBAN");
      expect(detectPointerType("GB82WEST12345698765432")).toBe("IBAN");
    });

    it("detects EMAIL format", () => {
      expect(detectPointerType("user@example.com")).toBe("EMAIL");
      expect(detectPointerType("john.doe@company.org")).toBe("EMAIL");
      expect(detectPointerType("test+tag@mail.co.uk")).toBe("EMAIL");
    });

    it("detects PHONE_NUMBER format", () => {
      expect(detectPointerType("+31612345678")).toBe("PHONE_NUMBER");
      expect(detectPointerType("+1 555 123 4567")).toBe("PHONE_NUMBER");
      expect(detectPointerType("0612345678")).toBe("PHONE_NUMBER");
      expect(detectPointerType("+44 20 7946 0958")).toBe("PHONE_NUMBER");
    });

    it("defaults to IBAN for ambiguous input", () => {
      expect(detectPointerType("ABCD1234")).toBe("IBAN");
      expect(detectPointerType("")).toBe("IBAN");
    });

    it("handles phone numbers with different formats", () => {
      expect(detectPointerType("+31-6-12345678")).toBe("PHONE_NUMBER");
      expect(detectPointerType("06 1234 5678")).toBe("PHONE_NUMBER");
    });
  });
});
