/**
 * Gumroad API client.
 *
 * gumroad.com/api is rendered client-side, so the docs were read from Gumroad's open-source repository, which is the
 * source of that page (verified 2026-10-08):
 * - https://github.com/antiwork/gumroad/blob/main/app/javascript/components/ApiDocumentation/Endpoints/Sales.tsx
 * - https://github.com/antiwork/gumroad/blob/main/app/javascript/components/ApiDocumentation/responseFieldDefinitions.ts
 * - https://github.com/antiwork/gumroad/blob/main/app/javascript/components/ApiDocumentation/Endpoints/User.tsx
 * - https://github.com/antiwork/gumroad/blob/main/app/javascript/components/ApiDocumentation/Errors.tsx and Scopes.tsx
 * - Implementation of the documented params: app/controllers/api/v2/sales_controller.rb
 *
 * Facts this client relies on:
 * - Base URL https://api.gumroad.com/v2. The token can be sent as a Bearer header (the docs use Bearer auth for
 *   newer endpoints; the OAuth server accepts it everywhere), which keeps it out of URLs.
 * - GET /sales: `after` (YYYY-MM-DD, inclusive: created_at >= date) and `before` (exclusive: created_at < date), both
 *   UTC dates; `email` filter; `page_key` pagination from `next_page_key`. 10 sales per page, newest first.
 * - `price` and `gumroad_fee` are cents in Gumroad's canonical currency, USD ("canonical fields like `price` keep
 *   their USD accounting meaning"). `amount_refundable_in_currency` is a formatted major-unit string in the sale's
 *   own `currency`.
 * - Errors return { success: false, message }; 401 for a bad token.
 */
import { z } from "zod";
import { Http, buildQuery } from "../../core/http";
import { gumroadErrorMessage } from "./schemas";

export const GUMROAD_API = "https://api.gumroad.com/v2";

export class GumroadClient {
  constructor(
    private readonly token: string,
    private readonly http: Http,
  ) {}

  get<T>(path: string, query: Record<string, string | undefined>, schema: z.ZodType<T>): Promise<T> {
    return this.http({
      source: "gumroad",
      url: `${GUMROAD_API}${path}${buildQuery(query)}`,
      headers: { Authorization: `Bearer ${this.token}`, Accept: "application/json" },
      schema,
      errorMessage: gumroadErrorMessage,
    });
  }

  /** Follows `next_page_key` until there is none, `limit` items are read, or `maxPages` is reached. */
  async paginate<T>(
    path: string,
    query: Record<string, string | undefined>,
    schema: z.ZodType<{ sales: T[]; next_page_key?: string | null }>,
    options: { maxPages: number; limit?: number },
  ): Promise<{ items: T[]; truncated: boolean }> {
    const items: T[] = [];
    let pageKey: string | undefined;
    for (let page = 0; page < options.maxPages; page++) {
      const response = await this.get(path, { ...query, page_key: pageKey }, schema);
      items.push(...response.sales);
      if (!response.next_page_key) return { items, truncated: false };
      if (options.limit !== undefined && items.length >= options.limit) return { items, truncated: false };
      pageKey = response.next_page_key;
    }
    return { items, truncated: true };
  }
}
