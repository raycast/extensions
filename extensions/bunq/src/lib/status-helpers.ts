/**
 * Status appearance helpers for the bunq Raycast extension.
 *
 * This module provides functions to get the visual appearance (color, icon, label)
 * for various status values throughout the extension.
 */

import { Color, Icon } from "@raycast/api";
import type {
  RequestStatus,
  RequestResponseStatus,
  ScheduledPaymentStatus,
  BunqMeStatus,
  DraftPaymentStatus,
  PaymentBatchStatus,
  InvoiceStatus,
  StatementStatus,
  TransferWiseStatus,
  ShareInviteStatus,
} from "./constants";
import {
  DEFAULT_STATUS,
  REQUEST_STATUS_CONFIG,
  REQUEST_RESPONSE_STATUS_CONFIG,
  SCHEDULED_PAYMENT_STATUS_CONFIG,
  DRAFT_PAYMENT_STATUS_CONFIG,
  PAYMENT_BATCH_STATUS_CONFIG,
  BUNQME_STATUS_CONFIG,
  CARD_STATUS_CONFIG,
  MASTERCARD_ACTION_STATUS_CONFIG,
  TRANSFERWISE_STATUS_CONFIG,
  INVOICE_STATUS_CONFIG,
  STATEMENT_STATUS_CONFIG,
  SHARE_INVITE_STATUS_CONFIG,
  WHITELIST_SDD_STATUS_CONFIG,
  BILLING_CONTRACT_STATUS_CONFIG,
  DEVICE_STATUS_CONFIG,
  CATEGORY_ICON_MAP,
  type StatusConfig,
} from "./status-config";

/**
 * Visual appearance for a status value.
 */
export interface StatusAppearance {
  color: Color;
  icon: Icon;
  label: string;
}

/**
 * Creates a status helper function from a configuration object.
 */
function createStatusHelper(config: StatusConfig) {
  return (status: string): StatusAppearance => {
    const key = status.toUpperCase();
    return config[key] ?? { ...DEFAULT_STATUS, label: status };
  };
}

// ============== Request Status Helpers ==============

/** Gets the appearance for a request inquiry status (outgoing requests) */
export const getRequestStatusAppearance = createStatusHelper(REQUEST_STATUS_CONFIG) as (
  status: RequestStatus,
) => StatusAppearance;

/** Gets the appearance for a request response status (incoming requests) */
export const getRequestResponseStatusAppearance = createStatusHelper(REQUEST_RESPONSE_STATUS_CONFIG) as (
  status: RequestResponseStatus,
) => StatusAppearance;

// ============== Payment Status Helpers ==============

/** Gets the appearance for a scheduled payment status */
export const getScheduledPaymentStatusAppearance = createStatusHelper(SCHEDULED_PAYMENT_STATUS_CONFIG) as (
  status: ScheduledPaymentStatus,
) => StatusAppearance;

/** Gets the appearance for a draft payment status */
export const getDraftPaymentStatusAppearance = createStatusHelper(DRAFT_PAYMENT_STATUS_CONFIG) as (
  status: DraftPaymentStatus,
) => StatusAppearance;

/** Gets the appearance for a payment batch status */
export const getPaymentBatchStatusAppearance = createStatusHelper(PAYMENT_BATCH_STATUS_CONFIG) as (
  status: PaymentBatchStatus,
) => StatusAppearance;

// ============== BunqMe Status Helper ==============

/** Gets the appearance for a bunq.me tab status */
export const getBunqMeStatusAppearance = createStatusHelper(BUNQME_STATUS_CONFIG) as (
  status: BunqMeStatus,
) => StatusAppearance;

// ============== Card Status Helpers ==============

/** Gets the appearance for a card status */
export const getCardStatusAppearance = createStatusHelper(CARD_STATUS_CONFIG);

/** Gets the appearance for a Mastercard action status (decision) */
export const getMastercardActionStatusAppearance = createStatusHelper(MASTERCARD_ACTION_STATUS_CONFIG);

// ============== TransferWise Status Helper ==============

/** Gets the appearance for a TransferWise transfer status */
export const getTransferWiseStatusAppearance = createStatusHelper(TRANSFERWISE_STATUS_CONFIG) as (
  status: TransferWiseStatus,
) => StatusAppearance;

// ============== Invoice & Statement Status Helpers ==============

/** Gets the appearance for an invoice status */
export const getInvoiceStatusAppearance = createStatusHelper(INVOICE_STATUS_CONFIG) as (
  status: InvoiceStatus,
) => StatusAppearance;

/** Gets the appearance for a customer statement status */
export const getStatementStatusAppearance = createStatusHelper(STATEMENT_STATUS_CONFIG) as (
  status: StatementStatus,
) => StatusAppearance;

// ============== Share & Device Status Helpers ==============

/** Gets the appearance for a share invite status */
export const getShareInviteStatusAppearance = createStatusHelper(SHARE_INVITE_STATUS_CONFIG) as (
  status: ShareInviteStatus,
) => StatusAppearance;

/** Gets the appearance for a whitelist SDD (direct debit) status */
export const getWhitelistSddStatusAppearance = createStatusHelper(WHITELIST_SDD_STATUS_CONFIG);

/** Gets the appearance for a billing contract status */
export const getBillingContractStatusAppearance = createStatusHelper(BILLING_CONTRACT_STATUS_CONFIG);

/** Gets the appearance for a device status */
export const getDeviceStatusAppearance = createStatusHelper(DEVICE_STATUS_CONFIG);

// ============== Color & Icon Helpers ==============

/**
 * Gets the appropriate color for a balance amount.
 */
export function getBalanceColor(amount: string | number): Color {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return num >= 0 ? Color.Green : Color.Red;
}

/**
 * Gets the icon for a spending category.
 */
export function getCategoryIcon(category: string): Icon {
  const lowerCategory = category.toLowerCase();

  for (const mapping of CATEGORY_ICON_MAP) {
    if (mapping.keywords.some((keyword) => lowerCategory.includes(keyword))) {
      return mapping.icon;
    }
  }

  return Icon.Tag;
}

/**
 * Gets the icon for a payment type (incoming vs outgoing).
 */
export function getPaymentDirectionIcon(isIncoming: boolean): Icon {
  return isIncoming ? Icon.ArrowDown : Icon.ArrowUp;
}

/**
 * Gets the color for a payment type (incoming vs outgoing).
 */
export function getPaymentDirectionColor(isIncoming: boolean): Color {
  return isIncoming ? Color.Green : Color.Red;
}

/**
 * Gets the icon for an account type.
 */
export function getAccountTypeIcon(accountType: string): Icon {
  const type = accountType.toLowerCase();

  if (type.includes("savings")) return Icon.Coins;
  if (type.includes("joint")) return Icon.TwoPeople;
  if (type.includes("external")) return Icon.Globe;

  return Icon.BankNote;
}

/**
 * Gets the icon for a card type.
 */
export function getCardTypeIcon(cardType: string): Icon {
  const type = cardType.toLowerCase();

  if (type.includes("virtual")) return Icon.Desktop;
  if (type.includes("travel")) return Icon.Airplane;

  return Icon.CreditCard;
}
