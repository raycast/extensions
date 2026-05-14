/**
 * Shared constants for the bunq Raycast extension.
 */

import { getPreferenceValues } from "@raycast/api";

/**
 * Gets the user's preferred locale from Raycast preferences.
 * Falls back to "nl-NL" if not set.
 *
 * @returns The locale string (e.g., "en-US", "nl-NL")
 */
export function getLocale(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.locale || "nl-NL";
}

// Currency default
export const DEFAULT_CURRENCY = "EUR";

// Request Inquiry status values (outgoing requests)
export const REQUEST_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  REVOKED: "REVOKED",
  EXPIRED: "EXPIRED",
} as const;

export type RequestStatus = (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS];

// Request Response status values (incoming requests)
export const REQUEST_RESPONSE_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
} as const;

export type RequestResponseStatus = (typeof REQUEST_RESPONSE_STATUS)[keyof typeof REQUEST_RESPONSE_STATUS];

// Scheduled Payment status values
export const SCHEDULED_PAYMENT_STATUS = {
  ACTIVE: "ACTIVE",
  FINISHED: "FINISHED",
  CANCELLED: "CANCELLED",
} as const;

export type ScheduledPaymentStatus = (typeof SCHEDULED_PAYMENT_STATUS)[keyof typeof SCHEDULED_PAYMENT_STATUS];

// BunqMe Tab status values
export const BUNQME_STATUS = {
  WAITING_FOR_PAYMENT: "WAITING_FOR_PAYMENT",
  PAID: "PAID",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;

export type BunqMeStatus = (typeof BUNQME_STATUS)[keyof typeof BUNQME_STATUS];

// Card status values
export const CARD_STATUS = {
  ACTIVE: "ACTIVE",
  DEACTIVATED: "DEACTIVATED",
  LOST: "LOST",
  STOLEN: "STOLEN",
  CANCELLED: "CANCELLED",
  BLOCKED: "BLOCKED",
  /** bunq sometimes returns "NONE" for active cards */
  NONE: "NONE",
} as const;

export type CardStatus = (typeof CARD_STATUS)[keyof typeof CARD_STATUS];

// Card limit type values
export const CARD_LIMIT_TYPE = {
  CARD_LIMIT_ATM: "CARD_LIMIT_ATM",
  CARD_LIMIT_CONTACTLESS: "CARD_LIMIT_CONTACTLESS",
  CARD_LIMIT_POS_ICC: "CARD_LIMIT_POS_ICC",
  CARD_LIMIT_E_COMMERCE: "CARD_LIMIT_E_COMMERCE",
  CARD_LIMIT_DIPPING: "CARD_LIMIT_DIPPING",
} as const;

export type CardLimitType = (typeof CARD_LIMIT_TYPE)[keyof typeof CARD_LIMIT_TYPE];

// Recurrence unit values for scheduled payments
export const RECURRENCE_UNIT = {
  ONCE: "ONCE",
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  YEARLY: "YEARLY",
} as const;

export type RecurrenceUnit = (typeof RECURRENCE_UNIT)[keyof typeof RECURRENCE_UNIT];

// Statement format values
export const STATEMENT_FORMAT = {
  PDF: "PDF",
  CSV: "CSV",
  MT940: "MT940",
} as const;

export type StatementFormat = (typeof STATEMENT_FORMAT)[keyof typeof STATEMENT_FORMAT];

// Customer statement status values
export const STATEMENT_STATUS = {
  PENDING: "PENDING",
  DONE: "DONE",
  FAILED: "FAILED",
} as const;

export type StatementStatus = (typeof STATEMENT_STATUS)[keyof typeof STATEMENT_STATUS];

// Draft payment status values
export const DRAFT_PAYMENT_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;

export type DraftPaymentStatus = (typeof DRAFT_PAYMENT_STATUS)[keyof typeof DRAFT_PAYMENT_STATUS];

// Payment batch status values
export const PAYMENT_BATCH_STATUS = {
  ACTIVE: "ACTIVE",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export type PaymentBatchStatus = (typeof PAYMENT_BATCH_STATUS)[keyof typeof PAYMENT_BATCH_STATUS];

// Invoice status values
export const INVOICE_STATUS = {
  OPEN: "OPEN",
  PAID: "PAID",
  OVERDUE: "OVERDUE",
  VOIDED: "VOIDED",
} as const;

export type InvoiceStatus = (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];

// TransferWise transfer status values
export const TRANSFERWISE_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  OUTGOING_PAYMENT_SENT: "OUTGOING_PAYMENT_SENT",
  FUNDS_CONVERTED: "FUNDS_CONVERTED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  FUNDS_REFUNDED: "FUNDS_REFUNDED",
} as const;

export type TransferWiseStatus = (typeof TRANSFERWISE_STATUS)[keyof typeof TRANSFERWISE_STATUS];

// Notification filter category values
export const NOTIFICATION_CATEGORY = {
  BILLING: "BILLING",
  BUNQME_TAB: "BUNQME_TAB",
  CARD_TRANSACTION_FAILED: "CARD_TRANSACTION_FAILED",
  CARD_TRANSACTION_SUCCESSFUL: "CARD_TRANSACTION_SUCCESSFUL",
  CHAT: "CHAT",
  DRAFT_PAYMENT: "DRAFT_PAYMENT",
  IDEAL: "IDEAL",
  SOFORT: "SOFORT",
  MONETARY_ACCOUNT_PROFILE: "MONETARY_ACCOUNT_PROFILE",
  MUTATION: "MUTATION",
  PAYMENT: "PAYMENT",
  PROMOTION: "PROMOTION",
  REQUEST: "REQUEST",
  SCHEDULE_RESULT: "SCHEDULE_RESULT",
  SCHEDULE_STATUS: "SCHEDULE_STATUS",
  SHARE: "SHARE",
  SLICE_CHAT: "SLICE_CHAT",
  TAB_RESULT: "TAB_RESULT",
  USER_APPROVAL: "USER_APPROVAL",
  WHITELIST: "WHITELIST",
} as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORY)[keyof typeof NOTIFICATION_CATEGORY];

// Event type values
export const EVENT_TYPE = {
  PAYMENT: "Payment",
  BUNQME_TAB: "BunqMeTab",
  REQUEST_INQUIRY: "RequestInquiry",
  REQUEST_RESPONSE: "RequestResponse",
  SCHEDULE_PAYMENT: "SchedulePayment",
  CARD: "Card",
  SHARE_INVITE_BANK_INQUIRY: "ShareInviteBankInquiry",
} as const;

export type EventType = (typeof EVENT_TYPE)[keyof typeof EVENT_TYPE];

// Account type values
export const ACCOUNT_TYPE = {
  MONETARY_ACCOUNT_BANK: "MonetaryAccountBank",
  MONETARY_ACCOUNT_JOINT: "MonetaryAccountJoint",
  MONETARY_ACCOUNT_SAVINGS: "MonetaryAccountSavings",
  MONETARY_ACCOUNT_EXTERNAL: "MonetaryAccountExternal",
} as const;

export type AccountType = (typeof ACCOUNT_TYPE)[keyof typeof ACCOUNT_TYPE];

// Share invite status values
export const SHARE_INVITE_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
  REVOKED: "REVOKED",
} as const;

export type ShareInviteStatus = (typeof SHARE_INVITE_STATUS)[keyof typeof SHARE_INVITE_STATUS];

// Whitelist SDD status values (Direct Debits)
export const WHITELIST_SDD_STATUS = {
  ACTIVE: "ACTIVE",
  PENDING: "PENDING",
  CANCELLED: "CANCELLED",
  REJECTED: "REJECTED",
} as const;

export type WhitelistSddStatus = (typeof WHITELIST_SDD_STATUS)[keyof typeof WHITELIST_SDD_STATUS];

// Mastercard action status values (decision)
export const MASTERCARD_ACTION_STATUS = {
  APPROVED: "APPROVED",
  DECLINED: "DECLINED",
  PENDING: "PENDING",
  REVERSED: "REVERSED",
} as const;

export type MastercardActionStatus = (typeof MASTERCARD_ACTION_STATUS)[keyof typeof MASTERCARD_ACTION_STATUS];

// Billing contract status values
export const BILLING_CONTRACT_STATUS = {
  ACTIVE: "ACTIVE",
  PENDING: "PENDING",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;

export type BillingContractStatus = (typeof BILLING_CONTRACT_STATUS)[keyof typeof BILLING_CONTRACT_STATUS];

// Device status values
export const DEVICE_STATUS = {
  ACTIVE: "ACTIVE",
  BLOCKED: "BLOCKED",
} as const;

export type DeviceStatus = (typeof DEVICE_STATUS)[keyof typeof DEVICE_STATUS];
