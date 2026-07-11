/**
 * Tests for payments API endpoints.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getPayments,
  getAllPayments,
  getPayment,
  createPayment,
  createPaymentBatch,
  getPaymentBatches,
  createDraftPayment,
  getDraftPayments,
  getDraftPayment,
  updateDraftPayment,
  getScheduledPayments,
  createScheduledPayment,
  cancelScheduledPayment,
  addPaymentNote,
  getPaymentNotes,
  deletePaymentNote,
  getPaymentAttachments,
  uploadAttachment,
  getPaymentCounterpartyName,
  isIncomingPayment,
  type Payment,
} from "./payments";
import { get, post, put, del, type RequestOptions } from "../client";

vi.mock("../client");
vi.mock("../../lib/logger");

// Mock options for testing - actual values don't matter since client is mocked
const mockRequestOptions = {
  authToken: "test-session-token",
} as RequestOptions;

const createMockPayment = (overrides: Partial<Payment> = {}): Payment => ({
  id: 1,
  created: "2024-01-01T12:00:00.000Z",
  updated: "2024-01-01T12:00:00.000Z",
  monetary_account_id: 1,
  amount: { value: "50.00", currency: "EUR" },
  description: "Test payment",
  type: "BUNQ",
  sub_type: "PAYMENT",
  alias: { type: "IBAN", value: "NL00BUNQ0000000001", name: "Sender" },
  counterparty_alias: { type: "IBAN", value: "NL00BUNQ0000000002", name: "Recipient" },
  ...overrides,
});

describe("payments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPayments", () => {
    it("fetches payments with pagination", async () => {
      vi.mocked(get).mockResolvedValue({
        Response: [{ Payment: createMockPayment({ id: 1 }) }, { Payment: createMockPayment({ id: 2 }) }],
      } as { Response: unknown[]; Pagination?: unknown });

      const result = await getPayments("user123", 1, mockRequestOptions);

      expect(get).toHaveBeenCalledWith("/user/user123/monetary-account/1/payment?count=50", mockRequestOptions);
      expect(result.items).toHaveLength(2);
    });

    it("fetches payments with custom pagination options", async () => {
      vi.mocked(get).mockResolvedValue({ Response: [] });

      await getPayments("user123", 1, mockRequestOptions, { count: 100, olderCursor: "50" });

      expect(get).toHaveBeenCalledWith(
        "/user/user123/monetary-account/1/payment?count=100&older_id=50",
        mockRequestOptions,
      );
    });

    it("fetches payments with newer cursor", async () => {
      vi.mocked(get).mockResolvedValue({ Response: [] });

      await getPayments("user123", 1, mockRequestOptions, { newerCursor: "100" });

      expect(get).toHaveBeenCalledWith("/user/user123/monetary-account/1/payment?newer_id=100", mockRequestOptions);
    });

    it("handles empty response", async () => {
      vi.mocked(get).mockResolvedValue({ Response: [] });

      const result = await getPayments("user123", 1, mockRequestOptions);

      expect(result.items).toHaveLength(0);
      expect(result.pagination).toBeNull();
    });
  });

  describe("getAllPayments", () => {
    it("fetches all payments with high count", async () => {
      vi.mocked(get).mockResolvedValue({
        Response: [{ Payment: createMockPayment() }],
      });

      const payments = await getAllPayments("user123", 1, mockRequestOptions);

      expect(get).toHaveBeenCalledWith("/user/user123/monetary-account/1/payment?count=200", mockRequestOptions);
      expect(payments).toHaveLength(1);
    });
  });

  describe("getPayment", () => {
    it("fetches a single payment", async () => {
      vi.mocked(get).mockResolvedValue({
        Response: [{ Payment: createMockPayment({ id: 123 }) }],
      });

      const payment = await getPayment("user123", 1, 123, mockRequestOptions);

      expect(get).toHaveBeenCalledWith("/user/user123/monetary-account/1/payment/123", mockRequestOptions);
      expect(payment).not.toBeNull();
      expect(payment?.id).toBe(123);
    });

    it("returns null when payment not found", async () => {
      vi.mocked(get).mockResolvedValue({ Response: [] });

      const payment = await getPayment("user123", 1, 999, mockRequestOptions);

      expect(payment).toBeNull();
    });
  });

  describe("createPayment", () => {
    it("creates a payment and returns ID", async () => {
      vi.mocked(post).mockResolvedValue({
        Response: [{ Id: { id: 456 } }],
      });

      const paymentRequest = {
        amount: { value: "100.00", currency: "EUR" },
        counterparty_alias: { type: "IBAN" as const, value: "NL00BUNQ0000000002" },
        description: "Test payment",
      };

      const id = await createPayment("user123", 1, paymentRequest, mockRequestOptions);

      expect(post).toHaveBeenCalledWith("/user/user123/monetary-account/1/payment", paymentRequest, {
        ...mockRequestOptions,
        sign: true,
      });
      expect(id).toBe(456);
    });

    it("throws when no ID returned", async () => {
      vi.mocked(post).mockResolvedValue({ Response: [] });

      const paymentRequest = {
        amount: { value: "100.00", currency: "EUR" },
        counterparty_alias: { type: "IBAN" as const, value: "NL00BUNQ0000000002" },
        description: "Test payment",
      };

      await expect(createPayment("user123", 1, paymentRequest, mockRequestOptions)).rejects.toThrow(
        "No payment ID received",
      );
    });
  });

  describe("createPaymentBatch", () => {
    it("creates a payment batch", async () => {
      vi.mocked(post).mockResolvedValue({
        Response: [{ Id: { id: 789 } }],
      });

      const batch = {
        payments: [
          {
            amount: { value: "50.00", currency: "EUR" },
            counterparty_alias: { type: "IBAN" as const, value: "NL00BUNQ0000000002" },
            description: "Payment 1",
          },
          {
            amount: { value: "75.00", currency: "EUR" },
            counterparty_alias: { type: "IBAN" as const, value: "NL00BUNQ0000000003" },
            description: "Payment 2",
          },
        ],
      };

      const id = await createPaymentBatch("user123", 1, batch, mockRequestOptions);

      expect(post).toHaveBeenCalledWith("/user/user123/monetary-account/1/payment-batch", batch, {
        ...mockRequestOptions,
        sign: true,
      });
      expect(id).toBe(789);
    });
  });

  describe("getPaymentBatches", () => {
    it("fetches payment batches", async () => {
      vi.mocked(get).mockResolvedValue({
        Response: [
          { PaymentBatch: { id: 1, created: "2024-01-01T12:00:00.000Z", updated: "2024-01-01T12:00:00.000Z" } },
          { PaymentBatch: { id: 2, created: "2024-01-02T12:00:00.000Z", updated: "2024-01-02T12:00:00.000Z" } },
        ],
      });

      const batches = await getPaymentBatches("user123", 1, mockRequestOptions);

      expect(get).toHaveBeenCalledWith("/user/user123/monetary-account/1/payment-batch", mockRequestOptions);
      expect(batches).toHaveLength(2);
    });
  });

  describe("createDraftPayment", () => {
    it("creates a draft payment", async () => {
      vi.mocked(post).mockResolvedValue({
        Response: [{ Id: { id: 111 } }],
      });

      const draft = {
        entries: [
          {
            amount: { value: "200.00", currency: "EUR" },
            counterparty_alias: { type: "IBAN" as const, value: "NL00BUNQ0000000002" },
            description: "Draft payment",
          },
        ],
        number_of_required_accepts: 1,
      };

      const id = await createDraftPayment("user123", 1, draft, mockRequestOptions);

      expect(post).toHaveBeenCalledWith("/user/user123/monetary-account/1/draft-payment", draft, {
        ...mockRequestOptions,
        sign: true,
      });
      expect(id).toBe(111);
    });
  });

  describe("getDraftPayments", () => {
    it("fetches draft payments", async () => {
      vi.mocked(get).mockResolvedValue({
        Response: [
          {
            DraftPayment: {
              id: 1,
              created: "2024-01-01T12:00:00.000Z",
              updated: "2024-01-01T12:00:00.000Z",
              status: "PENDING",
              monetary_account_id: 1,
              entries: [
                {
                  amount: { value: "50.00", currency: "EUR" },
                  counterparty_alias: { type: "IBAN", value: "NL00BUNQ0000000002" },
                  description: "Test draft",
                },
              ],
            },
          },
        ],
      });

      const drafts = await getDraftPayments("user123", 1, mockRequestOptions);

      expect(get).toHaveBeenCalledWith("/user/user123/monetary-account/1/draft-payment", mockRequestOptions);
      expect(drafts).toHaveLength(1);
    });
  });

  describe("getDraftPayment", () => {
    it("fetches a single draft payment", async () => {
      vi.mocked(get).mockResolvedValue({
        Response: [
          {
            DraftPayment: {
              id: 222,
              created: "2024-01-01T12:00:00.000Z",
              updated: "2024-01-01T12:00:00.000Z",
              status: "PENDING",
              monetary_account_id: 1,
              entries: [
                {
                  amount: { value: "100.00", currency: "EUR" },
                  counterparty_alias: { type: "IBAN", value: "NL00BUNQ0000000002" },
                  description: "Test draft",
                },
              ],
            },
          },
        ],
      });

      const draft = await getDraftPayment("user123", 1, 222, mockRequestOptions);

      expect(get).toHaveBeenCalledWith("/user/user123/monetary-account/1/draft-payment/222", mockRequestOptions);
      expect(draft).not.toBeNull();
      expect(draft?.id).toBe(222);
    });

    it("returns null when draft not found", async () => {
      vi.mocked(get).mockResolvedValue({ Response: [] });

      const draft = await getDraftPayment("user123", 1, 999, mockRequestOptions);

      expect(draft).toBeNull();
    });
  });

  describe("updateDraftPayment", () => {
    it("updates a draft payment", async () => {
      vi.mocked(put).mockResolvedValue({ Response: [] });

      await updateDraftPayment("user123", 1, 333, { status: "CANCELLED" }, mockRequestOptions);

      expect(put).toHaveBeenCalledWith(
        "/user/user123/monetary-account/1/draft-payment/333",
        { status: "CANCELLED" },
        { ...mockRequestOptions, sign: true },
      );
    });
  });

  describe("getScheduledPayments", () => {
    it("fetches scheduled payments", async () => {
      vi.mocked(get).mockResolvedValue({
        Response: [
          {
            ScheduledPayment: {
              id: 1,
              created: "2024-01-01T12:00:00.000Z",
              updated: "2024-01-01T12:00:00.000Z",
              status: "ACTIVE",
              payment: {
                amount: { value: "100.00", currency: "EUR" },
                counterparty_alias: { type: "IBAN", value: "NL00BUNQ0000000002" },
                description: "Monthly rent",
              },
              schedule: {
                time_start: "2024-02-01T00:00:00.000Z",
                recurrence_unit: "MONTHLY",
                recurrence_size: 1,
              },
            },
          },
          {
            ScheduledPayment: {
              id: 2,
              created: "2024-01-02T12:00:00.000Z",
              updated: "2024-01-02T12:00:00.000Z",
              status: "FINISHED",
              payment: {
                amount: { value: "50.00", currency: "EUR" },
                counterparty_alias: { type: "IBAN", value: "NL00BUNQ0000000003" },
                description: "One-time payment",
              },
              schedule: {
                time_start: "2024-01-15T00:00:00.000Z",
                recurrence_unit: "ONCE",
                recurrence_size: 1,
              },
            },
          },
        ],
      });

      const scheduled = await getScheduledPayments("user123", 1, mockRequestOptions);

      expect(get).toHaveBeenCalledWith("/user/user123/monetary-account/1/schedule-payment", mockRequestOptions);
      expect(scheduled).toHaveLength(2);
    });
  });

  describe("createScheduledPayment", () => {
    it("creates a scheduled payment", async () => {
      vi.mocked(post).mockResolvedValue({
        Response: [{ Id: { id: 444 } }],
      });

      const scheduledPayment = {
        payment: {
          amount: { value: "100.00", currency: "EUR" },
          counterparty_alias: { type: "IBAN" as const, value: "NL00BUNQ0000000002" },
          description: "Monthly rent",
        },
        schedule: {
          time_start: "2024-02-01T00:00:00.000Z",
          recurrence_unit: "MONTHLY" as const,
          recurrence_size: 1,
        },
      };

      const id = await createScheduledPayment("user123", 1, scheduledPayment, mockRequestOptions);

      expect(post).toHaveBeenCalledWith("/user/user123/monetary-account/1/schedule-payment", scheduledPayment, {
        ...mockRequestOptions,
        sign: true,
      });
      expect(id).toBe(444);
    });
  });

  describe("cancelScheduledPayment", () => {
    it("cancels a scheduled payment", async () => {
      vi.mocked(del).mockResolvedValue({ Response: [] });

      await cancelScheduledPayment("user123", 1, 555, mockRequestOptions);

      expect(del).toHaveBeenCalledWith("/user/user123/monetary-account/1/schedule-payment/555", mockRequestOptions);
    });
  });

  describe("addPaymentNote", () => {
    it("adds a note to a payment", async () => {
      vi.mocked(post).mockResolvedValue({
        Response: [{ Id: { id: 666 } }],
      });

      const id = await addPaymentNote("user123", 1, 100, "Test note content", mockRequestOptions);

      expect(post).toHaveBeenCalledWith(
        "/user/user123/monetary-account/1/payment/100/note-text",
        { content: "Test note content" },
        { ...mockRequestOptions, sign: true },
      );
      expect(id).toBe(666);
    });
  });

  describe("getPaymentNotes", () => {
    it("fetches payment notes", async () => {
      vi.mocked(get).mockResolvedValue({
        Response: [{ NoteText: { id: 1, content: "Note 1" } }, { NoteText: { id: 2, content: "Note 2" } }],
      });

      const notes = await getPaymentNotes("user123", 1, 100, mockRequestOptions);

      expect(get).toHaveBeenCalledWith("/user/user123/monetary-account/1/payment/100/note-text", mockRequestOptions);
      expect(notes).toHaveLength(2);
    });

    it("handles empty notes", async () => {
      vi.mocked(get).mockResolvedValue({ Response: [] });

      const notes = await getPaymentNotes("user123", 1, 100, mockRequestOptions);

      expect(notes).toHaveLength(0);
    });
  });

  describe("deletePaymentNote", () => {
    it("deletes a payment note", async () => {
      vi.mocked(del).mockResolvedValue({ Response: [] });

      await deletePaymentNote("user123", 1, 100, 777, mockRequestOptions);

      expect(del).toHaveBeenCalledWith(
        "/user/user123/monetary-account/1/payment/100/note-text/777",
        mockRequestOptions,
      );
    });
  });

  describe("getPaymentAttachments", () => {
    it("fetches payment attachments", async () => {
      vi.mocked(get).mockResolvedValue({
        Response: [{ NoteAttachment: { id: 1, description: "Attachment 1" } }],
      });

      const attachments = await getPaymentAttachments("user123", 1, 100, mockRequestOptions);

      expect(get).toHaveBeenCalledWith(
        "/user/user123/monetary-account/1/payment/100/note-attachment",
        mockRequestOptions,
      );
      expect(attachments).toHaveLength(1);
    });
  });

  describe("uploadAttachment", () => {
    it("uploads an attachment", async () => {
      vi.mocked(post).mockResolvedValue({
        Response: [{ Id: { id: 888 } }],
      });

      const file = {
        content: "base64content",
        contentType: "application/pdf",
        description: "Invoice",
      };

      const id = await uploadAttachment("user123", 1, file, mockRequestOptions);

      expect(post).toHaveBeenCalledWith(
        "/user/user123/monetary-account/1/attachment",
        { description: "Invoice" },
        { ...mockRequestOptions, sign: true },
      );
      expect(id).toBe(888);
    });
  });

  describe("getPaymentCounterpartyName", () => {
    it("returns display_name when available", () => {
      const payment = createMockPayment({
        counterparty_alias: {
          type: "IBAN",
          value: "NL00BUNQ0000000002",
          name: "Name",
          display_name: "Display Name",
        },
      });

      expect(getPaymentCounterpartyName(payment)).toBe("Display Name");
    });

    it("falls back to name when no display_name", () => {
      const payment = createMockPayment({
        counterparty_alias: {
          type: "IBAN",
          value: "NL00BUNQ0000000002",
          name: "Recipient Name",
        },
      });

      expect(getPaymentCounterpartyName(payment)).toBe("Recipient Name");
    });

    it("falls back to iban when no name", () => {
      const payment = createMockPayment({
        counterparty_alias: {
          type: "IBAN",
          value: "NL00BUNQ0000000002",
          iban: "NL00BUNQ0000000002",
        },
      });

      expect(getPaymentCounterpartyName(payment)).toBe("NL00BUNQ0000000002");
    });

    it("falls back to value when nothing else", () => {
      const payment = createMockPayment({
        counterparty_alias: {
          type: "PHONE_NUMBER",
          value: "+31612345678",
        },
      });

      expect(getPaymentCounterpartyName(payment)).toBe("+31612345678");
    });

    it("falls back to description when no counterparty info", () => {
      const payment = {
        ...createMockPayment({ description: "Payment description" }),
        counterparty_alias: null,
      } as unknown as Payment;

      expect(getPaymentCounterpartyName(payment)).toBe("Payment description");
    });

    it("returns Unknown when nothing available", () => {
      const payment = {
        ...createMockPayment({ description: "" }),
        counterparty_alias: null,
      } as unknown as Payment;

      expect(getPaymentCounterpartyName(payment)).toBe("Unknown");
    });
  });

  describe("isIncomingPayment", () => {
    it("returns true for positive amount", () => {
      const payment = createMockPayment({ amount: { value: "100.00", currency: "EUR" } });

      expect(isIncomingPayment(payment)).toBe(true);
    });

    it("returns false for negative amount", () => {
      const payment = createMockPayment({ amount: { value: "-50.00", currency: "EUR" } });

      expect(isIncomingPayment(payment)).toBe(false);
    });

    it("returns false for zero amount", () => {
      const payment = createMockPayment({ amount: { value: "0.00", currency: "EUR" } });

      expect(isIncomingPayment(payment)).toBe(false);
    });
  });
});
