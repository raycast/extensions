/**
 * Lemon Squeezy API client.
 *
 * Docs used (verified 2026-10-08):
 * - Requests, headers, pagination (page[number], page[size] 1..100): https://docs.lemonsqueezy.com/api/getting-started/requests
 * - Orders: https://docs.lemonsqueezy.com/api/orders/the-order-object and /api/orders/list-all-orders
 * - Subscription invoices: https://docs.lemonsqueezy.com/api/subscription-invoices/the-subscription-invoice-object
 *   and /api/subscription-invoices/list-all-subscription-invoices
 * - Subscriptions: https://docs.lemonsqueezy.com/api/subscriptions/the-subscription-object and /list-all-subscriptions
 * - Prices: https://docs.lemonsqueezy.com/api/prices/the-price-object
 * - Stores: https://docs.lemonsqueezy.com/api/stores/the-store-object
 * - Customers: https://docs.lemonsqueezy.com/api/customers/list-all-customers
 * - Rate limit: 300 requests per minute, 429 when exceeded (API reference).
 *
 * Auth: `Authorization: Bearer <key>` with `Accept`/`Content-Type: application/vnd.api+json`.
 * Amounts: integers in cents of the object's `currency`. Lists are sorted by `created_at` descending.
 */
import { z } from "zod";
import { Http, buildQuery } from "../../core/http";
import { lemonSqueezyErrorMessage } from "./schemas";

export const LEMON_SQUEEZY_API = "https://api.lemonsqueezy.com/v1";
export const LS_PAGE_SIZE = 100;

type ListResponse<A> = {
  data: Array<{ id: string; type: string; attributes: A }>;
  meta: { page: { currentPage: number; lastPage: number } };
};

export class LemonSqueezyClient {
  constructor(
    private readonly apiKey: string,
    private readonly http: Http,
  ) {}

  get<T>(path: string, query: Record<string, string | number | undefined>, schema: z.ZodType<T>): Promise<T> {
    return this.http({
      source: "lemonsqueezy",
      url: `${LEMON_SQUEEZY_API}${path}${buildQuery(query)}`,
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      schema,
      errorMessage: lemonSqueezyErrorMessage,
    });
  }

  /**
   * Walks newest-first pages. `stop` is called with each page's items and returns true once the caller has
   * everything it needs (for example, the last item is older than the range). Returns whether more pages were left
   * unread because `maxPages` was reached.
   */
  async paginate<A>(
    path: string,
    query: Record<string, string | number | undefined>,
    schema: z.ZodType<ListResponse<A>>,
    options: { maxPages: number; pageSize?: number; stop?: (items: ListResponse<A>["data"]) => boolean },
  ): Promise<{ items: ListResponse<A>["data"]; truncated: boolean }> {
    const items: ListResponse<A>["data"] = [];
    for (let page = 1; page <= options.maxPages; page++) {
      const response = await this.get(
        path,
        { ...query, "page[number]": page, "page[size]": options.pageSize ?? LS_PAGE_SIZE },
        schema,
      );
      items.push(...response.data);
      const isLast = response.meta.page.currentPage >= response.meta.page.lastPage || response.data.length === 0;
      if (isLast || options.stop?.(response.data)) {
        return { items, truncated: false };
      }
    }
    return { items, truncated: true };
  }
}
