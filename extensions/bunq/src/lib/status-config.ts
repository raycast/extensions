/**
 * Status configuration data for the bunq Raycast extension.
 *
 * This file contains data-driven status configurations used by the status helpers.
 * Each configuration maps status strings to their appearance (color, icon, label).
 */

import { Color, Icon } from "@raycast/api";
import type { StatusAppearance } from "./status-helpers";

/**
 * Status configuration mapping strings to their appearances.
 */
export type StatusConfig = Record<string, StatusAppearance>;

/**
 * Default appearance for unknown statuses.
 */
export const DEFAULT_STATUS: StatusAppearance = {
  color: Color.SecondaryText,
  icon: Icon.Circle,
  label: "",
};

// ============== Request Status Configurations ==============

/**
 * Request inquiry status (outgoing requests).
 */
export const REQUEST_STATUS_CONFIG: StatusConfig = {
  PENDING: { color: Color.Orange, icon: Icon.Clock, label: "Pending" },
  ACCEPTED: { color: Color.Green, icon: Icon.CheckCircle, label: "Accepted" },
  REJECTED: { color: Color.Red, icon: Icon.XMarkCircle, label: "Rejected" },
  REVOKED: { color: Color.Red, icon: Icon.XMarkCircle, label: "Revoked" },
  EXPIRED: { color: Color.Red, icon: Icon.ExclamationMark, label: "Expired" },
};

/**
 * Request response status (incoming requests).
 */
export const REQUEST_RESPONSE_STATUS_CONFIG: StatusConfig = {
  PENDING: { color: Color.Orange, icon: Icon.Clock, label: "Pending" },
  ACCEPTED: { color: Color.Green, icon: Icon.CheckCircle, label: "Paid" },
  REJECTED: { color: Color.Red, icon: Icon.XMarkCircle, label: "Rejected" },
};

// ============== Payment Status Configurations ==============

/**
 * Scheduled payment status.
 */
export const SCHEDULED_PAYMENT_STATUS_CONFIG: StatusConfig = {
  ACTIVE: { color: Color.Green, icon: Icon.CheckCircle, label: "Active" },
  FINISHED: { color: Color.SecondaryText, icon: Icon.CheckCircle, label: "Finished" },
  CANCELLED: { color: Color.Red, icon: Icon.XMarkCircle, label: "Cancelled" },
};

/**
 * Draft payment status.
 */
export const DRAFT_PAYMENT_STATUS_CONFIG: StatusConfig = {
  PENDING: { color: Color.Orange, icon: Icon.Clock, label: "Pending Approval" },
  ACCEPTED: { color: Color.Green, icon: Icon.CheckCircle, label: "Approved" },
  REJECTED: { color: Color.Red, icon: Icon.XMarkCircle, label: "Rejected" },
  CANCELLED: { color: Color.Red, icon: Icon.Trash, label: "Cancelled" },
};

/**
 * Payment batch status.
 */
export const PAYMENT_BATCH_STATUS_CONFIG: StatusConfig = {
  ACTIVE: { color: Color.Blue, icon: Icon.List, label: "Active" },
  PROCESSING: { color: Color.Orange, icon: Icon.Clock, label: "Processing" },
  COMPLETED: { color: Color.Green, icon: Icon.CheckCircle, label: "Completed" },
  FAILED: { color: Color.Red, icon: Icon.XMarkCircle, label: "Failed" },
};

// ============== BunqMe Status Configuration ==============

/**
 * BunqMe tab status.
 */
export const BUNQME_STATUS_CONFIG: StatusConfig = {
  WAITING_FOR_PAYMENT: { color: Color.Orange, icon: Icon.Clock, label: "Waiting" },
  PAID: { color: Color.Green, icon: Icon.CheckCircle, label: "Paid" },
  CANCELLED: { color: Color.Red, icon: Icon.XMarkCircle, label: "Cancelled" },
  EXPIRED: { color: Color.Red, icon: Icon.ExclamationMark, label: "Expired" },
};

// ============== Card Status Configuration ==============

/**
 * Card status.
 */
export const CARD_STATUS_CONFIG: StatusConfig = {
  ACTIVE: { color: Color.Green, icon: Icon.CheckCircle, label: "Active" },
  NONE: { color: Color.Green, icon: Icon.CheckCircle, label: "Active" },
  DEACTIVATED: { color: Color.Orange, icon: Icon.XMarkCircle, label: "Frozen" },
  BLOCKED: { color: Color.Orange, icon: Icon.XMarkCircle, label: "Blocked" },
  LOST: { color: Color.Red, icon: Icon.ExclamationMark, label: "Lost" },
  STOLEN: { color: Color.Red, icon: Icon.ExclamationMark, label: "Stolen" },
  CANCELLED: { color: Color.Red, icon: Icon.Trash, label: "Cancelled" },
};

/**
 * Mastercard action status (decision).
 */
export const MASTERCARD_ACTION_STATUS_CONFIG: StatusConfig = {
  APPROVED: { color: Color.Green, icon: Icon.CheckCircle, label: "Approved" },
  DECLINED: { color: Color.Red, icon: Icon.XMarkCircle, label: "Declined" },
  PENDING: { color: Color.Orange, icon: Icon.Clock, label: "Pending" },
  REVERSED: { color: Color.Blue, icon: Icon.ArrowCounterClockwise, label: "Reversed" },
};

// ============== TransferWise Status Configuration ==============

/**
 * TransferWise transfer status.
 */
export const TRANSFERWISE_STATUS_CONFIG: StatusConfig = {
  PENDING: { color: Color.Orange, icon: Icon.Clock, label: "Pending" },
  PROCESSING: { color: Color.Blue, icon: Icon.Clock, label: "Processing" },
  OUTGOING_PAYMENT_SENT: { color: Color.Blue, icon: Icon.ArrowRight, label: "Sent" },
  FUNDS_CONVERTED: { color: Color.Blue, icon: Icon.Switch, label: "Converted" },
  COMPLETED: { color: Color.Green, icon: Icon.CheckCircle, label: "Completed" },
  CANCELLED: { color: Color.Red, icon: Icon.XMarkCircle, label: "Cancelled" },
  FUNDS_REFUNDED: { color: Color.Orange, icon: Icon.ArrowCounterClockwise, label: "Refunded" },
};

// ============== Invoice & Statement Status Configurations ==============

/**
 * Invoice status.
 */
export const INVOICE_STATUS_CONFIG: StatusConfig = {
  OPEN: { color: Color.Orange, icon: Icon.Clock, label: "Open" },
  PAID: { color: Color.Green, icon: Icon.CheckCircle, label: "Paid" },
  OVERDUE: { color: Color.Red, icon: Icon.ExclamationMark, label: "Overdue" },
  VOIDED: { color: Color.SecondaryText, icon: Icon.XMarkCircle, label: "Voided" },
};

/**
 * Customer statement status.
 */
export const STATEMENT_STATUS_CONFIG: StatusConfig = {
  PENDING: { color: Color.Orange, icon: Icon.Clock, label: "Generating" },
  DONE: { color: Color.Green, icon: Icon.CheckCircle, label: "Ready" },
  FAILED: { color: Color.Red, icon: Icon.XMarkCircle, label: "Failed" },
};

// ============== Share & Device Status Configurations ==============

/**
 * Share invite status.
 */
export const SHARE_INVITE_STATUS_CONFIG: StatusConfig = {
  PENDING: { color: Color.Orange, icon: Icon.Clock, label: "Pending" },
  ACCEPTED: { color: Color.Green, icon: Icon.CheckCircle, label: "Accepted" },
  REJECTED: { color: Color.Red, icon: Icon.XMarkCircle, label: "Rejected" },
  CANCELLED: { color: Color.Red, icon: Icon.Trash, label: "Cancelled" },
  REVOKED: { color: Color.Red, icon: Icon.XMarkCircle, label: "Revoked" },
};

/**
 * Whitelist SDD (direct debit) status.
 */
export const WHITELIST_SDD_STATUS_CONFIG: StatusConfig = {
  ACTIVE: { color: Color.Green, icon: Icon.CheckCircle, label: "Active" },
  PENDING: { color: Color.Orange, icon: Icon.Clock, label: "Pending" },
  CANCELLED: { color: Color.Red, icon: Icon.XMarkCircle, label: "Cancelled" },
  REJECTED: { color: Color.Red, icon: Icon.XMarkCircle, label: "Rejected" },
};

/**
 * Billing contract status.
 */
export const BILLING_CONTRACT_STATUS_CONFIG: StatusConfig = {
  ACTIVE: { color: Color.Green, icon: Icon.CheckCircle, label: "Active" },
  PENDING: { color: Color.Orange, icon: Icon.Clock, label: "Pending" },
  CANCELLED: { color: Color.Red, icon: Icon.XMarkCircle, label: "Cancelled" },
  EXPIRED: { color: Color.Red, icon: Icon.ExclamationMark, label: "Expired" },
};

/**
 * Device status.
 */
export const DEVICE_STATUS_CONFIG: StatusConfig = {
  ACTIVE: { color: Color.Green, icon: Icon.CheckCircle, label: "Active" },
  BLOCKED: { color: Color.Red, icon: Icon.XMarkCircle, label: "Blocked" },
};

// ============== Category Icon Mapping ==============

/**
 * Spending category to icon mapping.
 */
export const CATEGORY_ICON_MAP: Array<{ keywords: string[]; icon: Icon }> = [
  { keywords: ["food", "restaurant", "groceries"], icon: Icon.Leaf },
  { keywords: ["transport", "travel"], icon: Icon.Car },
  { keywords: ["shop", "retail"], icon: Icon.Cart },
  { keywords: ["entertainment", "leisure"], icon: Icon.Star },
  { keywords: ["health", "medical"], icon: Icon.Heart },
  { keywords: ["housing", "rent"], icon: Icon.House },
  { keywords: ["utility", "bills"], icon: Icon.LightBulb },
];
