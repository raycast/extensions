import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  AmountSchema,
  PointerSchema,
  MonetaryAccountSchema,
  PaymentSchema,
  CardSchema,
  RequestInquirySchema,
  ScheduledPaymentSchema,
  safeParse,
  parseOrThrow,
  PaginationSchema,
  MastercardActionSchema,
} from "./schemas";

// Mock the logger
vi.mock("../lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("schemas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AmountSchema", () => {
    it("validates valid amount", () => {
      const data = { value: "100.00", currency: "EUR" };
      const result = AmountSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("fails for missing currency", () => {
      const data = { value: "100.00" };
      const result = AmountSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("allows extra fields with passthrough", () => {
      const data = { value: "100.00", currency: "EUR", extra: "field" };
      const result = AmountSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty("extra", "field");
      }
    });
  });

  describe("PointerSchema", () => {
    it("validates valid pointer", () => {
      const data = { type: "IBAN", value: "NL91ABNA0417164300" };
      const result = PointerSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("validates pointer with optional name", () => {
      const data = { type: "EMAIL", value: "test@example.com", name: "John Doe" };
      const result = PointerSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("fails for missing type", () => {
      const data = { value: "test@example.com" };
      const result = PointerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("MonetaryAccountSchema", () => {
    it("validates complete monetary account", () => {
      const data = {
        id: 12345,
        description: "Main Account",
        balance: { value: "1000.00", currency: "EUR" },
        status: "ACTIVE",
        currency: "EUR",
        alias: [{ type: "IBAN", value: "NL91ABNA0417164300" }],
        created: "2024-01-01T00:00:00Z",
        updated: "2024-01-15T12:00:00Z",
      };
      const result = MonetaryAccountSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("validates with optional fields", () => {
      const data = {
        id: 12345,
        description: "Savings",
        balance: { value: "5000.00", currency: "EUR" },
        status: "ACTIVE",
        currency: "EUR",
        alias: [],
        created: "2024-01-01T00:00:00Z",
        updated: "2024-01-15T12:00:00Z",
        daily_limit: { value: "500.00", currency: "EUR" },
        daily_spent: { value: "100.00", currency: "EUR" },
      };
      const result = MonetaryAccountSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("fails for missing required fields", () => {
      const data = {
        id: 12345,
        balance: { value: "1000.00", currency: "EUR" },
      };
      const result = MonetaryAccountSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("PaymentSchema", () => {
    it("validates complete payment", () => {
      const data = {
        id: 999,
        created: "2024-01-15T10:30:00Z",
        updated: "2024-01-15T10:30:00Z",
        amount: { value: "-50.00", currency: "EUR" },
        description: "Payment for coffee",
        type: "BUNQ",
        alias: { iban: "NL91ABNA0417164300", display_name: "My Account" },
        counterparty_alias: { iban: "NL12BUNQ1234567890", display_name: "Coffee Shop" },
        monetary_account_id: 12345,
      };
      const result = PaymentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("validates payment with null geolocation", () => {
      const data = {
        id: 999,
        created: "2024-01-15T10:30:00Z",
        updated: "2024-01-15T10:30:00Z",
        amount: { value: "-50.00", currency: "EUR" },
        description: "Payment",
        type: "BUNQ",
        alias: {},
        counterparty_alias: {},
        monetary_account_id: 12345,
        geolocation: null,
      };
      const result = PaymentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("CardSchema", () => {
    it("validates card data", () => {
      const data = {
        id: 5678,
        created: "2024-01-01T00:00:00Z",
        status: "ACTIVE",
        type: "MASTERCARD",
        second_line: "JOHN DOE",
        expiry_date: "2027-12",
      };
      const result = CardSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("validates card with optional fields", () => {
      const data = {
        id: 5678,
        is_virtual: true,
        limit: [{ daily_limit: "500.00", currency: "EUR" }],
      };
      const result = CardSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("RequestInquirySchema", () => {
    it("validates request inquiry", () => {
      const data = {
        id: 111,
        created: "2024-01-15T10:00:00Z",
        updated: "2024-01-15T10:00:00Z",
        status: "PENDING",
        amount_inquired: { value: "25.00", currency: "EUR" },
        counterparty_alias: { type: "EMAIL", value: "friend@example.com" },
        description: "Dinner split",
        monetary_account_id: 12345,
      };
      const result = RequestInquirySchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("validates all status values", () => {
      const statuses = ["PENDING", "ACCEPTED", "REJECTED", "REVOKED", "EXPIRED"];
      for (const status of statuses) {
        const data = {
          id: 111,
          created: "2024-01-15T10:00:00Z",
          updated: "2024-01-15T10:00:00Z",
          status,
          amount_inquired: { value: "25.00", currency: "EUR" },
          counterparty_alias: {},
          description: "Test",
          monetary_account_id: 12345,
        };
        const result = RequestInquirySchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });
  });

  describe("ScheduledPaymentSchema", () => {
    it("validates scheduled payment", () => {
      const data = {
        id: 222,
        created: "2024-01-01T00:00:00Z",
        updated: "2024-01-15T12:00:00Z",
        status: "ACTIVE",
        payment: {
          amount: { value: "100.00", currency: "EUR" },
          counterparty_alias: { type: "IBAN", value: "NL12BUNQ1234567890" },
          description: "Monthly rent",
        },
        schedule: {
          time_start: "2024-02-01T00:00:00Z",
          recurrence_unit: "MONTHLY",
          recurrence_size: 1,
        },
      };
      const result = ScheduledPaymentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("validates all recurrence units", () => {
      const units = ["ONCE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"];
      for (const unit of units) {
        const data = {
          id: 222,
          created: "2024-01-01T00:00:00Z",
          updated: "2024-01-15T12:00:00Z",
          status: "ACTIVE",
          payment: {
            amount: { value: "100.00", currency: "EUR" },
            counterparty_alias: { type: "IBAN", value: "NL12BUNQ1234567890" },
            description: "Scheduled",
          },
          schedule: {
            time_start: "2024-02-01T00:00:00Z",
            recurrence_unit: unit,
            recurrence_size: 1,
          },
        };
        const result = ScheduledPaymentSchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });
  });

  describe("MastercardActionSchema", () => {
    it("validates with null fields", () => {
      const data = {
        id: 333,
        created: null,
        updated: null,
        monetary_account_id: null,
        card_id: null,
        description: null,
        pos_card_presence: null,
        pos_card_holder_presence: null,
        token_status: null,
      };
      const result = MastercardActionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("validates with undefined fields", () => {
      const data = {
        id: 333,
        amount_local: { value: "10.00", currency: "EUR" },
        description: "Coffee purchase",
      };
      const result = MastercardActionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("PaginationSchema", () => {
    it("validates pagination with URLs", () => {
      const data = {
        future_url: "/v1/user/123/monetary-account/456/payment?newer_id=100",
        newer_url: "/v1/user/123/monetary-account/456/payment?newer_id=100",
        older_url: "/v1/user/123/monetary-account/456/payment?older_id=50",
      };
      const result = PaginationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("validates pagination with null URLs", () => {
      const data = {
        future_url: null,
        newer_url: null,
        older_url: null,
      };
      const result = PaginationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("safeParse", () => {
    it("returns parsed data for valid input", () => {
      const data = { value: "100.00", currency: "EUR" };
      const result = safeParse(AmountSchema, data, "test amount");
      expect(result).toEqual(data);
    });

    it("returns undefined for invalid input", () => {
      const data = { value: "100.00" }; // Missing currency
      const result = safeParse(AmountSchema, data, "test amount");
      expect(result).toBeUndefined();
    });

    it("logs warning for validation failure", async () => {
      const { logger } = await import("../lib/logger");
      const data = { invalid: "data" };
      safeParse(AmountSchema, data, "test context");
      // Note: We no longer log raw data for security reasons - only context and error metadata
      expect(logger.warn).toHaveBeenCalledWith(
        "Validation failed for test context",
        expect.objectContaining({ context: "test context", errorCount: expect.any(Number) }),
      );
    });
  });

  describe("parseOrThrow", () => {
    it("returns parsed data for valid input", () => {
      const data = { value: "100.00", currency: "EUR" };
      const result = parseOrThrow(AmountSchema, data, "test amount");
      expect(result).toEqual(data);
    });

    it("throws for invalid input", () => {
      const data = { value: "100.00" }; // Missing currency
      expect(() => parseOrThrow(AmountSchema, data, "test amount")).toThrow("Invalid test amount");
    });

    it("logs error for validation failure", async () => {
      const { logger } = await import("../lib/logger");
      const data = { invalid: "data" };
      try {
        parseOrThrow(AmountSchema, data, "test context");
      } catch {
        // Expected to throw
      }
      // Note: We no longer log raw data for security reasons - only context and error metadata
      expect(logger.error).toHaveBeenCalledWith(
        "Validation failed for test context",
        expect.objectContaining({ context: "test context", errorCount: expect.any(Number) }),
      );
    });
  });
});
