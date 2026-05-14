/**
 * Tests for card-helpers utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getCardStatus,
  getCardName,
  getExpiryColor,
  formatExpiryDate,
  isCardActive,
  isCardExpired,
  getCardCategoryLabel,
  groupCardsByCategory,
  COUNTRY_OPTIONS,
} from "./card-helpers";
import { Color } from "@raycast/api";
import type { Card, CardCategory } from "../../api/endpoints";

// Helper to create a mock card
function createMockCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 1,
    created: "2024-01-01T00:00:00.000Z",
    updated: "2024-01-01T00:00:00.000Z",
    public_uuid: "test-uuid",
    type: "MASTERCARD",
    sub_type: "VIRTUAL",
    second_line: "TEST USER",
    name_on_card: "TEST USER",
    status: "ACTIVE",
    order_status: "ACCEPTED_FOR_PRODUCTION",
    expiry_date: "2027-12-31",
    limit: [],
    country_permission: [],
    monetary_account_id_fallback: 1,
    pin_code_assignment: [],
    primary_account_numbers: [],
    cardCategory: "CardDebit",
    ...overrides,
  };
}

describe("card-helpers", () => {
  describe("getCardStatus", () => {
    it("returns sub_status when available", () => {
      const card = createMockCard({ sub_status: "PENDING_ACTIVATION", status: "ACTIVE" });
      expect(getCardStatus(card)).toBe("PENDING_ACTIVATION");
    });

    it("returns status when sub_status is not available", () => {
      const card = createMockCard({ sub_status: undefined, status: "ACTIVE" });
      expect(getCardStatus(card)).toBe("ACTIVE");
    });

    it("returns UNKNOWN when neither status nor sub_status is available", () => {
      const card = createMockCard({ sub_status: undefined, status: undefined });
      expect(getCardStatus(card)).toBe("UNKNOWN");
    });
  });

  describe("getCardName", () => {
    it("returns second_line when available", () => {
      const card = createMockCard({ second_line: "JOHN DOE" });
      expect(getCardName(card)).toBe("JOHN DOE");
    });

    it("returns description when second_line is not available", () => {
      const card = createMockCard({ second_line: undefined, description: "My Card" });
      expect(getCardName(card)).toBe("My Card");
    });

    it("returns formatted last 4 digits when available", () => {
      const card = createMockCard({
        second_line: undefined,
        description: undefined,
        primary_account_number_four_digit: "1234",
      });
      expect(getCardName(card)).toBe("Card •••• 1234");
    });

    it("returns formatted product_type when available", () => {
      const card = createMockCard({
        second_line: undefined,
        description: undefined,
        primary_account_number_four_digit: undefined,
        product_type: "MASTERCARD_DEBIT",
      });
      expect(getCardName(card)).toBe("MASTERCARD DEBIT");
    });

    it("returns type as fallback", () => {
      const card = createMockCard({
        second_line: undefined,
        description: undefined,
        primary_account_number_four_digit: undefined,
        product_type: "NONE",
        type: "VISA",
      });
      expect(getCardName(card)).toBe("VISA");
    });

    it("returns Card as last resort", () => {
      const card = createMockCard({
        second_line: undefined,
        description: undefined,
        primary_account_number_four_digit: undefined,
        product_type: undefined,
        type: undefined,
      });
      expect(getCardName(card)).toBe("Card");
    });
  });

  describe("getExpiryColor", () => {
    beforeEach(() => {
      // Mock current date to 2024-06-15
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-15"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns Red for expired cards", () => {
      expect(getExpiryColor("2024-05-01")).toBe(Color.Red);
    });

    it("returns Red for cards expiring within 3 months", () => {
      expect(getExpiryColor("2024-08-01")).toBe(Color.Red);
    });

    it("returns Orange for cards expiring within 12 months", () => {
      expect(getExpiryColor("2025-01-01")).toBe(Color.Orange);
    });

    it("returns Green for cards expiring after 12 months", () => {
      expect(getExpiryColor("2026-01-01")).toBe(Color.Green);
    });
  });

  describe("formatExpiryDate", () => {
    it("formats date correctly", () => {
      expect(formatExpiryDate("2029-11-30")).toBe("Nov 29");
    });

    it("formats January correctly", () => {
      expect(formatExpiryDate("2025-01-15")).toBe("Jan 25");
    });

    it("formats December correctly", () => {
      expect(formatExpiryDate("2027-12-01")).toBe("Dec 27");
    });
  });

  describe("isCardActive", () => {
    it("returns true for ACTIVE status", () => {
      const card = createMockCard({ status: "ACTIVE", sub_status: undefined });
      expect(isCardActive(card)).toBe(true);
    });

    it("returns true for NONE status", () => {
      const card = createMockCard({ status: "NONE", sub_status: undefined });
      expect(isCardActive(card)).toBe(true);
    });

    it("returns false for DEACTIVATED status", () => {
      const card = createMockCard({ status: "DEACTIVATED", sub_status: undefined });
      expect(isCardActive(card)).toBe(false);
    });

    it("returns false for BLOCKED status", () => {
      const card = createMockCard({ status: "BLOCKED", sub_status: undefined });
      expect(isCardActive(card)).toBe(false);
    });

    it("checks sub_status first", () => {
      const card = createMockCard({ status: "ACTIVE", sub_status: "BLOCKED" });
      expect(isCardActive(card)).toBe(false);
    });
  });

  describe("isCardExpired", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-15"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns false when no expiry date", () => {
      const card = createMockCard({ expiry_date: undefined });
      expect(isCardExpired(card)).toBe(false);
    });

    it("returns true for expired cards", () => {
      const card = createMockCard({ expiry_date: "2024-05-01" });
      expect(isCardExpired(card)).toBe(true);
    });

    it("returns false for non-expired cards", () => {
      const card = createMockCard({ expiry_date: "2025-12-31" });
      expect(isCardExpired(card)).toBe(false);
    });
  });

  describe("getCardCategoryLabel", () => {
    it("returns correct label for CardDebit", () => {
      expect(getCardCategoryLabel("CardDebit")).toBe("Physical Cards");
    });

    it("returns correct label for CardCredit", () => {
      expect(getCardCategoryLabel("CardCredit")).toBe("Virtual Cards");
    });

    it("returns correct label for CardPrepaid", () => {
      expect(getCardCategoryLabel("CardPrepaid")).toBe("Prepaid Cards");
    });

    it("returns correct label for CardMaestro", () => {
      expect(getCardCategoryLabel("CardMaestro")).toBe("Maestro Cards");
    });

    it("returns Other Cards for unknown category", () => {
      expect(getCardCategoryLabel("UnknownCategory" as CardCategory)).toBe("Other Cards");
    });
  });

  describe("groupCardsByCategory", () => {
    it("groups cards by category", () => {
      const cards = [
        createMockCard({ id: 1, cardCategory: "CardDebit" }),
        createMockCard({ id: 2, cardCategory: "CardCredit" }),
        createMockCard({ id: 3, cardCategory: "CardDebit" }),
      ];

      const groups = groupCardsByCategory(cards);

      expect(groups.get("CardDebit")).toHaveLength(2);
      expect(groups.get("CardCredit")).toHaveLength(1);
    });

    it("removes empty groups", () => {
      const cards = [createMockCard({ id: 1, cardCategory: "CardDebit" })];

      const groups = groupCardsByCategory(cards);

      expect(groups.has("CardDebit")).toBe(true);
      expect(groups.has("CardCredit")).toBe(false);
      expect(groups.has("CardPrepaid")).toBe(false);
    });

    it("puts unknown categories in CardCredit", () => {
      const cards = [createMockCard({ id: 1, cardCategory: "UnknownCategory" as CardCategory })];

      const groups = groupCardsByCategory(cards);

      expect(groups.get("CardCredit")).toHaveLength(1);
    });

    it("returns empty map for empty input", () => {
      const groups = groupCardsByCategory([]);
      expect(groups.size).toBe(0);
    });
  });

  describe("COUNTRY_OPTIONS", () => {
    it("contains expected countries", () => {
      expect(COUNTRY_OPTIONS.find((c) => c.code === "NL")?.name).toBe("Netherlands");
      expect(COUNTRY_OPTIONS.find((c) => c.code === "US")?.name).toBe("United States");
      expect(COUNTRY_OPTIONS.find((c) => c.code === "GB")?.name).toBe("United Kingdom");
    });

    it("has code and name for each option", () => {
      for (const option of COUNTRY_OPTIONS) {
        expect(option.code).toBeTruthy();
        expect(option.name).toBeTruthy();
        expect(option.code.length).toBe(2);
      }
    });
  });
});
