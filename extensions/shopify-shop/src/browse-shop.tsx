import { useState } from "react";
import { ActionPanel, Action, Icon, Grid, Color, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useFetch, useLocalStorage } from "@raycast/utils";
import type { Product } from "./types";
import ProductDetail from "./product-detail";
import { buildStoreOrigin } from "./services/shopify-api";
import { formatPrice, normalizeTags } from "./services/product-mapper";
import { useSearchSuggest, useStoreMeta } from "./services/hooks";

type FetchResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

export default function Command() {
  type ShopifyResponse = {
    products?: Product[];
    product?: Product;
  };
  const [columns] = useState(3);
  const [searchText, setSearchText] = useState("");
  const { storeUrl } = getPreferenceValues<Preferences>();
  const { value: collectionHandle, setValue: setCollectionHandle } = useLocalStorage<string | null>(
    "collectionHandle",
    null,
  );

  type CollectionsRoot = { collections?: { id: number; title: string; handle: string }[] } | null;
  const storeOrigin = buildStoreOrigin(storeUrl);
  const storeMetaResp = useStoreMeta(storeUrl);
  const storeMeta = storeMetaResp.data ?? null;
  const storeCurrency = storeMeta?.currency ?? undefined;

  const collectionsResp = useFetch<CollectionsRoot>(`${storeOrigin}/collections.json`, {
    parseResponse: async (res: FetchResponse) => {
      try {
        return (await res.json()) as CollectionsRoot;
      } catch {
        return null;
      }
    },
    keepPreviousData: true,
  });
  const collections = collectionsResp.data?.collections ?? [];

  const searchSuggest = useSearchSuggest(storeUrl, searchText, ["product"], searchText.length >= 2, storeCurrency);

  const productsUrl = collectionHandle
    ? `${storeOrigin}/collections/${collectionHandle}/products.json?currency=${storeCurrency || "USD"}`
    : `${storeOrigin}/products.json?currency=${storeCurrency || "USD"}`;

  const response = useFetch<ShopifyResponse | null>(productsUrl, {
    parseResponse: async (res: FetchResponse) => {
      if (!res.ok) {
        throw new Error(`Failed to load products (${res.status})`);
      }
      try {
        const json = await res.json();
        return json as ShopifyResponse;
      } catch {
        throw new Error("Store returned an invalid products response");
      }
    },
    keepPreviousData: true,
    execute: !searchText || searchText.length < 2,
  });

  const isLoadingFromFetch = response.isLoading || searchSuggest.isLoading || storeMetaResp.isLoading;
  const resp = response.data ?? null;
  const hasError = Boolean(response.error || searchSuggest.error || storeMetaResp.error || collectionsResp.error);
  const isLoading = isLoadingFromFetch || (resp === null && !searchSuggest.data && !hasError);
  const errorMessage =
    response.error?.message ??
    searchSuggest.error?.message ??
    storeMetaResp.error?.message ??
    collectionsResp.error?.message ??
    null;

  let products: Product[] = [];
  if (searchText.length >= 2 && searchSuggest.data?.resources?.results?.products) {
    products = searchSuggest.data.resources.results.products.map((sp) => ({
      id: sp.id,
      handle: sp.handle,
      title: sp.title,
      vendor: sp.vendor,
      product_type: sp.type,
      tags: sp.tags,
      images: sp.featured_image
        ? [
            {
              id: 0,
              created_at: "",
              position: 1,
              updated_at: "",
              product_id: sp.id,
              variant_ids: [],
              src: sp.featured_image.url,
              width: sp.featured_image.width,
              height: sp.featured_image.height,
            },
          ]
        : [],
      variants: [
        {
          id: 0,
          title: "Default",
          option1: "Default",
          option2: null,
          option3: null,
          requires_shipping: true,
          taxable: true,
          featured_image: null,
          available: sp.available,
          price: sp.price,
          price_currency: storeCurrency ?? undefined,
          grams: 0,
          compare_at_price: null,
          position: 1,
          product_id: sp.id,
          created_at: "",
          updated_at: "",
        },
      ],
    }));
  } else if (resp?.products && Array.isArray(resp.products)) {
    products = resp.products;
  } else if (resp?.product) {
    products = [resp.product];
  }

  async function handleSelectCollection(handle: string | null) {
    try {
      await setCollectionHandle(handle);
      await showToast(Toast.Style.Success, handle ? `Filtered by ${handle}` : "Showing all products");
    } catch {
      await showToast(Toast.Style.Failure, "Failed to set collection filter");
    }
  }

  return (
    <Grid
      columns={columns}
      inset={Grid.Inset.Large}
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search products..."
      searchText={searchText}
      throttle
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Filter by collection"
          storeValue={false}
          defaultValue={collectionHandle ? `by:${collectionHandle}` : "show:__all__"}
          onChange={(v) => {
            if (typeof v !== "string") return;
            if (v.startsWith("by:") || v.startsWith("show:")) {
              const parts = v.split(":");
              const val = parts.slice(1).join(":");
              handleSelectCollection(val === "__all__" ? null : val);
            }
          }}
        >
          <Grid.Dropdown.Section title="Show">
            <Grid.Dropdown.Item key="show:__all__" title="Shop Default" value="show:__all__" />
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Collections">
            <Grid.Dropdown.Item key="by:__all__" title="All Collections" value="by:__all__" />
            {collections.map((c) => (
              <Grid.Dropdown.Item key={`by:${c.handle}`} title={c.title} value={`by:${c.handle}`} />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {!isLoading && errorMessage && <Grid.EmptyView title="Could Not Load Products" description={errorMessage} />}
      {!isLoading &&
        !errorMessage &&
        products.map((p, index) => {
          const key = p.id ?? p.handle ?? p.title ?? `missing-${index}`;
          const firstImage = p.images && p.images.length > 0 ? p.images[0].src : undefined;
          const content = firstImage ? firstImage : { source: Icon.Box, tintColor: Color.PrimaryText };

          const firstVariant = p.variants && p.variants.length > 0 ? p.variants[0] : null;
          const price = formatPrice(firstVariant?.price ?? null, firstVariant?.price_currency ?? storeCurrency);
          const availability = firstVariant?.available ? "Available" : undefined;
          const tags = normalizeTags(p.tags ?? null);
          const subtitle = [price, availability].filter(Boolean).join(" • ");

          return (
            <Grid.Item
              key={String(key)}
              content={content}
              title={p.title}
              subtitle={subtitle}
              keywords={tags}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Open Product Details"
                    icon={Icon.MagnifyingGlass}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    target={<ProductDetail handle={p.handle ?? ""} baseUrl={storeUrl} />}
                  />
                  <Action.CopyToClipboard content={p.handle ?? ""} shortcut={{ modifiers: ["cmd"], key: "c" }} />
                </ActionPanel>
              }
            />
          );
        })}
    </Grid>
  );
}
