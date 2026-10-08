/**
 * Stripe API client.
 *
 * Docs used (verified 2026-10-08):
 * - Versioning, current version 2026-09-30.endive: https://docs.stripe.com/api/versioning
 * - Charges list (created[gte|lt], limit 1..100, starting_after/has_more): https://docs.stripe.com/api/charges/list
 * - Charge object: https://docs.stripe.com/api/charges/object
 * - Balance transactions (fee, net in settlement currency): https://docs.stripe.com/api/balance_transactions/object
 * - Refunds: https://docs.stripe.com/api/refunds/object
 * - Disputes: https://docs.stripe.com/api/disputes/object
 * - Subscriptions list (default excludes canceled; status=canceled): https://docs.stripe.com/api/subscriptions/list
 * - Discounts (source.coupon, expandable): https://docs.stripe.com/api/discounts/object
 * - Customers list (email is exact and case-sensitive): https://docs.stripe.com/api/customers/list
 * - Expand (max 4 levels, `data.` prefix for lists): https://docs.stripe.com/expand
 * - Currencies (zero-decimal, three-decimal, ISK/UGX/HUF/TWD special cases): https://docs.stripe.com/currencies
 * - Rate limits (429, 25 req/s per endpoint): https://docs.stripe.com/rate-limits
 * - Restricted keys (rk_live_…, per-resource Read permission): https://docs.stripe.com/keys/restricted-api-keys
 *
 * Auth: `Authorization: Bearer <restricted key>`. Every request pins `Stripe-Version` so field shapes do not change
 * with the account's default version.
 */
import { z } from "zod";
import { Http, buildQuery } from "../../core/http";
import { stripeErrorMessage } from "./schemas";

export const STRIPE_API = "https://api.stripe.com/v1";
export const STRIPE_VERSION = "2026-09-30.endive";
export const STRIPE_PAGE_SIZE = 100;

type Query = Record<string, string | number | undefined | string[]>;

export class StripeClient {
  constructor(
    private readonly apiKey: string,
    private readonly http: Http,
  ) {}

  get<T>(path: string, query: Query, schema: z.ZodType<T>): Promise<T> {
    return this.http({
      source: "stripe",
      url: `${STRIPE_API}${path}${buildQuery(query)}`,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Stripe-Version": STRIPE_VERSION,
        Accept: "application/json",
      },
      schema,
      errorMessage: stripeErrorMessage,
    });
  }

  /** Cursor pagination with `starting_after`. Stops at `limit` items or `maxPages` pages. */
  async list<T extends { id: string }>(
    path: string,
    query: Query,
    schema: z.ZodType<{ data: T[]; has_more: boolean }>,
    options: { maxPages: number; limit?: number },
  ): Promise<{ items: T[]; truncated: boolean }> {
    const items: T[] = [];
    let startingAfter: string | undefined;
    for (let page = 0; page < options.maxPages; page++) {
      const remaining = options.limit !== undefined ? options.limit - items.length : STRIPE_PAGE_SIZE;
      const response = await this.get(
        path,
        { ...query, limit: Math.min(STRIPE_PAGE_SIZE, Math.max(1, remaining)), starting_after: startingAfter },
        schema,
      );
      items.push(...response.data);
      const last = response.data[response.data.length - 1];
      if (!response.has_more || !last) return { items, truncated: false };
      if (options.limit !== undefined && items.length >= options.limit) return { items, truncated: false };
      startingAfter = last.id;
    }
    return { items, truncated: true };
  }
}
