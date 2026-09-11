import { useFetch } from "@raycast/utils";
import { buildStoreOrigin, buildRecommendationsUrl, buildSearchSuggestUrl } from "./shopify-api";
import type { SearchSuggestRoot, RecommendationsRoot, StoreMetaRoot } from "../types";

type FetchResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<unknown>;
};

export function useSearchSuggest(
  storeRoute: string,
  query: string,
  resourceTypes: string[] = ["product"],
  enabled = true,
  currency?: string,
) {
  const baseUrl = buildStoreOrigin(storeRoute);
  const searchUrl = query.trim() ? buildSearchSuggestUrl(baseUrl, query, currency, resourceTypes) : null;

  return useFetch<SearchSuggestRoot>(searchUrl ?? "", {
    execute: enabled && !!searchUrl,
    parseResponse: async (response: FetchResponse) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const raw = await response.json();

      if (!raw || typeof raw !== "object") {
        throw new Error("Invalid search suggest response: expected an object");
      }

      const json = raw as Partial<SearchSuggestRoot>;

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
            if (typeof fetch !== "undefined") {
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
                    image: c.image?.src,
                    body: c.description || "",
                  }));

                if (!json.resources)
                  json.resources = { results: {} } as import("../types").SearchSuggestRoot["resources"];
                if (!json.resources.results)
                  json.resources.results = {} as import("../types").SearchSuggestRoot["resources"]["results"];
                json.resources.results.collections = matched;
              }
            }
          } catch {
            // collections fallback is best-effort
          }
        }
      } catch {
        // post-processing is best-effort
      }

      if (!json.resources || typeof json.resources !== "object") {
        throw new Error("Invalid search suggest response: missing 'resources' object");
      }
      if (!json.resources.results || typeof json.resources.results !== "object") {
        throw new Error("Invalid search suggest response: missing 'resources.results' object");
      }

      return json as SearchSuggestRoot;
    },
  });
}

export function useRecommendations(
  storeRoute: string,
  productId: number | undefined,
  enabled = true,
  currency?: string,
) {
  const baseUrl = buildStoreOrigin(storeRoute);
  const recommendationsUrl = productId ? buildRecommendationsUrl(baseUrl, productId, currency) : null;

  return useFetch<RecommendationsRoot>(recommendationsUrl ?? "", {
    execute: enabled && !!recommendationsUrl,
    parseResponse: async (response: FetchResponse) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const json = (await response.json()) as RecommendationsRoot;
      // Normalize prices from cents (integer) to dollars for all ProductJs entries
      return {
        ...json,
        products: json.products.map((p) => ({
          ...p,
          price: p.price / 100,
          price_min: p.price_min / 100,
          price_max: p.price_max / 100,
          compare_at_price: p.compare_at_price !== null ? p.compare_at_price / 100 : null,
          variants: p.variants.map((v) => ({
            ...v,
            price: v.price / 100,
            compare_at_price: v.compare_at_price !== null ? v.compare_at_price / 100 : null,
          })),
        })),
      };
    },
  });
}

export function useStoreMeta(storeRoute: string, enabled = true) {
  const baseUrl = buildStoreOrigin(storeRoute);
  const metaUrl = `${baseUrl}/meta.json`;

  return useFetch<StoreMetaRoot>(metaUrl, {
    execute: enabled,
    parseResponse: async (response: FetchResponse) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const json = await response.json();
      return json as StoreMetaRoot;
    },
  });
}
