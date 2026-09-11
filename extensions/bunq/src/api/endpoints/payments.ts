/**
 * Payment-related API endpoints.
 */

import { get, post, put, del } from "../client";
import type { RequestOptions } from "../client";
import {
  PaymentResponseSchema,
  DraftPaymentResponseSchema,
  PaymentBatchResponseSchema,
  ScheduledPaymentResponseSchema,
  NoteTextSchema,
  NoteAttachmentSchema,
  PaginationSchema,
  safeParse,
  type Payment,
  type DraftPayment,
  type DraftPaymentEntry,
  type PaymentBatch,
  type ScheduledPayment,
  type NoteText,
  type NoteAttachment,
  type Pagination,
  type Amount,
  type Pointer,
} from "../schemas";
import { parseResponseItems, parseResponseItem, parseIdResponseOrThrow } from "../response-parser";
import { logger } from "../../lib/logger";

// ============== Pagination Types ==============

/**
 * Options for paginated API requests.
 */
export interface PaginationOptions {
  /** Number of items to fetch (default: 25, max: 200) */
  count?: number;
  /** Cursor for fetching older items */
  olderCursor?: string;
  /** Cursor for fetching newer items */
  newerCursor?: string;
}

/**
 * Result of a paginated API request.
 */
export interface PaginatedResult<T> {
  /** The fetched items */
  items: T[];
  /** Pagination metadata for fetching more results */
  pagination: Pagination | null;
}

/**
 * Extracts pagination info from a bunq API response.
 */
function extractPagination(response: { Pagination?: unknown }): Pagination | null {
  if (!response.Pagination) return null;
  return safeParse(PaginationSchema, response.Pagination, "pagination") ?? null;
}

/**
 * Builds a query string for pagination parameters.
 */
function buildPaginationQuery(options?: PaginationOptions): string {
  if (!options) return "";

  const params: string[] = [];
  if (options.count) params.push(`count=${options.count}`);
  if (options.olderCursor) params.push(`older_id=${options.olderCursor}`);
  if (options.newerCursor) params.push(`newer_id=${options.newerCursor}`);

  return params.length > 0 ? `?${params.join("&")}` : "";
}

// ============== Payment Request Types ==============

/**
 * Payment creation request parameters.
 */
export interface PaymentRequest {
  amount: Amount;
  counterparty_alias: Pointer;
  description: string;
  attachment?: { id: number }[];
  merchant_reference?: string;
}

/**
 * Payment batch creation request.
 */
export interface PaymentBatchRequest {
  payments: PaymentRequest[];
}

/**
 * Draft payment creation request.
 */
export interface DraftPaymentRequest {
  entries: Array<{
    amount: Amount;
    counterparty_alias: Pointer;
    description: string;
    attachment?: { id: number }[];
    merchant_reference?: string;
  }>;
  number_of_required_accepts?: number;
}

/**
 * Scheduled payment creation parameters.
 */
export interface ScheduledPaymentCreate {
  payment: {
    amount: Amount;
    counterparty_alias: Pointer;
    description: string;
    attachment?: { id: number }[];
    merchant_reference?: string;
  };
  schedule: {
    time_start: string;
    time_end?: string;
    recurrence_unit: "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
    recurrence_size: number;
  };
}

// ============== Payment Endpoints ==============

/**
 * Fetches payments for an account with optional pagination.
 */
export async function getPayments(
  userId: string,
  accountId: number,
  options: RequestOptions,
  pagination?: PaginationOptions,
): Promise<PaginatedResult<Payment>> {
  logger.debug("Fetching payments", { userId, accountId, pagination });

  const query = buildPaginationQuery(pagination ?? { count: 50 });
  const response = await get<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/payment${query}`,
    options,
  );

  const payments = parseResponseItems(response, PaymentResponseSchema, "Payment", "payment response");
  const paginationInfo = extractPagination(response as { Pagination?: unknown });

  logger.debug("Fetched payments", { count: payments.length, hasMore: !!paginationInfo?.older_url });
  return { items: payments, pagination: paginationInfo };
}

/**
 * Fetches all payments for an account (legacy function for backward compatibility).
 * @deprecated Use getPayments with pagination options instead
 */
export async function getAllPayments(userId: string, accountId: number, options: RequestOptions): Promise<Payment[]> {
  const result = await getPayments(userId, accountId, options, { count: 200 });
  return result.items;
}

/**
 * Fetches a single payment by ID.
 */
export async function getPayment(
  userId: string,
  accountId: number,
  paymentId: number,
  options: RequestOptions,
): Promise<Payment | null> {
  logger.debug("Fetching payment", { userId, accountId, paymentId });

  const response = await get<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/payment/${paymentId}`,
    options,
  );

  return parseResponseItem(response, PaymentResponseSchema, "Payment", "payment response");
}

/**
 * Creates a new payment.
 */
export async function createPayment(
  userId: string,
  accountId: number,
  payment: PaymentRequest,
  options: RequestOptions,
): Promise<number> {
  logger.info("Creating payment", {
    userId,
    accountId,
    currency: payment.amount.currency,
    recipientType: payment.counterparty_alias.type,
  });

  const response = await post<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/payment`,
    payment,
    { ...options, sign: true },
  );

  const id = parseIdResponseOrThrow(response, "payment");
  logger.info("Payment created", { paymentId: id });
  return id;
}

// ============== Payment Batch Endpoints ==============

/**
 * Creates a batch of payments (multiple payments at once).
 */
export async function createPaymentBatch(
  userId: string,
  accountId: number,
  batch: PaymentBatchRequest,
  options: RequestOptions,
): Promise<number> {
  logger.info("Creating payment batch", {
    userId,
    accountId,
    paymentCount: batch.payments.length,
  });

  const response = await post<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/payment-batch`,
    batch,
    { ...options, sign: true },
  );

  const id = parseIdResponseOrThrow(response, "payment batch");
  logger.info("Payment batch created", { batchId: id });
  return id;
}

/**
 * Fetches payment batches for an account.
 */
export async function getPaymentBatches(
  userId: string,
  accountId: number,
  options: RequestOptions,
): Promise<PaymentBatch[]> {
  logger.debug("Fetching payment batches", { userId, accountId });

  const response = await get<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/payment-batch`,
    options,
  );

  return parseResponseItems(response, PaymentBatchResponseSchema, "PaymentBatch", "payment batch response");
}

// ============== Draft Payment Endpoints ==============

/**
 * Creates a draft payment that requires approval.
 */
export async function createDraftPayment(
  userId: string,
  accountId: number,
  draft: DraftPaymentRequest,
  options: RequestOptions,
): Promise<number> {
  logger.info("Creating draft payment", {
    userId,
    accountId,
    entryCount: draft.entries.length,
  });

  const response = await post<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/draft-payment`,
    draft,
    { ...options, sign: true },
  );

  const id = parseIdResponseOrThrow(response, "draft payment");
  logger.info("Draft payment created", { draftId: id });
  return id;
}

/**
 * Fetches draft payments for an account.
 */
export async function getDraftPayments(
  userId: string,
  accountId: number,
  options: RequestOptions,
): Promise<DraftPayment[]> {
  logger.debug("Fetching draft payments", { userId, accountId });

  const response = await get<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/draft-payment`,
    options,
  );

  const drafts = parseResponseItems(response, DraftPaymentResponseSchema, "DraftPayment", "draft payment response");

  logger.debug("Fetched draft payments", { count: drafts.length });
  return drafts;
}

/**
 * Fetches a single draft payment by ID.
 */
export async function getDraftPayment(
  userId: string,
  accountId: number,
  draftId: number,
  options: RequestOptions,
): Promise<DraftPayment | null> {
  logger.debug("Fetching draft payment", { userId, accountId, draftId });

  const response = await get<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/draft-payment/${draftId}`,
    options,
  );

  return parseResponseItem(response, DraftPaymentResponseSchema, "DraftPayment", "draft payment response");
}

/**
 * Updates a draft payment (e.g., to cancel it).
 */
export async function updateDraftPayment(
  userId: string,
  accountId: number,
  draftId: number,
  update: { status?: "CANCELLED" },
  options: RequestOptions,
): Promise<void> {
  logger.info("Updating draft payment", { userId, accountId, draftId, status: update.status });

  await put(`/user/${userId}/monetary-account/${accountId}/draft-payment/${draftId}`, update, {
    ...options,
    sign: true,
  });

  logger.info("Draft payment updated", { draftId });
}

// ============== Scheduled Payment Endpoints ==============

/**
 * Fetches scheduled payments for an account.
 */
export async function getScheduledPayments(
  userId: string,
  accountId: number,
  options: RequestOptions,
): Promise<ScheduledPayment[]> {
  logger.debug("Fetching scheduled payments", { userId, accountId });

  const response = await get<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/schedule-payment`,
    options,
  );

  const payments = parseResponseItems(
    response,
    ScheduledPaymentResponseSchema,
    "ScheduledPayment",
    "scheduled payment response",
  );

  logger.debug("Fetched scheduled payments", { count: payments.length });
  return payments;
}

/**
 * Creates a new scheduled payment.
 */
export async function createScheduledPayment(
  userId: string,
  accountId: number,
  scheduledPayment: ScheduledPaymentCreate,
  options: RequestOptions,
): Promise<number> {
  logger.info("Creating scheduled payment", {
    userId,
    accountId,
    amount: scheduledPayment.payment.amount.value,
    recurrence: scheduledPayment.schedule.recurrence_unit,
  });

  const response = await post<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/schedule-payment`,
    scheduledPayment,
    { ...options, sign: true },
  );

  const id = parseIdResponseOrThrow(response, "scheduled payment");
  logger.info("Scheduled payment created", { scheduledPaymentId: id });
  return id;
}

/**
 * Cancels a scheduled payment.
 */
export async function cancelScheduledPayment(
  userId: string,
  accountId: number,
  scheduledPaymentId: number,
  options: RequestOptions,
): Promise<void> {
  logger.info("Cancelling scheduled payment", { userId, accountId, scheduledPaymentId });

  await del(`/user/${userId}/monetary-account/${accountId}/schedule-payment/${scheduledPaymentId}`, options);

  logger.info("Scheduled payment cancelled", { scheduledPaymentId });
}

// ============== Payment Notes ==============

/**
 * Adds a text note to a payment.
 */
export async function addPaymentNote(
  userId: string,
  accountId: number,
  paymentId: number,
  content: string,
  options: RequestOptions,
): Promise<number> {
  logger.info("Adding note to payment", { userId, accountId, paymentId });

  const response = await post<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/payment/${paymentId}/note-text`,
    { content },
    { ...options, sign: true },
  );

  return parseIdResponseOrThrow(response, "note");
}

/**
 * Fetches text notes for a payment.
 */
export async function getPaymentNotes(
  userId: string,
  accountId: number,
  paymentId: number,
  options: RequestOptions,
): Promise<NoteText[]> {
  logger.debug("Fetching payment notes", { userId, accountId, paymentId });

  const response = await get<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/payment/${paymentId}/note-text`,
    options,
  );

  if (!Array.isArray(response.Response)) {
    logger.warn("Invalid response structure for payment notes");
    return [];
  }
  const notes: NoteText[] = [];
  for (const item of response.Response) {
    const itemObj = item as Record<string, unknown>;
    if ("NoteText" in itemObj) {
      const parsed = safeParse(NoteTextSchema, itemObj["NoteText"], "note text");
      if (parsed) notes.push(parsed);
    }
  }

  return notes;
}

/**
 * Deletes a text note from a payment.
 */
export async function deletePaymentNote(
  userId: string,
  accountId: number,
  paymentId: number,
  noteId: number,
  options: RequestOptions,
): Promise<void> {
  logger.info("Deleting payment note", { userId, accountId, paymentId, noteId });

  await del(`/user/${userId}/monetary-account/${accountId}/payment/${paymentId}/note-text/${noteId}`, options);

  logger.info("Payment note deleted", { noteId });
}

/**
 * Fetches attachment notes for a payment.
 */
export async function getPaymentAttachments(
  userId: string,
  accountId: number,
  paymentId: number,
  options: RequestOptions,
): Promise<NoteAttachment[]> {
  logger.debug("Fetching payment attachments", { userId, accountId, paymentId });

  const response = await get<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/payment/${paymentId}/note-attachment`,
    options,
  );

  if (!Array.isArray(response.Response)) {
    logger.warn("Invalid response structure for payment attachments");
    return [];
  }
  const attachments: NoteAttachment[] = [];
  for (const item of response.Response) {
    const itemObj = item as Record<string, unknown>;
    if ("NoteAttachment" in itemObj) {
      const parsed = safeParse(NoteAttachmentSchema, itemObj["NoteAttachment"], "note attachment");
      if (parsed) attachments.push(parsed);
    }
  }

  return attachments;
}

// ============== Attachments ==============

/**
 * Uploads an attachment to a monetary account.
 */
export async function uploadAttachment(
  userId: string,
  accountId: number,
  file: { content: string; contentType: string; description: string },
  options: RequestOptions,
): Promise<number> {
  logger.info("Uploading attachment", { userId, accountId, contentType: file.contentType });

  const response = await post<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/attachment`,
    { description: file.description },
    { ...options, sign: true },
  );

  return parseIdResponseOrThrow(response, "attachment");
}

// ============== Helpers ==============

/**
 * Gets the display name for a payment counterparty.
 */
export function getPaymentCounterpartyName(payment: Payment): string {
  return (
    payment.counterparty_alias?.display_name ||
    payment.counterparty_alias?.name ||
    payment.label_monetary_account?.display_name ||
    payment.counterparty_alias?.iban ||
    payment.counterparty_alias?.value ||
    payment.description ||
    "Unknown"
  );
}

/**
 * Checks if a payment is incoming (positive amount).
 */
export function isIncomingPayment(payment: Payment): boolean {
  return parseFloat(payment.amount.value) > 0;
}

// Re-export types
export type {
  Payment,
  DraftPayment,
  DraftPaymentEntry,
  PaymentBatch,
  ScheduledPayment,
  NoteText,
  NoteAttachment,
  Pagination,
  Amount,
  Pointer,
};
