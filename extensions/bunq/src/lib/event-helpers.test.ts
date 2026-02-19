/**
 * Tests for event-helpers utilities.
 */

import { describe, it, expect } from "vitest";
import { getEventDisplayInfo, getEventObjectType, filterMatchesEvent } from "./event-helpers";
import type { Event } from "../api/endpoints";

// Helper to create a mock event
function createMockEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 1,
    created: "2024-01-01T12:00:00.000Z",
    updated: "2024-01-01T12:00:00.000Z",
    action: "CREATE",
    user_id: 123,
    monetary_account_id: 1,
    object: {},
    status: "FINALIZED",
    ...overrides,
  };
}

describe("event-helpers", () => {
  describe("getEventDisplayInfo", () => {
    describe("Payment events", () => {
      it("extracts display info from payment with counterparty", () => {
        const event = createMockEvent({
          action: "PAYMENT_CREATED",
          object: {
            Payment: {
              amount: { value: "50.00", currency: "EUR" },
              description: "Test payment",
              counterparty_alias: { display_name: "John Doe", name: "John" },
            },
          },
        });

        const info = getEventDisplayInfo(event);
        expect(info.title).toBe("John Doe");
        expect(info.subtitle).toContain("EUR 50.00");
        expect(info.subtitle).toContain("Test payment");
      });

      it("uses description as title when no counterparty", () => {
        const event = createMockEvent({
          object: {
            Payment: {
              amount: { value: "25.00", currency: "EUR" },
              description: "Coffee",
            },
          },
        });

        const info = getEventDisplayInfo(event);
        expect(info.title).toBe("Coffee");
      });

      it("shows Payment Received for incoming positive amount", () => {
        const event = createMockEvent({
          object: {
            Payment: {
              amount: { value: "100.00", currency: "EUR" },
            },
          },
        });

        const info = getEventDisplayInfo(event);
        expect(info.title).toBe("Payment Received");
      });

      it("shows Payment Sent for outgoing negative amount", () => {
        const event = createMockEvent({
          object: {
            Payment: {
              amount: { value: "-50.00", currency: "EUR" },
            },
          },
        });

        const info = getEventDisplayInfo(event);
        expect(info.title).toBe("Payment Sent");
      });

      it("handles payment with name fallback", () => {
        const event = createMockEvent({
          object: {
            Payment: {
              amount: { value: "30.00", currency: "EUR" },
              counterparty_alias: { name: "Recipient Name" },
            },
          },
        });

        const info = getEventDisplayInfo(event);
        expect(info.title).toBe("Recipient Name");
      });
    });

    describe("RequestInquiry events", () => {
      it("extracts display info from request inquiry", () => {
        const event = createMockEvent({
          object: {
            RequestInquiry: {
              amount_inquired: { value: "100.00", currency: "EUR" },
              description: "Lunch split",
              counterparty_alias: { display_name: "Jane Smith" },
              status: "PENDING",
            },
          },
        });

        const info = getEventDisplayInfo(event);
        expect(info.title).toBe("Jane Smith");
        expect(info.subtitle).toContain("EUR 100.00");
        expect(info.subtitle).toContain("Lunch split");
        expect(info.subtitle).toContain("PENDING");
      });

      it("uses fallback title when no counterparty", () => {
        const event = createMockEvent({
          object: {
            RequestInquiry: {
              amount_inquired: { value: "50.00", currency: "EUR" },
            },
          },
        });

        const info = getEventDisplayInfo(event);
        expect(info.title).toBe("Payment Request Sent");
      });
    });

    describe("RequestResponse events", () => {
      it("extracts display info from request response", () => {
        const event = createMockEvent({
          object: {
            RequestResponse: {
              amount_inquired: { value: "75.00", currency: "EUR" },
              description: "Dinner",
              counterparty_alias: { display_name: "Bob Wilson" },
              status: "ACCEPTED",
            },
          },
        });

        const info = getEventDisplayInfo(event);
        expect(info.title).toBe("Bob Wilson");
        expect(info.subtitle).toContain("EUR 75.00");
        expect(info.subtitle).toContain("ACCEPTED");
      });

      it("uses fallback title when no counterparty", () => {
        const event = createMockEvent({
          object: {
            RequestResponse: {
              amount_inquired: { value: "25.00", currency: "EUR" },
            },
          },
        });

        const info = getEventDisplayInfo(event);
        expect(info.title).toBe("Payment Request Received");
      });
    });

    describe("BunqMeTab events", () => {
      it("extracts display info from bunqme tab", () => {
        const event = createMockEvent({
          object: {
            BunqMeTab: {
              bunqme_tab_entry: {
                description: "Birthday gift",
                amount_inquired: { value: "50.00", currency: "EUR" },
              },
              status: "WAITING_FOR_PAYMENT",
            },
          },
        });

        const info = getEventDisplayInfo(event);
        expect(info.title).toBe("Birthday gift");
        expect(info.subtitle).toContain("EUR 50.00");
        expect(info.subtitle).toContain("WAITING_FOR_PAYMENT");
      });

      it("uses fallback title when no description", () => {
        const event = createMockEvent({
          object: {
            BunqMeTab: {
              bunqme_tab_entry: {},
              status: "PAID",
            },
          },
        });

        const info = getEventDisplayInfo(event);
        expect(info.title).toBe("bunq.me Link");
      });
    });

    describe("ScheduledPayment events", () => {
      it("extracts display info from scheduled payment", () => {
        const event = createMockEvent({
          object: {
            ScheduledPayment: {
              payment: {
                amount: { value: "200.00", currency: "EUR" },
                description: "Rent",
                counterparty_alias: { display_name: "Landlord" },
              },
              status: "ACTIVE",
            },
          },
        });

        const info = getEventDisplayInfo(event);
        expect(info.title).toBe("Landlord");
        expect(info.subtitle).toContain("EUR 200.00");
        expect(info.subtitle).toContain("ACTIVE");
      });

      it("uses description as fallback title", () => {
        const event = createMockEvent({
          object: {
            ScheduledPayment: {
              payment: {
                description: "Monthly subscription",
              },
              status: "ACTIVE",
            },
          },
        });

        const info = getEventDisplayInfo(event);
        expect(info.title).toBe("Monthly subscription");
      });

      it("uses fallback title when no payment data", () => {
        const event = createMockEvent({
          object: {
            ScheduledPayment: {
              status: "FINISHED",
            },
          },
        });

        const info = getEventDisplayInfo(event);
        expect(info.title).toBe("Scheduled Payment");
      });
    });

    describe("Card events", () => {
      it("extracts display info from card", () => {
        const event = createMockEvent({
          object: {
            Card: {
              second_line: "JOHN DOE",
              type: "MASTERCARD",
              status: "ACTIVE",
            },
          },
        });

        const info = getEventDisplayInfo(event);
        expect(info.title).toBe("JOHN DOE");
        expect(info.subtitle).toContain("MASTERCARD");
        expect(info.subtitle).toContain("ACTIVE");
      });

      it("uses fallback title when no second line", () => {
        const event = createMockEvent({
          object: {
            Card: {
              type: "VISA",
            },
          },
        });

        const info = getEventDisplayInfo(event);
        expect(info.title).toBe("Card");
      });
    });

    describe("MasterCardAction events", () => {
      it("extracts display info from mastercard action", () => {
        const event = createMockEvent({
          object: {
            MasterCardAction: {
              amount_local: { value: "15.50", currency: "EUR" },
              description: "Coffee Shop",
              counterparty_alias: { display_name: "Starbucks" },
            },
          },
        });

        const info = getEventDisplayInfo(event);
        expect(info.title).toBe("Starbucks");
        expect(info.subtitle).toBe("EUR 15.50");
      });

      it("uses description as fallback title", () => {
        const event = createMockEvent({
          object: {
            MasterCardAction: {
              amount_local: { value: "25.00", currency: "EUR" },
              description: "Restaurant",
            },
          },
        });

        const info = getEventDisplayInfo(event);
        expect(info.title).toBe("Restaurant");
      });

      it("uses fallback title when minimal data", () => {
        const event = createMockEvent({
          object: {
            MasterCardAction: {},
          },
        });

        const info = getEventDisplayInfo(event);
        expect(info.title).toBe("Card Transaction");
      });
    });

    describe("default/unknown events", () => {
      it("formats action as title for unknown events", () => {
        const event = createMockEvent({
          action: "unknown_action_type",
          object: { SomeUnknownType: {} },
        });

        const info = getEventDisplayInfo(event);
        expect(info.title).toBe("Unknown Action Type");
        expect(info.subtitle).toBe("");
      });

      it("handles missing object", () => {
        const event = createMockEvent({
          action: "CREATE",
          object: undefined as unknown as Record<string, unknown>,
        });

        const info = getEventDisplayInfo(event);
        expect(info.title).toBe("Create");
        expect(info.subtitle).toBe("");
      });

      it("handles empty action", () => {
        const event = createMockEvent({
          action: "",
          object: {},
        });

        const info = getEventDisplayInfo(event);
        expect(info.title).toBe("Event");
      });
    });
  });

  describe("getEventObjectType", () => {
    it("identifies Payment objects", () => {
      const event = createMockEvent({ object: { Payment: {} } });
      expect(getEventObjectType(event)).toBe("Payment");
    });

    it("identifies RequestInquiry objects", () => {
      const event = createMockEvent({ object: { RequestInquiry: {} } });
      expect(getEventObjectType(event)).toBe("RequestInquiry");
    });

    it("identifies RequestResponse objects", () => {
      const event = createMockEvent({ object: { RequestResponse: {} } });
      expect(getEventObjectType(event)).toBe("RequestResponse");
    });

    it("identifies BunqMeTab objects", () => {
      const event = createMockEvent({ object: { BunqMeTab: {} } });
      expect(getEventObjectType(event)).toBe("BunqMeTab");
    });

    it("identifies ScheduledPayment objects", () => {
      const event = createMockEvent({ object: { ScheduledPayment: {} } });
      expect(getEventObjectType(event)).toBe("ScheduledPayment");
    });

    it("identifies Card objects", () => {
      const event = createMockEvent({ object: { Card: {} } });
      expect(getEventObjectType(event)).toBe("Card");
    });

    it("returns null for unknown objects", () => {
      const event = createMockEvent({ object: { UnknownType: {} } });
      expect(getEventObjectType(event)).toBeNull();
    });

    it("returns null for undefined object", () => {
      const event = createMockEvent({ object: undefined as unknown as Record<string, unknown> });
      expect(getEventObjectType(event)).toBeNull();
    });

    it("returns null for empty object", () => {
      const event = createMockEvent({ object: {} });
      expect(getEventObjectType(event)).toBeNull();
    });
  });

  describe("filterMatchesEvent", () => {
    describe("all filter", () => {
      it("returns true for all filter regardless of event type", () => {
        const paymentEvent = createMockEvent({ object: { Payment: {} } });
        const requestEvent = createMockEvent({ object: { RequestInquiry: {} } });
        const unknownEvent = createMockEvent({ object: {} });

        expect(filterMatchesEvent("all", paymentEvent)).toBe(true);
        expect(filterMatchesEvent("all", requestEvent)).toBe(true);
        expect(filterMatchesEvent("all", unknownEvent)).toBe(true);
      });
    });

    describe("object type matching", () => {
      it("matches Payment filter with Payment event", () => {
        const event = createMockEvent({ object: { Payment: {} } });
        expect(filterMatchesEvent("Payment", event)).toBe(true);
      });

      it("matches RequestInquiry filter with RequestInquiry event", () => {
        const event = createMockEvent({ object: { RequestInquiry: {} } });
        expect(filterMatchesEvent("RequestInquiry", event)).toBe(true);
      });

      it("matches RequestResponse filter with RequestResponse event", () => {
        const event = createMockEvent({ object: { RequestResponse: {} } });
        expect(filterMatchesEvent("RequestResponse", event)).toBe(true);
      });

      it("matches BunqMeTab filter with BunqMeTab event", () => {
        const event = createMockEvent({ object: { BunqMeTab: {} } });
        expect(filterMatchesEvent("BunqMeTab", event)).toBe(true);
      });

      it("matches Card filter with Card event", () => {
        const event = createMockEvent({ object: { Card: {} } });
        expect(filterMatchesEvent("Card", event)).toBe(true);
      });

      it("does not match mismatched filter and event type", () => {
        const event = createMockEvent({ object: { Payment: {} } });
        expect(filterMatchesEvent("Card", event)).toBe(false);
      });
    });

    describe("action string matching", () => {
      it("matches filter in action string", () => {
        const event = createMockEvent({
          action: "PAYMENT_CREATED",
          object: {},
        });
        expect(filterMatchesEvent("Payment", event)).toBe(true);
      });

      it("handles case insensitive action matching", () => {
        const event = createMockEvent({
          action: "payment_sent",
          object: {},
        });
        expect(filterMatchesEvent("Payment", event)).toBe(true);
      });

      it("does not match when filter not in action", () => {
        const event = createMockEvent({
          action: "CARD_ACTIVATED",
          object: {},
        });
        expect(filterMatchesEvent("Payment", event)).toBe(false);
      });
    });

    describe("combined matching", () => {
      it("prefers object type match over action match", () => {
        const event = createMockEvent({
          action: "PAYMENT_CREATED",
          object: { Card: {} },
        });
        expect(filterMatchesEvent("Card", event)).toBe(true);
        expect(filterMatchesEvent("Payment", event)).toBe(true); // Also matches via action
      });
    });
  });
});
