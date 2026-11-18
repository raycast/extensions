/**
 * Tests for constants utilities.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getLocale,
  DEFAULT_CURRENCY,
  REQUEST_STATUS,
  REQUEST_RESPONSE_STATUS,
  SCHEDULED_PAYMENT_STATUS,
  BUNQME_STATUS,
  CARD_STATUS,
  CARD_LIMIT_TYPE,
  RECURRENCE_UNIT,
  STATEMENT_FORMAT,
  STATEMENT_STATUS,
  DRAFT_PAYMENT_STATUS,
  PAYMENT_BATCH_STATUS,
  INVOICE_STATUS,
  TRANSFERWISE_STATUS,
  NOTIFICATION_CATEGORY,
  EVENT_TYPE,
  ACCOUNT_TYPE,
  SHARE_INVITE_STATUS,
  WHITELIST_SDD_STATUS,
  MASTERCARD_ACTION_STATUS,
  BILLING_CONTRACT_STATUS,
  DEVICE_STATUS,
} from "./constants";
import { getPreferenceValues } from "@raycast/api";

vi.mock("@raycast/api", async () => {
  const actual = await vi.importActual("@raycast/api");
  return {
    ...actual,
    getPreferenceValues: vi.fn(() => ({
      apiKey: "test-api-key",
      environment: "sandbox",
      locale: undefined,
    })),
  };
});

describe("constants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getLocale", () => {
    it("returns user preference locale when set", () => {
      vi.mocked(getPreferenceValues).mockReturnValue({
        apiKey: "test",
        environment: "sandbox",
        locale: "en-US",
      });

      const locale = getLocale();
      expect(locale).toBe("en-US");
    });

    it("falls back to nl-NL when locale not set", () => {
      vi.mocked(getPreferenceValues).mockReturnValue({
        apiKey: "test",
        environment: "sandbox",
        locale: undefined,
      });

      const locale = getLocale();
      expect(locale).toBe("nl-NL");
    });

    it("falls back to nl-NL when locale is empty string", () => {
      vi.mocked(getPreferenceValues).mockReturnValue({
        apiKey: "test",
        environment: "sandbox",
        locale: "",
      });

      const locale = getLocale();
      expect(locale).toBe("nl-NL");
    });

    it("respects various locale formats", () => {
      vi.mocked(getPreferenceValues).mockReturnValue({
        apiKey: "test",
        environment: "sandbox",
        locale: "de-DE",
      });

      expect(getLocale()).toBe("de-DE");

      vi.mocked(getPreferenceValues).mockReturnValue({
        apiKey: "test",
        environment: "sandbox",
        locale: "fr-FR",
      });

      expect(getLocale()).toBe("fr-FR");
    });
  });

  describe("DEFAULT_CURRENCY", () => {
    it("is set to EUR", () => {
      expect(DEFAULT_CURRENCY).toBe("EUR");
    });
  });

  describe("REQUEST_STATUS", () => {
    it("has all expected status values", () => {
      expect(REQUEST_STATUS.PENDING).toBe("PENDING");
      expect(REQUEST_STATUS.ACCEPTED).toBe("ACCEPTED");
      expect(REQUEST_STATUS.REJECTED).toBe("REJECTED");
      expect(REQUEST_STATUS.REVOKED).toBe("REVOKED");
      expect(REQUEST_STATUS.EXPIRED).toBe("EXPIRED");
    });

    it("has exactly 5 status values", () => {
      expect(Object.keys(REQUEST_STATUS)).toHaveLength(5);
    });
  });

  describe("REQUEST_RESPONSE_STATUS", () => {
    it("has all expected status values", () => {
      expect(REQUEST_RESPONSE_STATUS.PENDING).toBe("PENDING");
      expect(REQUEST_RESPONSE_STATUS.ACCEPTED).toBe("ACCEPTED");
      expect(REQUEST_RESPONSE_STATUS.REJECTED).toBe("REJECTED");
    });

    it("has exactly 3 status values", () => {
      expect(Object.keys(REQUEST_RESPONSE_STATUS)).toHaveLength(3);
    });
  });

  describe("SCHEDULED_PAYMENT_STATUS", () => {
    it("has all expected status values", () => {
      expect(SCHEDULED_PAYMENT_STATUS.ACTIVE).toBe("ACTIVE");
      expect(SCHEDULED_PAYMENT_STATUS.FINISHED).toBe("FINISHED");
      expect(SCHEDULED_PAYMENT_STATUS.CANCELLED).toBe("CANCELLED");
    });

    it("has exactly 3 status values", () => {
      expect(Object.keys(SCHEDULED_PAYMENT_STATUS)).toHaveLength(3);
    });
  });

  describe("BUNQME_STATUS", () => {
    it("has all expected status values", () => {
      expect(BUNQME_STATUS.WAITING_FOR_PAYMENT).toBe("WAITING_FOR_PAYMENT");
      expect(BUNQME_STATUS.PAID).toBe("PAID");
      expect(BUNQME_STATUS.CANCELLED).toBe("CANCELLED");
      expect(BUNQME_STATUS.EXPIRED).toBe("EXPIRED");
    });

    it("has exactly 4 status values", () => {
      expect(Object.keys(BUNQME_STATUS)).toHaveLength(4);
    });
  });

  describe("CARD_STATUS", () => {
    it("has all expected status values", () => {
      expect(CARD_STATUS.ACTIVE).toBe("ACTIVE");
      expect(CARD_STATUS.DEACTIVATED).toBe("DEACTIVATED");
      expect(CARD_STATUS.LOST).toBe("LOST");
      expect(CARD_STATUS.STOLEN).toBe("STOLEN");
      expect(CARD_STATUS.CANCELLED).toBe("CANCELLED");
      expect(CARD_STATUS.BLOCKED).toBe("BLOCKED");
      expect(CARD_STATUS.NONE).toBe("NONE");
    });

    it("has exactly 7 status values", () => {
      expect(Object.keys(CARD_STATUS)).toHaveLength(7);
    });
  });

  describe("CARD_LIMIT_TYPE", () => {
    it("has all expected limit types", () => {
      expect(CARD_LIMIT_TYPE.CARD_LIMIT_ATM).toBe("CARD_LIMIT_ATM");
      expect(CARD_LIMIT_TYPE.CARD_LIMIT_CONTACTLESS).toBe("CARD_LIMIT_CONTACTLESS");
      expect(CARD_LIMIT_TYPE.CARD_LIMIT_POS_ICC).toBe("CARD_LIMIT_POS_ICC");
      expect(CARD_LIMIT_TYPE.CARD_LIMIT_E_COMMERCE).toBe("CARD_LIMIT_E_COMMERCE");
      expect(CARD_LIMIT_TYPE.CARD_LIMIT_DIPPING).toBe("CARD_LIMIT_DIPPING");
    });

    it("has exactly 5 limit types", () => {
      expect(Object.keys(CARD_LIMIT_TYPE)).toHaveLength(5);
    });
  });

  describe("RECURRENCE_UNIT", () => {
    it("has all expected recurrence values", () => {
      expect(RECURRENCE_UNIT.ONCE).toBe("ONCE");
      expect(RECURRENCE_UNIT.DAILY).toBe("DAILY");
      expect(RECURRENCE_UNIT.WEEKLY).toBe("WEEKLY");
      expect(RECURRENCE_UNIT.MONTHLY).toBe("MONTHLY");
      expect(RECURRENCE_UNIT.YEARLY).toBe("YEARLY");
    });

    it("has exactly 5 recurrence values", () => {
      expect(Object.keys(RECURRENCE_UNIT)).toHaveLength(5);
    });
  });

  describe("STATEMENT_FORMAT", () => {
    it("has all expected format values", () => {
      expect(STATEMENT_FORMAT.PDF).toBe("PDF");
      expect(STATEMENT_FORMAT.CSV).toBe("CSV");
      expect(STATEMENT_FORMAT.MT940).toBe("MT940");
    });

    it("has exactly 3 format values", () => {
      expect(Object.keys(STATEMENT_FORMAT)).toHaveLength(3);
    });
  });

  describe("STATEMENT_STATUS", () => {
    it("has all expected status values", () => {
      expect(STATEMENT_STATUS.PENDING).toBe("PENDING");
      expect(STATEMENT_STATUS.DONE).toBe("DONE");
      expect(STATEMENT_STATUS.FAILED).toBe("FAILED");
    });
  });

  describe("DRAFT_PAYMENT_STATUS", () => {
    it("has all expected status values", () => {
      expect(DRAFT_PAYMENT_STATUS.PENDING).toBe("PENDING");
      expect(DRAFT_PAYMENT_STATUS.ACCEPTED).toBe("ACCEPTED");
      expect(DRAFT_PAYMENT_STATUS.REJECTED).toBe("REJECTED");
      expect(DRAFT_PAYMENT_STATUS.CANCELLED).toBe("CANCELLED");
    });
  });

  describe("PAYMENT_BATCH_STATUS", () => {
    it("has all expected status values", () => {
      expect(PAYMENT_BATCH_STATUS.ACTIVE).toBe("ACTIVE");
      expect(PAYMENT_BATCH_STATUS.PROCESSING).toBe("PROCESSING");
      expect(PAYMENT_BATCH_STATUS.COMPLETED).toBe("COMPLETED");
      expect(PAYMENT_BATCH_STATUS.FAILED).toBe("FAILED");
    });
  });

  describe("INVOICE_STATUS", () => {
    it("has all expected status values", () => {
      expect(INVOICE_STATUS.OPEN).toBe("OPEN");
      expect(INVOICE_STATUS.PAID).toBe("PAID");
      expect(INVOICE_STATUS.OVERDUE).toBe("OVERDUE");
      expect(INVOICE_STATUS.VOIDED).toBe("VOIDED");
    });
  });

  describe("TRANSFERWISE_STATUS", () => {
    it("has all expected status values", () => {
      expect(TRANSFERWISE_STATUS.PENDING).toBe("PENDING");
      expect(TRANSFERWISE_STATUS.PROCESSING).toBe("PROCESSING");
      expect(TRANSFERWISE_STATUS.OUTGOING_PAYMENT_SENT).toBe("OUTGOING_PAYMENT_SENT");
      expect(TRANSFERWISE_STATUS.FUNDS_CONVERTED).toBe("FUNDS_CONVERTED");
      expect(TRANSFERWISE_STATUS.COMPLETED).toBe("COMPLETED");
      expect(TRANSFERWISE_STATUS.CANCELLED).toBe("CANCELLED");
      expect(TRANSFERWISE_STATUS.FUNDS_REFUNDED).toBe("FUNDS_REFUNDED");
    });

    it("has exactly 7 status values", () => {
      expect(Object.keys(TRANSFERWISE_STATUS)).toHaveLength(7);
    });
  });

  describe("NOTIFICATION_CATEGORY", () => {
    it("has common notification categories", () => {
      expect(NOTIFICATION_CATEGORY.BILLING).toBe("BILLING");
      expect(NOTIFICATION_CATEGORY.BUNQME_TAB).toBe("BUNQME_TAB");
      expect(NOTIFICATION_CATEGORY.CARD_TRANSACTION_FAILED).toBe("CARD_TRANSACTION_FAILED");
      expect(NOTIFICATION_CATEGORY.CARD_TRANSACTION_SUCCESSFUL).toBe("CARD_TRANSACTION_SUCCESSFUL");
      expect(NOTIFICATION_CATEGORY.MUTATION).toBe("MUTATION");
      expect(NOTIFICATION_CATEGORY.PAYMENT).toBe("PAYMENT");
      expect(NOTIFICATION_CATEGORY.REQUEST).toBe("REQUEST");
      expect(NOTIFICATION_CATEGORY.SHARE).toBe("SHARE");
    });

    it("has exactly 20 categories", () => {
      expect(Object.keys(NOTIFICATION_CATEGORY)).toHaveLength(20);
    });
  });

  describe("EVENT_TYPE", () => {
    it("has all expected event types", () => {
      expect(EVENT_TYPE.PAYMENT).toBe("Payment");
      expect(EVENT_TYPE.BUNQME_TAB).toBe("BunqMeTab");
      expect(EVENT_TYPE.REQUEST_INQUIRY).toBe("RequestInquiry");
      expect(EVENT_TYPE.REQUEST_RESPONSE).toBe("RequestResponse");
      expect(EVENT_TYPE.SCHEDULE_PAYMENT).toBe("SchedulePayment");
      expect(EVENT_TYPE.CARD).toBe("Card");
      expect(EVENT_TYPE.SHARE_INVITE_BANK_INQUIRY).toBe("ShareInviteBankInquiry");
    });

    it("has exactly 7 event types", () => {
      expect(Object.keys(EVENT_TYPE)).toHaveLength(7);
    });
  });

  describe("ACCOUNT_TYPE", () => {
    it("has all expected account types", () => {
      expect(ACCOUNT_TYPE.MONETARY_ACCOUNT_BANK).toBe("MonetaryAccountBank");
      expect(ACCOUNT_TYPE.MONETARY_ACCOUNT_JOINT).toBe("MonetaryAccountJoint");
      expect(ACCOUNT_TYPE.MONETARY_ACCOUNT_SAVINGS).toBe("MonetaryAccountSavings");
      expect(ACCOUNT_TYPE.MONETARY_ACCOUNT_EXTERNAL).toBe("MonetaryAccountExternal");
    });

    it("has exactly 4 account types", () => {
      expect(Object.keys(ACCOUNT_TYPE)).toHaveLength(4);
    });
  });

  describe("SHARE_INVITE_STATUS", () => {
    it("has all expected status values", () => {
      expect(SHARE_INVITE_STATUS.PENDING).toBe("PENDING");
      expect(SHARE_INVITE_STATUS.ACCEPTED).toBe("ACCEPTED");
      expect(SHARE_INVITE_STATUS.REJECTED).toBe("REJECTED");
      expect(SHARE_INVITE_STATUS.CANCELLED).toBe("CANCELLED");
      expect(SHARE_INVITE_STATUS.REVOKED).toBe("REVOKED");
    });
  });

  describe("WHITELIST_SDD_STATUS", () => {
    it("has all expected status values", () => {
      expect(WHITELIST_SDD_STATUS.ACTIVE).toBe("ACTIVE");
      expect(WHITELIST_SDD_STATUS.PENDING).toBe("PENDING");
      expect(WHITELIST_SDD_STATUS.CANCELLED).toBe("CANCELLED");
      expect(WHITELIST_SDD_STATUS.REJECTED).toBe("REJECTED");
    });
  });

  describe("MASTERCARD_ACTION_STATUS", () => {
    it("has all expected status values", () => {
      expect(MASTERCARD_ACTION_STATUS.APPROVED).toBe("APPROVED");
      expect(MASTERCARD_ACTION_STATUS.DECLINED).toBe("DECLINED");
      expect(MASTERCARD_ACTION_STATUS.PENDING).toBe("PENDING");
      expect(MASTERCARD_ACTION_STATUS.REVERSED).toBe("REVERSED");
    });
  });

  describe("BILLING_CONTRACT_STATUS", () => {
    it("has all expected status values", () => {
      expect(BILLING_CONTRACT_STATUS.ACTIVE).toBe("ACTIVE");
      expect(BILLING_CONTRACT_STATUS.PENDING).toBe("PENDING");
      expect(BILLING_CONTRACT_STATUS.CANCELLED).toBe("CANCELLED");
      expect(BILLING_CONTRACT_STATUS.EXPIRED).toBe("EXPIRED");
    });
  });

  describe("DEVICE_STATUS", () => {
    it("has all expected status values", () => {
      expect(DEVICE_STATUS.ACTIVE).toBe("ACTIVE");
      expect(DEVICE_STATUS.BLOCKED).toBe("BLOCKED");
    });

    it("has exactly 2 status values", () => {
      expect(Object.keys(DEVICE_STATUS)).toHaveLength(2);
    });
  });
});
