/**
 * TransferWise/international transfer endpoints.
 */

import { get, post } from "../client";
import type { RequestOptions } from "../client";
import {
  TransferWiseCurrencyResponseSchema,
  TransferWiseQuoteResponseSchema,
  TransferWiseTransferResponseSchema,
  safeParse,
  type TransferWiseCurrency,
  type TransferWiseQuote,
  type TransferWiseTransfer,
  type Amount,
} from "../schemas";
import { parseResponseItems, parseResponseItem } from "../response-parser";
import { logger } from "../../lib/logger";

// ============== TransferWise Types ==============

/**
 * TransferWise quote request parameters.
 */
export interface TransferWiseQuoteRequest {
  currency_source: string;
  currency_target: string;
  amount_source?: Amount;
  amount_target?: Amount;
}

/**
 * TransferWise transfer creation parameters.
 */
export interface TransferWiseTransferCreate {
  monetary_account_id: number;
  recipient_id: string;
  amount: Amount;
  reference?: string;
}

// ============== TransferWise Currency Endpoints ==============

/**
 * Fetches available currencies for TransferWise transfers.
 */
export async function getTransferWiseCurrencies(
  userId: string,
  options: RequestOptions,
): Promise<TransferWiseCurrency[]> {
  logger.debug("Fetching TransferWise currencies", { userId });

  const response = await get<Record<string, unknown>>(`/user/${userId}/transferwise-currency`, options);

  const currencies = parseResponseItems(
    response,
    TransferWiseCurrencyResponseSchema,
    "TransferwiseCurrency",
    "TransferWise currency response",
  );

  logger.debug("Fetched TransferWise currencies", { count: currencies.length });
  return currencies;
}

// ============== TransferWise Quote Endpoints ==============

/**
 * Fetches a single TransferWise quote by ID.
 */
export async function getTransferWiseQuote(
  userId: string,
  quoteId: number,
  options: RequestOptions,
): Promise<TransferWiseQuote | null> {
  logger.debug("Fetching TransferWise quote", { userId, quoteId });

  const response = await get<Record<string, unknown>>(`/user/${userId}/transferwise-quote/${quoteId}`, options);

  return parseResponseItem(
    response,
    TransferWiseQuoteResponseSchema,
    "TransferwiseQuote",
    "TransferWise quote response",
  );
}

/**
 * Creates a quote for a TransferWise transfer.
 * Note: The API returns only an ID on creation, so we fetch the full quote afterward.
 */
export async function createTransferWiseQuote(
  userId: string,
  request: TransferWiseQuoteRequest,
  options: RequestOptions,
): Promise<TransferWiseQuote> {
  logger.debug("Creating TransferWise quote", {
    userId,
    source: request.currency_source,
    target: request.currency_target,
  });

  const response = await post<Record<string, unknown>>(`/user/${userId}/transferwise-quote`, request, {
    ...options,
    sign: true,
  });

  // API returns {"Id":{"id":...}} on creation, not the full quote
  if (!Array.isArray(response.Response)) {
    throw new Error("Invalid response structure for quote creation");
  }
  let quoteId: number | null = null;
  for (const item of response.Response) {
    const itemObj = item as Record<string, unknown>;
    if (itemObj["Id"] && typeof itemObj["Id"] === "object") {
      const idObj = itemObj["Id"] as Record<string, unknown>;
      if (typeof idObj["id"] === "number") {
        quoteId = idObj["id"];
        break;
      }
    }
  }

  if (!quoteId) {
    throw new Error("No quote ID in response");
  }

  // Fetch the full quote by ID
  const quote = await getTransferWiseQuote(userId, quoteId, options);
  if (!quote) {
    throw new Error("Failed to fetch created quote");
  }

  logger.debug("TransferWise quote created", { id: quote.id, rate: quote.rate });
  return quote;
}

/**
 * Fetches existing TransferWise quotes.
 */
export async function getTransferWiseQuotes(userId: string, options: RequestOptions): Promise<TransferWiseQuote[]> {
  logger.debug("Fetching TransferWise quotes", { userId });

  const response = await get<Record<string, unknown>>(`/user/${userId}/transferwise-quote`, options);

  return parseResponseItems(
    response,
    TransferWiseQuoteResponseSchema,
    "TransferwiseQuote",
    "TransferWise quote response",
  );
}

// ============== TransferWise Transfer Endpoints ==============

/**
 * Fetches TransferWise transfer history.
 * Note: This endpoint may not be available for all users/accounts.
 */
export async function getTransferWiseTransfers(
  userId: string,
  options: RequestOptions,
): Promise<TransferWiseTransfer[]> {
  logger.debug("Fetching TransferWise transfers", { userId });

  try {
    const response = await get<Record<string, unknown>>(`/user/${userId}/transferwise-transfer`, options);

    const transfers = parseResponseItems(
      response,
      TransferWiseTransferResponseSchema,
      "TransferwiseTransfer",
      "TransferWise transfer response",
    );

    logger.debug("Fetched TransferWise transfers", { count: transfers.length });
    return transfers;
  } catch (error) {
    // This endpoint may return 404 if Wise transfers aren't enabled or no history exists
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("404") || errorMessage.includes("Route not found")) {
      logger.debug("TransferWise transfers not available", { userId });
      return [];
    }
    throw error;
  }
}

/**
 * Creates a new TransferWise transfer.
 * Note: This requires additional recipient setup in the bunq app.
 */
export async function createTransferWiseTransfer(
  userId: string,
  transfer: TransferWiseTransferCreate,
  options: RequestOptions,
): Promise<number> {
  logger.info("Creating TransferWise transfer", {
    userId,
    amount: transfer.amount.value,
    currency: transfer.amount.currency,
  });

  const response = await post<Record<string, unknown>>(`/user/${userId}/transferwise-transfer`, transfer, {
    ...options,
    sign: true,
  });

  // Parse the ID from response
  if (!Array.isArray(response.Response)) {
    throw new Error("Invalid response structure for transfer creation");
  }
  for (const item of response.Response) {
    const parsed = safeParse(TransferWiseTransferResponseSchema, item, "TransferWise transfer response");
    if (parsed?.TransferwiseTransfer?.id) {
      const id = parsed.TransferwiseTransfer.id;
      logger.info("TransferWise transfer created", { transferId: id });
      return id;
    }
  }

  throw new Error("No transfer ID in response");
}

/**
 * Fetches a single TransferWise transfer by ID.
 */
export async function getTransferWiseTransfer(
  userId: string,
  transferId: number,
  options: RequestOptions,
): Promise<TransferWiseTransfer | null> {
  logger.debug("Fetching TransferWise transfer", { userId, transferId });

  const response = await get<Record<string, unknown>>(`/user/${userId}/transferwise-transfer/${transferId}`, options);

  return parseResponseItem(
    response,
    TransferWiseTransferResponseSchema,
    "TransferwiseTransfer",
    "TransferWise transfer response",
  );
}

// Re-export types
export type { TransferWiseCurrency, TransferWiseQuote, TransferWiseTransfer };
