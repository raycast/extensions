/**
 * Tests for icon-mapping utilities.
 */

import { describe, it, expect } from "vitest";
import { getEventIcon, getNotificationCategoryIcon } from "./icon-mapping";
import { Icon, Color } from "@raycast/api";

describe("icon-mapping", () => {
  describe("getEventIcon", () => {
    describe("payment events", () => {
      it("returns green down arrow for payment_received", () => {
        const icon = getEventIcon("payment_received");
        expect(icon.source).toBe(Icon.ArrowDown);
        expect(icon.tintColor).toBe(Color.Green);
      });

      it("returns green down arrow for incoming_payment", () => {
        const icon = getEventIcon("incoming_payment");
        expect(icon.source).toBe(Icon.ArrowDown);
        expect(icon.tintColor).toBe(Color.Green);
      });

      it("returns orange up arrow for payment_sent", () => {
        const icon = getEventIcon("payment_sent");
        expect(icon.source).toBe(Icon.ArrowUp);
        expect(icon.tintColor).toBe(Color.Orange);
      });

      it("returns orange up arrow for outgoing_payment", () => {
        const icon = getEventIcon("outgoing_payment");
        expect(icon.source).toBe(Icon.ArrowUp);
        expect(icon.tintColor).toBe(Color.Orange);
      });

      it("returns blue banknote for generic payment", () => {
        const icon = getEventIcon("payment");
        expect(icon.source).toBe(Icon.BankNote);
        expect(icon.tintColor).toBe(Color.Blue);
      });

      it("handles case insensitivity", () => {
        const icon = getEventIcon("PAYMENT_RECEIVED");
        expect(icon.source).toBe(Icon.ArrowDown);
        expect(icon.tintColor).toBe(Color.Green);
      });
    });

    describe("request events", () => {
      it("returns purple right arrow for request_inquiry", () => {
        const icon = getEventIcon("request_inquiry");
        expect(icon.source).toBe(Icon.ArrowRight);
        expect(icon.tintColor).toBe(Color.Purple);
      });

      it("returns magenta left arrow for request_response", () => {
        const icon = getEventIcon("request_response");
        expect(icon.source).toBe(Icon.ArrowLeft);
        expect(icon.tintColor).toBe(Color.Magenta);
      });

      it("returns purple envelope for generic request", () => {
        const icon = getEventIcon("request");
        expect(icon.source).toBe(Icon.Envelope);
        expect(icon.tintColor).toBe(Color.Purple);
      });
    });

    describe("card events", () => {
      it("returns blue credit card for card_transaction", () => {
        const icon = getEventIcon("card_transaction");
        expect(icon.source).toBe(Icon.CreditCard);
        expect(icon.tintColor).toBe(Color.Blue);
      });

      it("returns secondary credit card for generic card", () => {
        const icon = getEventIcon("card");
        expect(icon.source).toBe(Icon.CreditCard);
        expect(icon.tintColor).toBe(Color.SecondaryText);
      });
    });

    describe("bunqme events", () => {
      it("returns green link for bunqme", () => {
        const icon = getEventIcon("bunqme");
        expect(icon.source).toBe(Icon.Link);
        expect(icon.tintColor).toBe(Color.Green);
      });

      it("returns green link for tab", () => {
        const icon = getEventIcon("tab_created");
        expect(icon.source).toBe(Icon.Link);
        expect(icon.tintColor).toBe(Color.Green);
      });
    });

    describe("schedule events", () => {
      it("returns orange calendar for schedule", () => {
        const icon = getEventIcon("schedule");
        expect(icon.source).toBe(Icon.Calendar);
        expect(icon.tintColor).toBe(Color.Orange);
      });

      it("returns payment icon for scheduled_payment (matches payment first)", () => {
        // Note: "scheduled_payment" matches "payment" keyword before "schedule"
        // because payment rules come first in EVENT_ICON_RULES
        const icon = getEventIcon("scheduled_payment");
        expect(icon.source).toBe(Icon.BankNote);
        expect(icon.tintColor).toBe(Color.Blue);
      });
    });

    describe("share events", () => {
      it("returns blue two people for share", () => {
        const icon = getEventIcon("share");
        expect(icon.source).toBe(Icon.TwoPeople);
        expect(icon.tintColor).toBe(Color.Blue);
      });

      it("returns blue two people for share_invite", () => {
        const icon = getEventIcon("share_invite");
        expect(icon.source).toBe(Icon.TwoPeople);
        expect(icon.tintColor).toBe(Color.Blue);
      });
    });

    describe("default/unknown events", () => {
      it("returns default icon for undefined action", () => {
        const icon = getEventIcon(undefined);
        expect(icon.source).toBe(Icon.Circle);
        expect(icon.tintColor).toBe(Color.SecondaryText);
      });

      it("returns default icon for empty string", () => {
        const icon = getEventIcon("");
        expect(icon.source).toBe(Icon.Circle);
        expect(icon.tintColor).toBe(Color.SecondaryText);
      });

      it("returns default icon for unknown action", () => {
        const icon = getEventIcon("unknown_event_type");
        expect(icon.source).toBe(Icon.Circle);
        expect(icon.tintColor).toBe(Color.SecondaryText);
      });
    });
  });

  describe("getNotificationCategoryIcon", () => {
    describe("exact matches", () => {
      it("returns green banknote for PAYMENT", () => {
        const icon = getNotificationCategoryIcon("PAYMENT");
        expect(icon.source).toBe(Icon.BankNote);
        expect(icon.tintColor).toBe(Color.Green);
      });

      it("returns green banknote for MUTATION", () => {
        const icon = getNotificationCategoryIcon("MUTATION");
        expect(icon.source).toBe(Icon.BankNote);
        expect(icon.tintColor).toBe(Color.Green);
      });

      it("returns blue credit card for CARD", () => {
        const icon = getNotificationCategoryIcon("CARD");
        expect(icon.source).toBe(Icon.CreditCard);
        expect(icon.tintColor).toBe(Color.Blue);
      });

      it("returns red credit card for CARD_TRANSACTION_FAILED", () => {
        const icon = getNotificationCategoryIcon("CARD_TRANSACTION_FAILED");
        expect(icon.source).toBe(Icon.CreditCard);
        expect(icon.tintColor).toBe(Color.Red);
      });

      it("returns green credit card for CARD_TRANSACTION_SUCCESSFUL", () => {
        const icon = getNotificationCategoryIcon("CARD_TRANSACTION_SUCCESSFUL");
        expect(icon.source).toBe(Icon.CreditCard);
        expect(icon.tintColor).toBe(Color.Green);
      });

      it("returns purple envelope for REQUEST", () => {
        const icon = getNotificationCategoryIcon("REQUEST");
        expect(icon.source).toBe(Icon.Envelope);
        expect(icon.tintColor).toBe(Color.Purple);
      });

      it("returns orange calendar for SCHEDULE", () => {
        const icon = getNotificationCategoryIcon("SCHEDULE");
        expect(icon.source).toBe(Icon.Calendar);
        expect(icon.tintColor).toBe(Color.Orange);
      });

      it("returns orange calendar for SCHEDULE_RESULT", () => {
        const icon = getNotificationCategoryIcon("SCHEDULE_RESULT");
        expect(icon.source).toBe(Icon.Calendar);
        expect(icon.tintColor).toBe(Color.Orange);
      });

      it("returns orange calendar for SCHEDULE_STATUS", () => {
        const icon = getNotificationCategoryIcon("SCHEDULE_STATUS");
        expect(icon.source).toBe(Icon.Calendar);
        expect(icon.tintColor).toBe(Color.Orange);
      });

      it("returns magenta two people for SHARE", () => {
        const icon = getNotificationCategoryIcon("SHARE");
        expect(icon.source).toBe(Icon.TwoPeople);
        expect(icon.tintColor).toBe(Color.Magenta);
      });

      it("returns yellow link for TAB", () => {
        const icon = getNotificationCategoryIcon("TAB");
        expect(icon.source).toBe(Icon.Link);
        expect(icon.tintColor).toBe(Color.Yellow);
      });

      it("returns yellow link for TAB_RESULT", () => {
        const icon = getNotificationCategoryIcon("TAB_RESULT");
        expect(icon.source).toBe(Icon.Link);
        expect(icon.tintColor).toBe(Color.Yellow);
      });

      it("returns yellow link for BUNQME_TAB", () => {
        const icon = getNotificationCategoryIcon("BUNQME_TAB");
        expect(icon.source).toBe(Icon.Link);
        expect(icon.tintColor).toBe(Color.Yellow);
      });

      it("returns secondary document for DRAFT", () => {
        const icon = getNotificationCategoryIcon("DRAFT");
        expect(icon.source).toBe(Icon.Document);
        expect(icon.tintColor).toBe(Color.SecondaryText);
      });

      it("returns secondary document for DRAFT_PAYMENT", () => {
        const icon = getNotificationCategoryIcon("DRAFT_PAYMENT");
        expect(icon.source).toBe(Icon.Document);
        expect(icon.tintColor).toBe(Color.SecondaryText);
      });
    });

    describe("case insensitivity", () => {
      it("handles lowercase category", () => {
        const icon = getNotificationCategoryIcon("payment");
        expect(icon.source).toBe(Icon.BankNote);
        expect(icon.tintColor).toBe(Color.Green);
      });

      it("handles mixed case category", () => {
        const icon = getNotificationCategoryIcon("Payment");
        expect(icon.source).toBe(Icon.BankNote);
        expect(icon.tintColor).toBe(Color.Green);
      });
    });

    describe("partial matches", () => {
      it("matches partial category names", () => {
        const icon = getNotificationCategoryIcon("SOME_PAYMENT_TYPE");
        expect(icon.source).toBe(Icon.BankNote);
        expect(icon.tintColor).toBe(Color.Green);
      });
    });

    describe("default/unknown categories", () => {
      it("returns bell icon for unknown category", () => {
        const icon = getNotificationCategoryIcon("UNKNOWN_CATEGORY");
        expect(icon.source).toBe(Icon.Bell);
        expect(icon.tintColor).toBe(Color.SecondaryText);
      });

      it("returns bell icon for empty string", () => {
        const icon = getNotificationCategoryIcon("");
        expect(icon.source).toBe(Icon.Bell);
        expect(icon.tintColor).toBe(Color.SecondaryText);
      });
    });
  });
});
