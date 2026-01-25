/**
 * Event helper functions for formatting and filtering events.
 * Extracted from events.tsx to improve code organization.
 */

import type { Event } from "../api/endpoints";

// ============== Types ==============

export type EventFilter =
  | "all"
  | "Payment"
  | "RequestInquiry"
  | "RequestResponse"
  | "BunqMeTab"
  | "ScheduledPayment"
  | "Card"
  | "MasterCardAction";

export interface EventDisplayInfo {
  title: string;
  subtitle: string;
}

// ============== Display Info ==============

/**
 * Extracts display information (title, subtitle) from an event object.
 * Handles various event types: Payment, RequestInquiry, RequestResponse, BunqMeTab, etc.
 */
export function getEventDisplayInfo(event: Event): EventDisplayInfo {
  const obj = event.object as Record<string, unknown> | undefined;
  const action = event.action || "";

  // Default formatted action
  const defaultTitle =
    action
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ") || "Event";

  if (!obj) return { title: defaultTitle, subtitle: "" };

  // Check for Payment
  const payment = obj["Payment"] as Record<string, unknown> | undefined;
  if (payment) {
    const amount = payment["amount"] as { value: string; currency: string } | undefined;
    const description = payment["description"] as string | undefined;
    const counterparty = payment["counterparty_alias"] as { display_name?: string; name?: string } | undefined;
    const counterpartyName = counterparty?.display_name || counterparty?.name || "";

    const amountStr = amount ? `${amount.currency} ${amount.value}` : "";
    const isIncoming = amount && parseFloat(amount.value) > 0;

    return {
      title: counterpartyName || description || (isIncoming ? "Payment Received" : "Payment Sent"),
      subtitle: [amountStr, description && counterpartyName ? description : ""].filter(Boolean).join(" - "),
    };
  }

  // Check for RequestInquiry (payment request you sent)
  const requestInquiry = obj["RequestInquiry"] as Record<string, unknown> | undefined;
  if (requestInquiry) {
    const amount = requestInquiry["amount_inquired"] as { value: string; currency: string } | undefined;
    const description = requestInquiry["description"] as string | undefined;
    const counterparty = requestInquiry["counterparty_alias"] as { display_name?: string; name?: string } | undefined;
    const counterpartyName = counterparty?.display_name || counterparty?.name || "";
    const status = requestInquiry["status"] as string | undefined;

    const amountStr = amount ? `${amount.currency} ${amount.value}` : "";

    return {
      title: counterpartyName || "Payment Request Sent",
      subtitle: [amountStr, description, status ? `(${status})` : ""].filter(Boolean).join(" - "),
    };
  }

  // Check for RequestResponse (payment request you received)
  const requestResponse = obj["RequestResponse"] as Record<string, unknown> | undefined;
  if (requestResponse) {
    const amount = requestResponse["amount_inquired"] as { value: string; currency: string } | undefined;
    const description = requestResponse["description"] as string | undefined;
    const counterparty = requestResponse["counterparty_alias"] as { display_name?: string; name?: string } | undefined;
    const counterpartyName = counterparty?.display_name || counterparty?.name || "";
    const status = requestResponse["status"] as string | undefined;

    const amountStr = amount ? `${amount.currency} ${amount.value}` : "";

    return {
      title: counterpartyName || "Payment Request Received",
      subtitle: [amountStr, description, status ? `(${status})` : ""].filter(Boolean).join(" - "),
    };
  }

  // Check for BunqMeTab
  const bunqmeTab = obj["BunqMeTab"] as Record<string, unknown> | undefined;
  if (bunqmeTab) {
    const entry = bunqmeTab["bunqme_tab_entry"] as
      | { description?: string; amount_inquired?: { value: string; currency: string } }
      | undefined;
    const status = bunqmeTab["status"] as string | undefined;
    const amountStr = entry?.amount_inquired ? `${entry.amount_inquired.currency} ${entry.amount_inquired.value}` : "";

    return {
      title: entry?.description || "bunq.me Link",
      subtitle: [amountStr, status ? `(${status})` : ""].filter(Boolean).join(" "),
    };
  }

  // Check for ScheduledPayment
  const scheduledPayment = obj["ScheduledPayment"] as Record<string, unknown> | undefined;
  if (scheduledPayment) {
    const paymentData = scheduledPayment["payment"] as
      | {
          amount?: { value: string; currency: string };
          description?: string;
          counterparty_alias?: { display_name?: string; name?: string };
        }
      | undefined;
    const status = scheduledPayment["status"] as string | undefined;

    const amountStr = paymentData?.amount ? `${paymentData.amount.currency} ${paymentData.amount.value}` : "";
    const counterpartyName =
      paymentData?.counterparty_alias?.display_name || paymentData?.counterparty_alias?.name || "";

    return {
      title: counterpartyName || paymentData?.description || "Scheduled Payment",
      subtitle: [amountStr, status ? `(${status})` : ""].filter(Boolean).join(" "),
    };
  }

  // Check for Card events
  const card = obj["Card"] as Record<string, unknown> | undefined;
  if (card) {
    const secondLine = card["second_line"] as string | undefined;
    const cardType = card["type"] as string | undefined;
    const status = card["status"] as string | undefined;

    return {
      title: secondLine || "Card",
      subtitle: [cardType, status].filter(Boolean).join(" - "),
    };
  }

  // Check for MasterCardAction (card transactions)
  const masterCardAction = obj["MasterCardAction"] as Record<string, unknown> | undefined;
  if (masterCardAction) {
    const amount = masterCardAction["amount_local"] as { value: string; currency: string } | undefined;
    const description = masterCardAction["description"] as string | undefined;
    const counterparty = masterCardAction["counterparty_alias"] as { display_name?: string; name?: string } | undefined;
    const counterpartyName = counterparty?.display_name || counterparty?.name || "";

    const amountStr = amount ? `${amount.currency} ${amount.value}` : "";

    return {
      title: counterpartyName || description || "Card Transaction",
      subtitle: amountStr,
    };
  }

  return { title: defaultTitle, subtitle: "" };
}

// ============== Object Type Detection ==============

const EVENT_OBJECT_TYPES = [
  "Payment",
  "RequestInquiry",
  "RequestResponse",
  "BunqMeTab",
  "ScheduledPayment",
  "Card",
  "MasterCardAction",
];

/**
 * Determines the type of object contained in an event.
 */
export function getEventObjectType(event: Event): string | null {
  const obj = event.object as Record<string, unknown> | undefined;
  if (!obj) return null;

  for (const type of EVENT_OBJECT_TYPES) {
    if (obj[type]) return type;
  }
  return null;
}

// ============== Event Filtering ==============

/**
 * Checks if an event matches the given filter.
 */
export function filterMatchesEvent(filter: EventFilter, event: Event): boolean {
  if (filter === "all") return true;

  const objectType = getEventObjectType(event);
  if (objectType === filter) return true;

  // Also check action string for filter matching
  const action = (event.action || "").toLowerCase();
  const filterLower = filter.toLowerCase();

  return action.includes(filterLower);
}
