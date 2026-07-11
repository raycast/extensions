/**
 * Request-related API endpoints (payment requests and bunq.me tabs).
 */

import { get, post, put } from "../client";
import type { RequestOptions } from "../client";
import {
  RequestInquiryResponseSchema,
  RequestInquiryBatchResponseSchema,
  RequestResponseResponseSchema,
  BunqMeTabResponseSchema,
  IdResponseSchema,
  safeParse,
  type RequestInquiry,
  type RequestInquiryBatch,
  type RequestResponse,
  type BunqMeTab,
  type Amount,
  type Pointer,
} from "../schemas";
import { parseResponseItems, parseIdResponseOrThrow } from "../response-parser";
import { logger } from "../../lib/logger";

// ============== Request Inquiry Types ==============

/**
 * Request inquiry creation parameters.
 */
export interface RequestInquiryCreate {
  amount_inquired: Amount;
  counterparty_alias: Pointer;
  description: string;
  allow_bunqme: boolean;
  redirect_url?: string;
  minimum_age?: number;
  require_address?: "BILLING" | "SHIPPING" | "BILLING_SHIPPING";
  merchant_reference?: string;
}

/**
 * BunqMe tab creation parameters.
 */
export interface BunqMeTabCreate {
  bunqme_tab_entry: {
    amount_inquired?: Amount;
    description: string;
    redirect_url?: string;
    merchant_reference?: string;
  };
}

// ============== Request Inquiry Endpoints ==============

/**
 * Fetches payment requests for an account.
 */
export async function getRequestInquiries(
  userId: string,
  accountId: number,
  options: RequestOptions,
): Promise<RequestInquiry[]> {
  logger.debug("Fetching request inquiries", { userId, accountId });

  const response = await get<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/request-inquiry`,
    options,
  );

  const requests = parseResponseItems(
    response,
    RequestInquiryResponseSchema,
    "RequestInquiry",
    "request inquiry response",
  );

  logger.debug("Fetched request inquiries", { count: requests.length });
  return requests;
}

/**
 * Creates a new payment request.
 */
export async function createRequestInquiry(
  userId: string,
  accountId: number,
  request: RequestInquiryCreate,
  options: RequestOptions,
): Promise<number> {
  logger.info("Creating request inquiry", {
    userId,
    accountId,
    amount: request.amount_inquired.value,
  });

  const response = await post<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/request-inquiry`,
    request,
    { ...options, sign: true },
  );

  const id = parseIdResponseOrThrow(response, "request inquiry");
  logger.info("Request inquiry created", { requestId: id });
  return id;
}

/**
 * Revokes/cancels a payment request.
 */
export async function revokeRequestInquiry(
  userId: string,
  accountId: number,
  requestId: number,
  options: RequestOptions,
): Promise<void> {
  logger.info("Revoking request inquiry", { userId, accountId, requestId });

  await put(
    `/user/${userId}/monetary-account/${accountId}/request-inquiry/${requestId}`,
    { status: "REVOKED" },
    { ...options, sign: true },
  );

  logger.info("Request inquiry revoked", { requestId });
}

// ============== Request Inquiry Batch Endpoints ==============

/**
 * Creates a batch of payment requests.
 */
export async function createRequestInquiryBatch(
  userId: string,
  accountId: number,
  requests: RequestInquiryCreate[],
  options: RequestOptions,
): Promise<number> {
  logger.info("Creating request inquiry batch", {
    userId,
    accountId,
    requestCount: requests.length,
  });

  const response = await post<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/request-inquiry-batch`,
    { request_inquiries: requests },
    { ...options, sign: true },
  );

  const id = parseIdResponseOrThrow(response, "request inquiry batch");
  logger.info("Request inquiry batch created", { batchId: id });
  return id;
}

/**
 * Fetches request inquiry batches for an account.
 */
export async function getRequestInquiryBatches(
  userId: string,
  accountId: number,
  options: RequestOptions,
): Promise<RequestInquiryBatch[]> {
  logger.debug("Fetching request inquiry batches", { userId, accountId });

  const response = await get<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/request-inquiry-batch`,
    options,
  );

  return parseResponseItems(
    response,
    RequestInquiryBatchResponseSchema,
    "RequestInquiryBatch",
    "request inquiry batch response",
  );
}

// ============== Request Response Endpoints (Incoming Requests) ==============

/**
 * Fetches incoming payment requests (requests from others to you).
 */
export async function getRequestResponses(
  userId: string,
  accountId: number,
  options: RequestOptions,
): Promise<RequestResponse[]> {
  logger.debug("Fetching request responses", { userId, accountId });

  const response = await get<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/request-response`,
    options,
  );

  const responses = parseResponseItems(
    response,
    RequestResponseResponseSchema,
    "RequestResponse",
    "request response response",
  );

  logger.debug("Fetched request responses", { count: responses.length });
  return responses;
}

/**
 * Accepts or rejects an incoming payment request.
 */
export async function respondToRequest(
  userId: string,
  accountId: number,
  requestResponseId: number,
  response: { status: "ACCEPTED" | "REJECTED"; amount_responded?: Amount },
  options: RequestOptions,
): Promise<void> {
  logger.info("Responding to request", { userId, accountId, requestResponseId, status: response.status });

  await put(`/user/${userId}/monetary-account/${accountId}/request-response/${requestResponseId}`, response, {
    ...options,
    sign: true,
  });

  logger.info("Request response submitted", { requestResponseId });
}

// ============== BunqMe Tab Endpoints ==============

/**
 * Fetches bunq.me payment links for an account.
 */
export async function getBunqMeTabs(userId: string, accountId: number, options: RequestOptions): Promise<BunqMeTab[]> {
  logger.debug("Fetching bunq.me tabs", { userId, accountId });

  const response = await get<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/bunqme-tab`,
    options,
  );

  const tabs = parseResponseItems(response, BunqMeTabResponseSchema, "BunqMeTab", "bunqme tab response");

  logger.debug("Fetched bunq.me tabs", { count: tabs.length });
  return tabs;
}

/**
 * Creates a new bunq.me payment link.
 */
export async function createBunqMeTab(
  userId: string,
  accountId: number,
  tab: BunqMeTabCreate,
  options: RequestOptions,
): Promise<{ id: number; url: string }> {
  logger.info("Creating bunq.me tab", {
    userId,
    accountId,
    hasAmount: !!tab.bunqme_tab_entry.amount_inquired,
  });

  const response = await post<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/bunqme-tab`,
    tab,
    { ...options, sign: true },
  );

  let id: number | undefined;
  let url: string | undefined;

  if (!Array.isArray(response.Response)) {
    logger.error("Invalid response structure for bunqme tab creation");
    throw new Error("Invalid response from API");
  }
  for (const item of response.Response) {
    const idParsed = safeParse(IdResponseSchema, item, "bunqme tab ID response");
    if (idParsed?.Id) {
      id = idParsed.Id.id;
    }

    const tabParsed = safeParse(BunqMeTabResponseSchema, item, "bunqme tab response");
    if (tabParsed?.BunqMeTab) {
      url = tabParsed.BunqMeTab.bunqme_tab_share_url;
      id = tabParsed.BunqMeTab.id;
    }
  }

  if (!id) {
    logger.error("No bunq.me tab ID in response");
    throw new Error("No bunq.me tab ID received");
  }

  logger.info("bunq.me tab created", { tabId: id, hasUrl: !!url });
  return { id, url: url || "" };
}

/**
 * Closes/cancels a bunq.me tab.
 */
export async function closeBunqMeTab(
  userId: string,
  accountId: number,
  tabId: number,
  options: RequestOptions,
): Promise<void> {
  logger.info("Closing bunq.me tab", { userId, accountId, tabId });

  await put(
    `/user/${userId}/monetary-account/${accountId}/bunqme-tab/${tabId}`,
    { status: "CANCELLED" },
    { ...options, sign: true },
  );

  logger.info("bunq.me tab closed", { tabId });
}

// Re-export types
export type { RequestInquiry, RequestInquiryBatch, RequestResponse, BunqMeTab };
