/**
 * Tests for cards API endpoints.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCards,
  updateCard,
  generateCardCvc2,
  getCardCvc2,
  getMastercardActions,
  getMastercardActionsForCard,
  getMastercardAction,
} from "./cards";
import { get, post, put, type RequestOptions } from "../client";

vi.mock("../client");
vi.mock("../../lib/logger");

// Mock options for testing - actual values don't matter since client is mocked
const mockRequestOptions = {
  authToken: "test-session-token",
} as RequestOptions;

// Helper to create mock card data
const createMockCardData = (id: number, type: string = "MASTERCARD", overrides = {}) => ({
  id,
  created: "2024-01-01T00:00:00.000Z",
  updated: "2024-01-01T00:00:00.000Z",
  public_uuid: `card-uuid-${id}`,
  type,
  sub_type: "VIRTUAL",
  second_line: "TEST USER",
  name_on_card: "TEST USER",
  status: "ACTIVE",
  order_status: "ACCEPTED_FOR_PRODUCTION",
  expiry_date: "2027-01-31",
  limit: [],
  country_permission: [],
  monetary_account_id_fallback: 1,
  pin_code_assignment: [],
  primary_account_numbers: [],
  ...overrides,
});

// Helper to create mock mastercard action data
const createMockMastercardAction = (id: number, cardId: number, overrides = {}) => ({
  id,
  created: "2024-01-01T12:00:00.000Z",
  updated: "2024-01-01T12:00:00.000Z",
  monetary_account_id: 1,
  card_id: cardId,
  amount_local: { value: "-25.00", currency: "EUR" },
  amount_billing: { value: "-25.00", currency: "EUR" },
  amount_original_local: { value: "-25.00", currency: "EUR" },
  amount_fee: { value: "0.00", currency: "EUR" },
  decision: "APPROVED",
  decision_description: "Approved",
  city: "Amsterdam",
  counterparty_alias: { type: "MERCHANT", value: "Test Store", name: "Test Store" },
  description: "Test purchase",
  authorisation_status: "AUTHORISED",
  authorisation_type: "NORMAL",
  ...overrides,
});

describe("cards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCards", () => {
    it("fetches and parses cards with different categories", async () => {
      vi.mocked(get).mockResolvedValue({
        Response: [{ CardDebit: createMockCardData(1, "MASTERCARD") }, { CardCredit: createMockCardData(2, "VISA") }],
      });

      const cards = await getCards("user123", mockRequestOptions);

      expect(get).toHaveBeenCalledWith("/user/user123/card?count=200", mockRequestOptions);
      expect(cards).toHaveLength(2);
      expect(cards[0]!.cardCategory).toBe("CardDebit");
      expect(cards[1]!.cardCategory).toBe("CardCredit");
    });

    it("handles empty response", async () => {
      vi.mocked(get).mockResolvedValue({ Response: [] });

      const cards = await getCards("user123", mockRequestOptions);

      expect(cards).toHaveLength(0);
    });

    it("handles prepaid cards", async () => {
      vi.mocked(get).mockResolvedValue({
        Response: [{ CardPrepaid: createMockCardData(3, "MASTERCARD") }],
      });

      const cards = await getCards("user123", mockRequestOptions);

      expect(cards).toHaveLength(1);
      expect(cards[0]!.cardCategory).toBe("CardPrepaid");
    });

    it("handles maestro cards", async () => {
      vi.mocked(get).mockResolvedValue({
        Response: [{ CardMaestro: createMockCardData(4, "MAESTRO") }],
      });

      const cards = await getCards("user123", mockRequestOptions);

      expect(cards).toHaveLength(1);
      expect(cards[0]!.cardCategory).toBe("CardMaestro");
    });

    it("defaults to CardCredit for unknown card types", async () => {
      vi.mocked(get).mockResolvedValue({
        Response: [{ SomeUnknownCardType: createMockCardData(5, "UNKNOWN") }],
      });

      const cards = await getCards("user123", mockRequestOptions);

      expect(cards).toHaveLength(1);
      expect(cards[0]!.cardCategory).toBe("CardCredit");
    });
  });

  describe("updateCard", () => {
    it("updates card status", async () => {
      vi.mocked(put).mockResolvedValue({ Response: [] });

      await updateCard("user123", 1, { status: "DEACTIVATED" }, mockRequestOptions);

      expect(put).toHaveBeenCalledWith(
        "/user/user123/card/1",
        { status: "DEACTIVATED" },
        { ...mockRequestOptions, sign: true },
      );
    });

    it("updates card limits", async () => {
      vi.mocked(put).mockResolvedValue({ Response: [] });

      const update = {
        card_limit: [{ daily_limit: "500.00", currency: "EUR" }],
      };

      await updateCard("user123", 1, update, mockRequestOptions);

      expect(put).toHaveBeenCalledWith("/user/user123/card/1", update, { ...mockRequestOptions, sign: true });
    });
  });

  describe("generateCardCvc2", () => {
    it("generates CVC2 and returns it", async () => {
      vi.mocked(post).mockResolvedValue({
        Response: [
          {
            CardGeneratedCvc2: {
              id: 123,
              created: "2024-01-01T12:00:00.000Z",
              updated: "2024-01-01T12:00:00.000Z",
              cvc2: "456",
              expiry_time: "2024-01-01T12:05:00.000Z",
            },
          },
        ],
      });

      const cvc2 = await generateCardCvc2("user123", 1, mockRequestOptions);

      expect(post).toHaveBeenCalledWith(
        "/user/user123/card/1/generated-cvc2",
        {},
        { ...mockRequestOptions, sign: true },
      );
      expect(cvc2.cvc2).toBe("456");
    });

    it("throws when no CVC2 in response", async () => {
      vi.mocked(post).mockResolvedValue({ Response: [] });

      await expect(generateCardCvc2("user123", 1, mockRequestOptions)).rejects.toThrow("No CVC2 in response");
    });
  });

  describe("getCardCvc2", () => {
    it("fetches CVC2 codes", async () => {
      vi.mocked(get).mockResolvedValue({
        Response: [
          {
            CardGeneratedCvc2: {
              id: 1,
              created: "2024-01-01T12:00:00.000Z",
              updated: "2024-01-01T12:00:00.000Z",
              cvc2: "123",
              expiry_time: "2024-01-01T12:05:00.000Z",
            },
          },
        ],
      });

      const cvc2List = await getCardCvc2("user123", 1, mockRequestOptions);

      expect(get).toHaveBeenCalledWith("/user/user123/card/1/generated-cvc2", mockRequestOptions);
      expect(cvc2List).toHaveLength(1);
    });
  });

  describe("getMastercardActions", () => {
    it("fetches mastercard actions with pagination", async () => {
      vi.mocked(get).mockResolvedValue({
        Response: [
          { MasterCardAction: createMockMastercardAction(1, 100) },
          { MasterCardAction: createMockMastercardAction(2, 100) },
        ],
        Pagination: { older_url: "/older" },
      } as { Response: unknown[]; Pagination?: unknown });

      const result = await getMastercardActions("user123", 1, mockRequestOptions);

      expect(get).toHaveBeenCalledWith(
        "/user/user123/monetary-account/1/mastercard-action?count=50",
        mockRequestOptions,
      );
      expect(result.items).toHaveLength(2);
      expect(result.pagination).not.toBeNull();
    });

    it("handles custom pagination options", async () => {
      vi.mocked(get).mockResolvedValue({ Response: [] });

      await getMastercardActions("user123", 1, mockRequestOptions, { count: 25, olderCursor: "50" });

      expect(get).toHaveBeenCalledWith(
        "/user/user123/monetary-account/1/mastercard-action?count=25&older_id=50",
        mockRequestOptions,
      );
    });
  });

  describe("getMastercardActionsForCard", () => {
    it("fetches and filters actions by card ID", async () => {
      vi.mocked(get).mockResolvedValue({
        Response: [
          { MasterCardAction: createMockMastercardAction(1, 100) },
          { MasterCardAction: createMockMastercardAction(2, 200) },
          { MasterCardAction: createMockMastercardAction(3, 100) },
        ],
      });

      const result = await getMastercardActionsForCard("user123", 1, 100, mockRequestOptions);

      expect(result.items).toHaveLength(2);
      expect(result.items.every((a) => a.card_id === 100)).toBe(true);
    });

    it("returns empty when no matching card ID", async () => {
      vi.mocked(get).mockResolvedValue({
        Response: [{ MasterCardAction: createMockMastercardAction(1, 100) }],
      });

      const result = await getMastercardActionsForCard("user123", 1, 999, mockRequestOptions);

      expect(result.items).toHaveLength(0);
    });
  });

  describe("getMastercardAction", () => {
    it("fetches a single mastercard action", async () => {
      vi.mocked(get).mockResolvedValue({
        Response: [{ MasterCardAction: createMockMastercardAction(123, 100) }],
      });

      const action = await getMastercardAction("user123", 1, 123, mockRequestOptions);

      expect(get).toHaveBeenCalledWith("/user/user123/monetary-account/1/mastercard-action/123", mockRequestOptions);
      expect(action).not.toBeNull();
      expect(action?.id).toBe(123);
    });

    it("returns null when action not found", async () => {
      vi.mocked(get).mockResolvedValue({ Response: [] });

      const action = await getMastercardAction("user123", 1, 999, mockRequestOptions);

      expect(action).toBeNull();
    });
  });
});
