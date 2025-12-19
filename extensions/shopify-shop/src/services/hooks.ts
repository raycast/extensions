import { useFetch } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import { buildStoreOrigin } from "./shopify-api";
import type { SearchSuggestRoot, RecommendationsRoot, ProductJsRoot, StoreMetaRoot } from "../types";

/**
 * Hook to fetch search suggestions from Shopify's search/suggest endpoint
 * @param resourceTypes - Array of resource types to search (product, page, collection, article)
 */
export function useSearchSuggest(
  storeRoute: string,
  query: string,
  resourceTypes: string[] = ["product"],
  enabled = true,
  currency?: string,
) {
  const baseUrl = buildStoreOrigin(storeRoute);
  const resourceParams = resourceTypes.map((type) => `resources[type]=${encodeURIComponent(type)}`).join("&");
  const searchUrl = query.trim()
    ? `${baseUrl}/search/suggest.json?q=${encodeURIComponent(query)}&${resourceParams}&currency=${currency || "USD"}`
    : null;

  return useFetch<SearchSuggestRoot>(searchUrl ?? "", {
    execute: enabled && !!searchUrl,
    parseResponse: async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const raw = await response.json();

      if (!raw || typeof raw !== "object") {
        throw new Error("Invalid search suggest response: expected an object");
      }

      const json = raw as Partial<SearchSuggestRoot>;

      try {
        if (process.env.NODE_ENV !== "production") {
          console.debug("[useSearchSuggest] URL:", searchUrl);
          console.debug("[useSearchSuggest] Response shape:", json);
        }
      } catch (e: unknown) {
        if (process.env.NODE_ENV !== "production") console.warn("[useSearchSuggest] debug log failed", e);
      }

      try {
        const wantsCollections = resourceTypes.includes("collection");
        const hasCollections = !!(
          json &&
          json.resources &&
          json.resources.results &&
          json.resources.results.collections &&
          json.resources.results.collections.length > 0
        );

        if (wantsCollections && !hasCollections && query && query.trim().length > 0) {
          try {
            const collectionsUrl = `${baseUrl}/collections.json`;
            const collResp = await fetch(collectionsUrl);
            if (collResp.ok) {
              const collJson = (await collResp.json()) as { collections?: unknown } | unknown;
              type RawCollection = {
                id: number;
                title: string;
                handle: string;
                description?: string;
                image?: { src: string; alt?: string; width?: number; height?: number };
              };
              const collectionsField =
                collJson && typeof collJson === "object"
                  ? (collJson as { collections?: unknown }).collections
                  : undefined;
              const allCollections: RawCollection[] = Array.isArray(collectionsField)
                ? (collectionsField as RawCollection[])
                : [];
              const q = query.trim().toLowerCase();
              const matched: import("../types").SearchCollection[] = allCollections
                .filter((c) => {
                  const title = (c.title || "").toLowerCase();
                  const handle = (c.handle || "").toLowerCase();
                  return title.includes(q) || handle.includes(q);
                })
                .map((c) => ({
                  id: c.id,
                  title: c.title,
                  handle: c.handle,
                  url: `/collections/${c.handle}`,
                  featured_image: c.image
                    ? {
                        url: c.image.src,
                        alt: c.image.alt ?? "",
                        width: c.image.width ?? 0,
                        height: c.image.height ?? 0,
                      }
                    : undefined,
                  body: c.description || "",
                }));

              if (!json.resources)
                json.resources = { results: {} } as import("../types").SearchSuggestRoot["resources"];
              if (!json.resources.results)
                json.resources.results = {} as import("../types").SearchSuggestRoot["resources"]["results"];
              json.resources.results.collections = matched;
            }
          } catch (err: unknown) {
            if (process.env.NODE_ENV !== "production")
              console.warn("[useSearchSuggest] collections fallback failed", err);
          }
        }
      } catch (err: unknown) {
        if (process.env.NODE_ENV !== "production") console.warn("[useSearchSuggest] post-process failed", err);
      }

      // Validate required structure before returning so callers can rely on required fields
      if (!json.resources || typeof json.resources !== "object") {
        throw new Error("Invalid search suggest response: missing 'resources' object");
      }
      if (!json.resources.results || typeof json.resources.results !== "object") {
        throw new Error("Invalid search suggest response: missing 'resources.results' object");
      }

      return json as SearchSuggestRoot;
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      showToast({
        style: Toast.Style.Failure,
        title: "Search failed",
        message,
      });
    },
  });
}

/**
 * Hook to fetch product recommendations from Shopify's recommendations endpoint
 */
export function useRecommendations(
  storeRoute: string,
  productId: number | undefined,
  enabled = true,
  currency?: string,
) {
  const baseUrl = buildStoreOrigin(storeRoute);
  const recommendationsUrl = productId
    ? `${baseUrl}/recommendations/products.json?product_id=${productId}&currency=${currency || "USD"}`
    : null;

  return useFetch<RecommendationsRoot>(recommendationsUrl ?? "", {
    execute: enabled && !!recommendationsUrl,
    parseResponse: async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const json = await response.json();
      return json as RecommendationsRoot;
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load recommendations",
        message,
      });
    },
  });
}

/**
 * Hook to fetch product in .js format (optimized with integer prices)
 */
export function useProductJs(storeRoute: string, handle: string | undefined, enabled = true) {
  const baseUrl = buildStoreOrigin(storeRoute);
  const productJsUrl = handle ? `${baseUrl}/products/${handle}.js` : null;

  return useFetch<ProductJsRoot>(productJsUrl ?? "", {
    execute: enabled && !!productJsUrl,
    parseResponse: async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const json = await response.json();
      return json as ProductJsRoot;
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load product data",
        message,
      });
    },
  });
}

/**
 * Hook to fetch store metadata (from /meta.json) which contains currency and locale info.
 */
export function useStoreMeta(storeRoute: string, enabled = true) {
  const baseUrl = buildStoreOrigin(storeRoute);
  const metaUrl = `${baseUrl}/meta.json`;

  return useFetch<StoreMetaRoot>(metaUrl, {
    execute: enabled,
    parseResponse: async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const json = await response.json();
      return json as StoreMetaRoot;
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load store metadata",
        message,
      });
    },
  });
}
