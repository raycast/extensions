import type { Product } from "../types";

const PAGE_SIZE = 250;
const PAGINATION_LIMIT = 25000;
// Allow Shopify's accessible pages plus one completion probe, even if a storefront ignores its ceiling.
const MAX_PAGE_REQUESTS = PAGINATION_LIMIT / PAGE_SIZE + 1;

export type ProductPageCursor = {
  url: string;
  seenIds: number[];
  notice?: { title: string; message: string };
};

export type ProductPageOptions = { page: number; cursor?: ProductPageCursor };

export async function fetchProductsPage(
  productsUrl: string,
  { page, cursor }: ProductPageOptions,
  signal?: AbortSignal,
): Promise<{ data: Product[]; hasMore: boolean; cursor: ProductPageCursor }> {
  signal?.throwIfAborted();
  if (!Number.isSafeInteger(page) || page < 0) throw new Error("Invalid products page");
  const previousIds = page === 0 || cursor?.url !== productsUrl ? [] : cursor.seenIds;
  const seen = new Set(previousIds);
  const finish = (title: string, message: string) => ({
    data: [] as Product[],
    hasMore: false,
    cursor: { url: productsUrl, seenIds: [...previousIds], notice: { title, message } },
  });
  const limitMessage = "Loaded products may be incomplete. Select a smaller collection to browse more.";
  if (page >= MAX_PAGE_REQUESTS) return finish("Pagination Limit Reached", limitMessage);

  try {
    if (page > 0 && cursor?.url !== productsUrl) throw new Error("Product pagination changed; reload products");
    const url = new URL(productsUrl);
    url.searchParams.set("limit", String(PAGE_SIZE));
    url.searchParams.set("page", String(page + 1));
    const response = await fetch(url.toString(), { signal });
    signal?.throwIfAborted();
    if (!response.ok) {
      if (response.status === 400 && (page + 1) * PAGE_SIZE > PAGINATION_LIMIT) {
        let errorResponse: unknown;
        try {
          errorResponse = await response.json();
        } catch {
          signal?.throwIfAborted();
        }
        signal?.throwIfAborted();
        if (
          errorResponse &&
          typeof errorResponse === "object" &&
          "errors" in errorResponse &&
          errorResponse.errors === "Page * Limit exceeds the 25000 limit."
        ) {
          return finish("Pagination Limit Reached", limitMessage);
        }
      }
      throw new Error(`Failed to load products (${response.status})`);
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch (error) {
      signal?.throwIfAborted();
      throw new Error("Store returned an invalid products response", { cause: error });
    }
    signal?.throwIfAborted();
    if (!json || typeof json !== "object" || !("products" in json) || !Array.isArray(json.products)) {
      throw new Error("Store returned an invalid products response");
    }

    const data: Product[] = [];
    for (const product of json.products) {
      if (!product || typeof product !== "object" || !Number.isSafeInteger(product.id)) {
        throw new Error("Store returned an invalid products response");
      }
      if (!seen.has(product.id)) {
        seen.add(product.id);
        data.push(product as Product);
      }
    }
    if (json.products.length > 0 && data.length === 0) {
      throw new Error("Store returned a repeated products page; pagination could not continue");
    }
    const exhaustedBudget = json.products.length > 0 && page + 1 === MAX_PAGE_REQUESTS;
    return {
      data,
      hasMore: json.products.length > 0 && !exhaustedBudget,
      cursor: {
        url: productsUrl,
        seenIds: [...seen],
        notice: exhaustedBudget ? { title: "Pagination Limit Reached", message: limitMessage } : undefined,
      },
    };
  } catch (error) {
    signal?.throwIfAborted();
    if (page === 0 || (error instanceof Error && error.name === "AbortError")) throw error;
    // Keep earlier pages in the hook's accumulated data, but stop and explicitly report the failed load.
    return finish("Could Not Load More Products", error instanceof Error ? error.message : "Failed to load products");
  }
}
