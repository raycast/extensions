/**
 * Miscellaneous API endpoints (events, notifications, invoices, devices, etc.).
 */

import { get, post, del } from "../client";
import type { RequestOptions } from "../client";
import {
  EventResponseSchema,
  NotificationFilterPushResponseSchema,
  NotificationFilterUrlResponseSchema,
  InvoiceResponseSchema,
  DeviceResponseSchema,
  WhitelistSddResponseSchema,
  TreeProgressResponseSchema,
  BillingContractSubscriptionResponseSchema,
  TransactionCategoryResponseSchema,
  AnnualOverviewResponseSchema,
  CredentialPasswordIpResponseSchema,
  SwitchServicePaymentResponseSchema,
  safeParse,
  type Event,
  type NotificationFilterPush,
  type NotificationFilterUrl,
  type Invoice,
  type DeviceServer,
  type WhitelistSdd,
  type TreeProgress,
  type BillingContractSubscription,
  type TransactionCategory,
  type AnnualOverview,
  type CredentialPasswordIp,
  type SwitchServicePayment,
} from "../schemas";
import { parseResponseItems, parseResponseItem, parseIdResponseOrThrow } from "../response-parser";
import { logger } from "../../lib/logger";
import { maskIban } from "../../lib/redact";

// ============== Event Endpoints ==============

/**
 * Fetches events (activity feed) for a user.
 */
export async function getEvents(
  userId: string,
  options: RequestOptions,
  params?: { count?: number; older_id?: number; newer_id?: number },
): Promise<Event[]> {
  logger.debug("Fetching events", { userId, params });

  const queryParams: string[] = [];
  if (params?.count != null) queryParams.push(`count=${params.count}`);
  if (params?.older_id != null) queryParams.push(`older_id=${params.older_id}`);
  if (params?.newer_id != null) queryParams.push(`newer_id=${params.newer_id}`);

  const query = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
  const response = await get<Record<string, unknown>>(`/user/${userId}/event${query}`, options);

  const events = parseResponseItems(response, EventResponseSchema, "Event", "event response");

  logger.debug("Fetched events", { count: events.length });
  return events;
}

/**
 * Fetches a single event by ID.
 */
export async function getEvent(userId: string, eventId: number, options: RequestOptions): Promise<Event | null> {
  logger.debug("Fetching event", { userId, eventId });

  const response = await get<Record<string, unknown>>(`/user/${userId}/event/${eventId}`, options);

  return parseResponseItem(response, EventResponseSchema, "Event", "event response");
}

// ============== Notification Filter Endpoints ==============

/**
 * Notification filter creation parameters.
 */
export interface NotificationFilterCreate {
  category: string;
  all_user_id?: number;
  all_monetary_account_id?: number;
  notification_delivery_method?: "PUSH" | "URL";
  notification_target?: string;
}

/**
 * Fetches push notification filters for a user.
 */
export async function getNotificationFiltersPush(
  userId: string,
  options: RequestOptions,
): Promise<NotificationFilterPush[]> {
  logger.debug("Fetching notification filters (push)", { userId });

  const response = await get<Record<string, unknown>>(`/user/${userId}/notification-filter-push`, options);

  return parseResponseItems(
    response,
    NotificationFilterPushResponseSchema,
    "NotificationFilterPush",
    "notification filter push response",
  );
}

/**
 * Creates or updates push notification filters.
 */
export async function setNotificationFiltersPush(
  userId: string,
  filters: NotificationFilterCreate[],
  options: RequestOptions,
): Promise<number> {
  logger.info("Setting notification filters (push)", { userId, filterCount: filters.length });

  const response = await post<Record<string, unknown>>(
    `/user/${userId}/notification-filter-push`,
    { notification_filters: filters },
    { ...options, sign: true },
  );

  return parseIdResponseOrThrow(response, "notification filter");
}

/**
 * Deletes a push notification filter.
 */
export async function deleteNotificationFilterPush(
  userId: string,
  filterId: number,
  options: RequestOptions,
): Promise<void> {
  logger.info("Deleting notification filter (push)", { userId, filterId });

  await del(`/user/${userId}/notification-filter-push/${filterId}`, options);

  logger.info("Notification filter deleted", { filterId });
}

// ============== Invoice Endpoints ==============

/**
 * Fetches invoices for a user.
 */
export async function getInvoices(userId: string, options: RequestOptions): Promise<Invoice[]> {
  logger.debug("Fetching invoices", { userId });

  const response = await get<Record<string, unknown>>(`/user/${userId}/invoice`, options);

  return parseResponseItems(response, InvoiceResponseSchema, "Invoice", "invoice response");
}

/**
 * Fetches a single invoice by ID.
 */
export async function getInvoice(userId: string, invoiceId: number, options: RequestOptions): Promise<Invoice | null> {
  logger.debug("Fetching invoice", { userId, invoiceId });

  const response = await get<Record<string, unknown>>(`/user/${userId}/invoice/${invoiceId}`, options);

  return parseResponseItem(response, InvoiceResponseSchema, "Invoice", "invoice response");
}

/**
 * Downloads an invoice PDF.
 */
export async function getInvoicePdf(userId: string, invoiceId: number, options: RequestOptions): Promise<Blob | null> {
  logger.debug("Fetching invoice PDF", { userId, invoiceId });

  const response = await get<Record<string, unknown>>(`/user/${userId}/invoice/${invoiceId}/pdf-content`, options);

  // The response contains the PDF data
  if (response.Response && response.Response.length > 0) {
    const content = response.Response[0] as { content?: string };
    if (content?.content) {
      try {
        // Validate base64 format before decode
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(content.content)) {
          logger.warn("Invalid base64 content in PDF response");
          return null;
        }
        // Convert base64 to blob
        const binaryString = atob(content.content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return new Blob([bytes], { type: "application/pdf" });
      } catch (error) {
        logger.warn("Failed to decode PDF content", { error: error instanceof Error ? error.message : "Unknown" });
        return null;
      }
    }
  }

  return null;
}

// ============== URL Notification Filter Endpoints (Webhooks) ==============

/**
 * Fetches URL notification filters (webhooks) for a user.
 */
export async function getNotificationFilters(
  userId: string,
  options: RequestOptions,
): Promise<NotificationFilterUrl[]> {
  logger.debug("Fetching notification filters (URL)", { userId });

  const response = await get<Record<string, unknown>>(`/user/${userId}/notification-filter-url`, options);

  return parseResponseItems(
    response,
    NotificationFilterUrlResponseSchema,
    "NotificationFilterUrl",
    "notification filter url response",
  );
}

/**
 * Creates a new URL notification filter (webhook).
 */
export async function createNotificationFilter(
  userId: string,
  filter: NotificationFilterCreate,
  options: RequestOptions,
): Promise<number> {
  logger.info("Creating notification filter (URL)", { userId, category: filter.category });

  const response = await post<Record<string, unknown>>(`/user/${userId}/notification-filter-url`, filter, {
    ...options,
    sign: true,
  });

  return parseIdResponseOrThrow(response, "notification filter");
}

/**
 * Deletes a URL notification filter (webhook).
 */
export async function deleteNotificationFilter(
  userId: string,
  filterId: number,
  options: RequestOptions,
): Promise<void> {
  logger.info("Deleting notification filter (URL)", { userId, filterId });

  await del(`/user/${userId}/notification-filter-url/${filterId}`, options);

  logger.info("Notification filter deleted", { filterId });
}

// ============== Device Endpoints ==============

/**
 * Fetches registered devices for a user.
 */
export async function getDevices(_userId: string, options: RequestOptions): Promise<DeviceServer[]> {
  logger.debug("Fetching devices");

  const response = await get<Record<string, unknown>>(`/device-server`, options);

  const devices = parseResponseItems(response, DeviceResponseSchema, "DeviceServer", "device server response");

  logger.debug("Fetched devices", { count: devices.length });
  return devices;
}

/**
 * Deletes a registered device.
 */
export async function deleteDevice(deviceId: number, options: RequestOptions): Promise<void> {
  logger.info("Deleting device", { deviceId });

  await del(`/device-server/${deviceId}`, options);

  logger.info("Device deleted", { deviceId });
}

// ============== Direct Debit Whitelist Endpoints ==============

/**
 * Fetches direct debit whitelists for a monetary account.
 */
export async function getWhitelistSdd(
  userId: string,
  accountId: number,
  options: RequestOptions,
): Promise<WhitelistSdd[]> {
  logger.debug("Fetching whitelist SDD", { userId, accountId });

  const response = await get<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/whitelist-sdd`,
    options,
  );

  if (!Array.isArray(response.Response)) {
    logger.warn("Invalid response structure for whitelist SDD");
    return [];
  }
  const whitelists: WhitelistSdd[] = [];
  for (const item of response.Response) {
    const parsed = safeParse(WhitelistSddResponseSchema, item, "whitelist sdd response");
    if (parsed?.WhitelistSdd) whitelists.push(parsed.WhitelistSdd);
    if (parsed?.WhitelistSddOneOff) whitelists.push(parsed.WhitelistSddOneOff as unknown as WhitelistSdd);
    if (parsed?.WhitelistSddRecurring) whitelists.push(parsed.WhitelistSddRecurring as unknown as WhitelistSdd);
  }

  logger.debug("Fetched whitelist SDD", { count: whitelists.length });
  return whitelists;
}

/**
 * Deletes a direct debit whitelist entry.
 */
export async function deleteWhitelistSdd(
  userId: string,
  accountId: number,
  whitelistId: number,
  options: RequestOptions,
): Promise<void> {
  logger.info("Deleting whitelist SDD", { userId, accountId, whitelistId });

  await del(`/user/${userId}/monetary-account/${accountId}/whitelist-sdd/${whitelistId}`, options);

  logger.info("Whitelist SDD deleted", { whitelistId });
}

// ============== Tree Progress Endpoints ==============

/**
 * Combined tree progress data from various sources.
 */
export interface CombinedTreeProgress {
  total_trees: number;
  card_trees: number;
  referral_trees: number;
  reward_trees: number;
  progress_to_next: number | null;
}

/**
 * Fetches tree progress for a user.
 */
export async function getTreeProgress(userId: string, options: RequestOptions): Promise<CombinedTreeProgress> {
  logger.debug("Fetching tree progress", { userId });

  const response = await get<Record<string, unknown>>(`/user/${userId}/tree-progress`, options);

  let totalTrees = 0;
  let cardTrees = 0;
  let referralTrees = 0;
  let rewardTrees = 0;
  let progressToNext: number | null = null;

  if (Array.isArray(response.Response)) {
    for (const item of response.Response) {
      const parsed = safeParse(TreeProgressResponseSchema, item, "tree progress response");
      if (parsed?.TreeProgressUser) {
        totalTrees = parsed.TreeProgressUser.number_of_tree || 0;
        progressToNext =
          typeof parsed.TreeProgressUser.progress_tree_next === "number"
            ? parsed.TreeProgressUser.progress_tree_next
            : null;
      }
      if (parsed?.TreeProgressCard) {
        cardTrees = parsed.TreeProgressCard.number_of_tree || 0;
      }
      if (parsed?.TreeProgressReferral) {
        referralTrees = parsed.TreeProgressReferral.number_of_tree || 0;
      }
      if (parsed?.TreeProgressReward) {
        rewardTrees = parsed.TreeProgressReward.number_of_tree || 0;
      }
    }
  }

  logger.debug("Fetched tree progress", { totalTrees, cardTrees, referralTrees, rewardTrees });
  return {
    total_trees: totalTrees,
    card_trees: cardTrees,
    referral_trees: referralTrees,
    reward_trees: rewardTrees,
    progress_to_next: progressToNext,
  };
}

// ============== Billing Contract Subscription Endpoints ==============

/**
 * Fetches billing contract subscriptions for a user.
 */
export async function getBillingContractSubscription(
  userId: string,
  options: RequestOptions,
): Promise<BillingContractSubscription[]> {
  logger.debug("Fetching billing contract subscriptions", { userId });

  const response = await get<Record<string, unknown>>(`/user/${userId}/billing-contract-subscription`, options);

  return parseResponseItems(
    response,
    BillingContractSubscriptionResponseSchema,
    "BillingContractSubscription",
    "billing contract subscription response",
  );
}

// ============== Transaction Category Endpoints ==============

/**
 * Fetches the category information for a transaction.
 */
export async function getTransactionCategory(
  userId: string,
  accountId: number,
  paymentId: number,
  options: RequestOptions,
): Promise<TransactionCategory | null> {
  logger.debug("Fetching transaction category", { userId, accountId, paymentId });

  const response = await get<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/payment/${paymentId}/additional-transaction-information-category`,
    options,
  );

  return parseResponseItem(
    response,
    TransactionCategoryResponseSchema,
    "AdditionalTransactionInformationCategory",
    "transaction category response",
  );
}

/**
 * Updates the category of a transaction.
 */
export async function updateTransactionCategory(
  userId: string,
  accountId: number,
  paymentId: number,
  category: string,
  options: RequestOptions,
): Promise<number> {
  logger.info("Updating transaction category", { userId, accountId, paymentId, category });

  const response = await post<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/payment/${paymentId}/additional-transaction-information-category`,
    { category },
    { ...options, sign: true },
  );

  return parseIdResponseOrThrow(response, "transaction category");
}

// ============== Annual Overview Endpoints ==============

/**
 * Requests generation of an annual overview for a specific year.
 */
export async function createAnnualOverview(
  userId: string,
  accountId: number,
  year: number,
  options: RequestOptions,
): Promise<number> {
  logger.info("Creating annual overview", { userId, accountId, year });

  const response = await post<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/export-annual-overview`,
    { year },
    { ...options, sign: true },
  );

  return parseIdResponseOrThrow(response, "annual overview");
}

/**
 * Fetches annual overviews for an account.
 */
export async function getAnnualOverviews(
  userId: string,
  accountId: number,
  options: RequestOptions,
): Promise<AnnualOverview[]> {
  logger.debug("Fetching annual overviews", { userId, accountId });

  const response = await get<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/export-annual-overview`,
    options,
  );

  return parseResponseItems(response, AnnualOverviewResponseSchema, "ExportAnnualOverview", "annual overview response");
}

// ============== IP Whitelist Endpoints ==============

/**
 * Fetches IP whitelist entries for a user.
 */
export async function getIpWhitelist(userId: string, options: RequestOptions): Promise<CredentialPasswordIp[]> {
  logger.debug("Fetching IP whitelist", { userId });

  const response = await get<Record<string, unknown>>(`/user/${userId}/credential-password-ip`, options);

  return parseResponseItems(
    response,
    CredentialPasswordIpResponseSchema,
    "CredentialPasswordIp",
    "credential password ip response",
  );
}

/**
 * Adds an IP address to the whitelist.
 */
export async function addIpToWhitelist(userId: string, ip: string, options: RequestOptions): Promise<number> {
  logger.info("Adding IP to whitelist", { userId, ip });

  const response = await post<Record<string, unknown>>(
    `/user/${userId}/credential-password-ip`,
    { ip },
    { ...options, sign: true },
  );

  return parseIdResponseOrThrow(response, "credential password ip");
}

/**
 * Removes an IP address from the whitelist.
 */
export async function removeIpFromWhitelist(
  userId: string,
  credentialId: number,
  options: RequestOptions,
): Promise<void> {
  logger.info("Removing IP from whitelist", { userId, credentialId });

  await del(`/user/${userId}/credential-password-ip/${credentialId}`, options);

  logger.info("IP removed from whitelist", { credentialId });
}

// ============== Switch Service Endpoints ==============

/**
 * Fetches switch service payments (bank switching).
 */
export async function getSwitchServicePayments(
  userId: string,
  accountId: number,
  options: RequestOptions,
): Promise<SwitchServicePayment[]> {
  logger.debug("Fetching switch service payments", { userId, accountId });

  const response = await get<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/switch-service-payment`,
    options,
  );

  return parseResponseItems(
    response,
    SwitchServicePaymentResponseSchema,
    "SwitchServicePayment",
    "switch service payment response",
  );
}

/**
 * Creates a switch service payment request (initiates bank switch).
 */
export async function createSwitchServicePayment(
  userId: string,
  accountId: number,
  bankIban: string,
  timeStartDesired: string,
  options: RequestOptions,
): Promise<number> {
  logger.info("Creating switch service payment", { userId, accountId, bankIban: maskIban(bankIban) });

  const response = await post<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/switch-service-payment`,
    {
      bank_iban: bankIban,
      time_start_desired: timeStartDesired,
    },
    { ...options, sign: true },
  );

  return parseIdResponseOrThrow(response, "switch service payment");
}

// Re-export types
export type {
  Event,
  NotificationFilterPush,
  NotificationFilterUrl,
  Invoice,
  DeviceServer,
  WhitelistSdd,
  TreeProgress,
  BillingContractSubscription,
  TransactionCategory,
  AnnualOverview,
  CredentialPasswordIp,
  SwitchServicePayment,
};
