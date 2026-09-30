/**
 * Card-related API endpoints.
 */

import { get, post, put } from "../client";
import type { RequestOptions } from "../client";
import {
  CardSchema,
  GeneratedCvc2ResponseSchema,
  MastercardActionResponseSchema,
  PaginationSchema,
  safeParse,
  type Card as BaseCard,
  type GeneratedCvc2,
  type MastercardAction,
  type Pagination,
} from "../schemas";
import { parseResponseItems, parseResponseItem } from "../response-parser";
import { logger } from "../../lib/logger";
import type { PaginationOptions, PaginatedResult } from "./payments";

// ============== Card Types ==============

export type CardCategory = "CardDebit" | "CardCredit" | "CardPrepaid" | "CardMaestro";

export interface Card extends BaseCard {
  cardCategory: CardCategory;
}

/**
 * Card update request parameters.
 */
export interface CardUpdateRequest {
  status?: "ACTIVE" | "DEACTIVATED" | "LOST" | "STOLEN";
  card_limit?: { daily_limit: string; currency: string }[];
  country_permission?: { country: string; expiry_time?: string }[];
  pin_code_assignment?: { type: string; monetary_account_id?: number }[];
  primary_account_numbers?: string[];
  monetary_account_current_id?: number;
}

// ============== Helper Functions ==============

const CARD_CATEGORY_KEYS: CardCategory[] = ["CardDebit", "CardCredit", "CardPrepaid", "CardMaestro"];

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

/**
 * Extracts pagination info from a bunq API response.
 */
function extractPagination(response: { Pagination?: unknown }): Pagination | null {
  if (!response.Pagination) return null;
  return safeParse(PaginationSchema, response.Pagination, "pagination") ?? null;
}

// ============== Card Endpoints ==============

/**
 * Fetches all cards for a user.
 */
export async function getCards(userId: string, options: RequestOptions): Promise<Card[]> {
  logger.debug("Fetching cards", { userId });

  const response = await get<Record<string, unknown>>(`/user/${userId}/card?count=200`, options);

  logger.debug("Raw card response", { itemCount: response.Response.length });

  const cards: Card[] = [];
  for (const item of response.Response) {
    for (const key of Object.keys(item as Record<string, unknown>)) {
      const value = (item as Record<string, unknown>)[key] as Record<string, unknown>;
      if (value && typeof value === "object" && "id" in value) {
        const parsed = safeParse(CardSchema, value, `card (${key})`);
        if (parsed) {
          const cardCategory: CardCategory = CARD_CATEGORY_KEYS.includes(key as CardCategory)
            ? (key as CardCategory)
            : "CardCredit";
          cards.push({ ...parsed, cardCategory });
        }
      }
    }
  }

  logger.debug("Fetched cards", { count: cards.length });
  return cards;
}

/**
 * Updates a card's status or settings.
 */
export async function updateCard(
  userId: string,
  cardId: number,
  update: CardUpdateRequest,
  options: RequestOptions,
): Promise<void> {
  logger.info("Updating card", { userId, cardId, status: update.status });

  await put(`/user/${userId}/card/${cardId}`, update, { ...options, sign: true });

  logger.info("Card updated", { cardId });
}

// ============== CVC2 Endpoints ==============

/**
 * Generates a new CVC2 code for a card.
 */
export async function generateCardCvc2(
  userId: string,
  cardId: number,
  options: RequestOptions,
): Promise<GeneratedCvc2> {
  logger.info("Generating CVC2 for card", { userId, cardId });

  const response = await post<Record<string, unknown>>(
    `/user/${userId}/card/${cardId}/generated-cvc2`,
    {},
    { ...options, sign: true },
  );

  const cvc2 = parseResponseItem(response, GeneratedCvc2ResponseSchema, "CardGeneratedCvc2", "generated CVC2 response");
  if (!cvc2) throw new Error("No CVC2 in response");

  logger.info("CVC2 generated", { cardId });
  return cvc2;
}

/**
 * Fetches generated CVC2 codes for a card.
 */
export async function getCardCvc2(userId: string, cardId: number, options: RequestOptions): Promise<GeneratedCvc2[]> {
  logger.debug("Fetching card CVC2", { userId, cardId });

  const response = await get<Record<string, unknown>>(`/user/${userId}/card/${cardId}/generated-cvc2`, options);

  return parseResponseItems(response, GeneratedCvc2ResponseSchema, "CardGeneratedCvc2", "generated CVC2 response");
}

// ============== Mastercard Action Endpoints ==============

/**
 * Fetches Mastercard actions (card transactions) for an account.
 */
export async function getMastercardActions(
  userId: string,
  accountId: number,
  options: RequestOptions,
  pagination?: PaginationOptions,
): Promise<PaginatedResult<MastercardAction>> {
  logger.debug("Fetching Mastercard actions", { userId, accountId, pagination });

  const query = buildPaginationQuery(pagination ?? { count: 50 });
  const response = await get<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/mastercard-action${query}`,
    options,
  );

  const actions = parseResponseItems(
    response,
    MastercardActionResponseSchema,
    "MasterCardAction",
    "Mastercard action response",
  );
  const paginationInfo = extractPagination(response as { Pagination?: unknown });

  logger.debug("Fetched Mastercard actions", { count: actions.length });
  return { items: actions, pagination: paginationInfo };
}

/**
 * Fetches Mastercard actions for a specific card.
 */
export async function getMastercardActionsForCard(
  userId: string,
  accountId: number,
  cardId: number,
  options: RequestOptions,
  pagination?: PaginationOptions,
): Promise<PaginatedResult<MastercardAction>> {
  logger.debug("Fetching Mastercard actions for card", { userId, accountId, cardId, pagination });

  const query = buildPaginationQuery(pagination ?? { count: 100 });
  const response = await get<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/mastercard-action${query}`,
    options,
  );

  const allActions = parseResponseItems(
    response,
    MastercardActionResponseSchema,
    "MasterCardAction",
    "Mastercard action response",
  );

  // Filter by card ID
  const actions = allActions.filter((action) => action.card_id === cardId);
  const paginationInfo = extractPagination(response as { Pagination?: unknown });

  logger.debug("Fetched Mastercard actions for card", { count: actions.length, cardId });
  return { items: actions, pagination: paginationInfo };
}

/**
 * Fetches a single Mastercard action by ID.
 */
export async function getMastercardAction(
  userId: string,
  accountId: number,
  actionId: number,
  options: RequestOptions,
): Promise<MastercardAction | null> {
  logger.debug("Fetching Mastercard action", { userId, accountId, actionId });

  const response = await get<Record<string, unknown>>(
    `/user/${userId}/monetary-account/${accountId}/mastercard-action/${actionId}`,
    options,
  );

  return parseResponseItem(response, MastercardActionResponseSchema, "MasterCardAction", "Mastercard action response");
}

// Re-export types
export type { GeneratedCvc2, MastercardAction };
