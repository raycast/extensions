/**
 * Response parsing utilities for bunq API responses.
 *
 * These utilities reduce boilerplate in endpoint functions by providing
 * generic functions for parsing wrapped API responses.
 */

import type { z } from "zod";
import { safeParse, IdResponseSchema } from "./schemas";

/**
 * bunq API response structure with a Response array.
 */
interface BunqResponse {
  Response: unknown[];
  Pagination?: unknown;
}

/**
 * Parses a list of items from a bunq API response.
 *
 * @param response - The raw API response
 * @param schema - The Zod schema for the wrapped response (e.g., PaymentResponseSchema)
 * @param key - The key to extract from the parsed object (e.g., "Payment")
 * @param context - Description for error logging
 * @returns Array of parsed items
 *
 * @example
 * // Before:
 * const payments: Payment[] = [];
 * for (const item of response.Response) {
 *   const parsed = safeParse(PaymentResponseSchema, item, "payment response");
 *   if (parsed?.Payment) payments.push(parsed.Payment);
 * }
 * return payments;
 *
 * // After:
 * return parseResponseItems(response, PaymentResponseSchema, "Payment", "payment response");
 */
export function parseResponseItems<
  TSchema extends z.ZodType<Record<string, unknown>>,
  TKey extends keyof z.infer<TSchema>,
>(response: BunqResponse, schema: TSchema, key: TKey, context: string): NonNullable<z.infer<TSchema>[TKey]>[] {
  const items: NonNullable<z.infer<TSchema>[TKey]>[] = [];

  for (const item of response.Response) {
    const parsed = safeParse(schema, item, context);
    if (parsed) {
      const value = (parsed as Record<string, unknown>)[key as string];
      if (value) {
        items.push(value as NonNullable<z.infer<TSchema>[TKey]>);
      }
    }
  }

  return items;
}

/**
 * Parses a single item from a bunq API response.
 *
 * @param response - The raw API response
 * @param schema - The Zod schema for the wrapped response
 * @param key - The key to extract from the parsed object
 * @param context - Description for error logging
 * @returns The parsed item or null if not found
 *
 * @example
 * // Before:
 * for (const item of response.Response) {
 *   const parsed = safeParse(PaymentResponseSchema, item, "payment response");
 *   if (parsed?.Payment) return parsed.Payment;
 * }
 * return null;
 *
 * // After:
 * return parseResponseItem(response, PaymentResponseSchema, "Payment", "payment response");
 */
export function parseResponseItem<
  TSchema extends z.ZodType<Record<string, unknown>>,
  TKey extends keyof z.infer<TSchema>,
>(response: BunqResponse, schema: TSchema, key: TKey, context: string): z.infer<TSchema>[TKey] | null {
  for (const item of response.Response) {
    const parsed = safeParse(schema, item, context);
    if (parsed) {
      const value = (parsed as Record<string, unknown>)[key as string];
      if (value) {
        return value as z.infer<TSchema>[TKey];
      }
    }
  }

  return null;
}

/**
 * Parses an ID from a bunq API response (used for create/update operations).
 *
 * @param response - The raw API response
 * @param context - Description for error logging
 * @returns The ID or null if not found
 *
 * @example
 * // Before:
 * for (const item of response.Response) {
 *   const parsed = safeParse(IdResponseSchema, item, "payment ID response");
 *   if (parsed?.Id) return parsed.Id.id;
 * }
 * throw new Error("No payment ID received");
 *
 * // After:
 * const id = parseIdResponse(response, "payment ID response");
 * if (!id) throw new Error("No payment ID received");
 * return id;
 */
export function parseIdResponse(response: BunqResponse, context: string): number | null {
  for (const item of response.Response) {
    const parsed = safeParse(IdResponseSchema, item, context);
    if (parsed?.Id) {
      return parsed.Id.id;
    }
  }

  return null;
}

/**
 * Parses an ID from a bunq API response, throwing if not found.
 *
 * @param response - The raw API response
 * @param context - Description for error messages
 * @returns The ID
 * @throws Error if no ID found in response
 *
 * @example
 * // Before:
 * for (const item of response.Response) {
 *   const parsed = safeParse(IdResponseSchema, item, "payment ID response");
 *   if (parsed?.Id) return parsed.Id.id;
 * }
 * throw new Error("No payment ID received");
 *
 * // After:
 * return parseIdResponseOrThrow(response, "payment");
 */
export function parseIdResponseOrThrow(response: BunqResponse, context: string): number {
  const id = parseIdResponse(response, `${context} ID response`);
  if (id === null) {
    throw new Error(`No ${context} ID received`);
  }
  return id;
}

/**
 * Parses items with multiple possible wrapper keys (e.g., different account types).
 *
 * @param response - The raw API response
 * @param schema - The Zod schema for the wrapped response
 * @param keys - Array of possible keys to extract
 * @param context - Description for error logging
 * @returns Array of parsed items with their wrapper key
 *
 * @example
 * // For responses like: [{MonetaryAccountBank: {...}}, {MonetaryAccountSavings: {...}}]
 * return parseResponseItemsMultiKey(
 *   response,
 *   MonetaryAccountResponseSchema,
 *   ["MonetaryAccountBank", "MonetaryAccountSavings", "MonetaryAccountJoint"],
 *   "monetary account"
 * );
 */
export function parseResponseItemsMultiKey<
  TSchema extends z.ZodType<Record<string, unknown>>,
  TKey extends keyof z.infer<TSchema>,
>(
  response: BunqResponse,
  schema: TSchema,
  keys: TKey[],
  context: string,
): Array<{ item: NonNullable<z.infer<TSchema>[TKey]>; key: TKey }> {
  const results: Array<{ item: NonNullable<z.infer<TSchema>[TKey]>; key: TKey }> = [];

  for (const item of response.Response) {
    const parsed = safeParse(schema, item, context);
    if (parsed) {
      const parsedObj = parsed as Record<string, unknown>;
      for (const key of keys) {
        const value = parsedObj[key as string];
        if (value) {
          results.push({ item: value as NonNullable<z.infer<TSchema>[TKey]>, key });
          break;
        }
      }
    }
  }

  return results;
}
