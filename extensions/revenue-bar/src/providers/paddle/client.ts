/**
 * Paddle Billing API client.
 *
 * Docs used (verified 2026-10-08; the .md variants of the pages were read):
 * - Base URLs, auth, key format (pdl_live_apikey_… / pdl_sdbx_apikey_…): https://developer.paddle.com/api-reference/about
 * - Versioning header (Paddle-Version: 1): https://developer.paddle.com/api-reference/about/versioning
 * - Rate limiting (240 req/min per IP, 429 + Retry-After, 60s block): https://developer.paddle.com/api-reference/about/rate-limiting
 * - Errors ({ error: { type, code, detail } }): https://developer.paddle.com/api-reference/about/errors
 * - Permissions (transaction.read, subscription.read, adjustment.read, customer.read, discount.read):
 *   https://developer.paddle.com/api-reference/about/permissions
 * - List transactions (billed_at[GTE|LT], status, include=customer,adjustments_totals, per_page max 30):
 *   https://developer.paddle.com/api-reference/transactions/list-transactions
 * - List adjustments (no date filter, order_by id, per_page max 50): https://developer.paddle.com/api-reference/adjustments/list-adjustments
 * - List subscriptions (status, per_page max 200): https://developer.paddle.com/api-reference/subscriptions/list-subscriptions
 * - List customers (email exact match, id list): https://developer.paddle.com/api-reference/customers/list-customers
 * - List discounts (type, amount, recur): https://developer.paddle.com/api-reference/discounts/list-discounts
 *
 * Pagination: cursor in `meta.pagination.next` (URL with `after`), `has_more`.
 * Amounts: integer strings in the lowest denomination of the currency.
 */
import { z } from "zod";
import { Http, buildQuery } from "../../core/http";
import { paddleErrorMessage } from "./schemas";

export const PADDLE_LIVE_API = "https://api.paddle.com";
export const PADDLE_SANDBOX_API = "https://sandbox-api.paddle.com";
export const PADDLE_VERSION = "1";

export type PaddleEnvironment = "live" | "sandbox";

/** Keys say which environment they belong to; the preference is only a fallback for keys that do not. */
export function paddleEnvironment(apiKey: string, preference: string | undefined): PaddleEnvironment {
  if (apiKey.startsWith("pdl_sdbx_")) return "sandbox";
  if (apiKey.startsWith("pdl_live_")) return "live";
  return preference === "sandbox" ? "sandbox" : "live";
}

type Query = Record<string, string | number | undefined>;

export class PaddleClient {
  readonly baseUrl: string;

  constructor(
    private readonly apiKey: string,
    private readonly http: Http,
    environment: PaddleEnvironment,
  ) {
    this.baseUrl = environment === "sandbox" ? PADDLE_SANDBOX_API : PADDLE_LIVE_API;
  }

  get<T>(path: string, query: Query, schema: z.ZodType<T>): Promise<T> {
    return this.http({
      source: "paddle",
      url: `${this.baseUrl}${path}${buildQuery(query)}`,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Paddle-Version": PADDLE_VERSION,
        Accept: "application/json",
      },
      schema,
      errorMessage: paddleErrorMessage,
    });
  }

  /**
   * Follows `meta.pagination.next` by reading its `after` cursor. `stop` lets callers end early (for example when the
   * newest-first list has passed the range start).
   */
  async list<T>(
    path: string,
    query: Query,
    schema: z.ZodType<{ data: T[]; meta: { pagination: { next?: string | null; has_more: boolean } } }>,
    options: { maxPages: number; limit?: number; stop?: (page: T[]) => boolean },
  ): Promise<{ items: T[]; truncated: boolean }> {
    const items: T[] = [];
    let after: string | undefined;
    for (let page = 0; page < options.maxPages; page++) {
      const response = await this.get(path, { ...query, after }, schema);
      items.push(...response.data);
      const { has_more, next } = response.meta.pagination;
      if (!has_more || response.data.length === 0) return { items, truncated: false };
      if (options.limit !== undefined && items.length >= options.limit) return { items, truncated: false };
      if (options.stop?.(response.data)) return { items, truncated: false };
      after = next ? (new URL(next).searchParams.get("after") ?? undefined) : undefined;
      if (!after) return { items, truncated: false };
    }
    return { items, truncated: true };
  }
}
