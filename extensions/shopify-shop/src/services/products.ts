import type { Product } from "../types";

export async function fetchAllProducts(productsUrl: string, signal?: AbortSignal): Promise<Product[]> {
  const products: Product[] = [];
  const seen = new Set<number>();
  const url = new URL(productsUrl);
  url.searchParams.set("limit", "250");

  for (let page = 1; ; page++) {
    signal?.throwIfAborted();
    url.searchParams.set("page", String(page));
    const response = await fetch(url.toString(), { signal });
    if (!response.ok) {
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
    if (json.products.length === 0) return products;

    const previousCount = products.length;
    for (const product of json.products) {
      if (!product || typeof product !== "object" || !Number.isSafeInteger(product.id)) {
        throw new Error("Store returned an invalid products response");
      }
      if (!seen.has(product.id)) {
        seen.add(product.id);
        products.push(product as Product);
      }
    }

    // Some storefronts ignore the page parameter. Do not loop or report a truncated catalog as complete.
    if (products.length === previousCount) {
      throw new Error("Store returned a repeated products page; pagination could not continue");
    }
  }
}
