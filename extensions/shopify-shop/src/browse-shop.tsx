import { useRef, useState } from "react";
import { ActionPanel, Action, Icon, Grid, Color, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCachedPromise, useFetch, useLocalStorage } from "@raycast/utils";
import type { Product } from "./types";
import ProductDetail from "./product-detail";
import { buildStoreOrigin } from "./services/shopify-api";
import { formatPrice, normalizeTags } from "./services/product-mapper";
import { useSearchSuggest, useStoreMeta } from "./services/hooks";
import { fetchProductsPage, type ProductPageCursor, type ProductPageOptions } from "./services/products";

type FetchResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

export default function Command() {
  const { storeUrl } = getPreferenceValues<Preferences>();
  return <BrowseShop key={storeUrl} storeUrl={storeUrl} />;
}

function BrowseShop({ storeUrl }: { storeUrl: string }) {
  const [columns] = useState(3);
  const [searchText, setSearchText] = useState("");
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
    ? `${storeOrigin}/collections/${encodeURIComponent(collectionHandle)}/products.json?currency=${encodeURIComponent(storeCurrency || "USD")}`
    : `${storeOrigin}/products.json?currency=${encodeURIComponent(storeCurrency || "USD")}`;

  async function handleSelectCollection(handle: string | null) {
    try {
      await setCollectionHandle(handle);
      await showToast(Toast.Style.Success, handle ? `Filtered by ${handle}` : "Showing all products");
    } catch {
      await showToast(Toast.Style.Failure, "Failed to set collection filter");
    }
  }

  return (
    <ProductsGrid
      key={`${productsUrl}:${searchText.length >= 2 ? "search" : "browse"}`}
      productsUrl={productsUrl}
      storeUrl={storeUrl}
      storeCurrency={storeCurrency}
      columns={columns}
      searchText={searchText}
      setSearchText={setSearchText}
      collectionHandle={collectionHandle}
      collections={collections}
      onSelectCollection={handleSelectCollection}
      searchSuggest={searchSuggest}
      isMetadataLoading={storeMetaResp.isLoading}
      backgroundError={storeMetaResp.error?.message ?? collectionsResp.error?.message ?? null}
    />
  );
}

type ProductsGridProps = {
  productsUrl: string;
  storeUrl: string;
  storeCurrency?: string;
  columns: number;
  searchText: string;
  setSearchText: (value: string) => void;
  collectionHandle: string | null | undefined;
  collections: { id: number; title: string; handle: string }[];
  onSelectCollection: (handle: string | null) => Promise<void>;
  searchSuggest: ReturnType<typeof useSearchSuggest>;
  isMetadataLoading: boolean;
  backgroundError: string | null;
};

function ProductsGrid({
  productsUrl,
  storeUrl,
  storeCurrency,
  columns,
  searchText,
  setSearchText,
  collectionHandle,
  collections,
  onSelectCollection,
  searchSuggest,
  isMetadataLoading,
  backgroundError,
}: ProductsGridProps) {
  const abortable = useRef<AbortController | null>(null);
  const loadingMore = useRef(false);
  const pageHasMore = useRef(false);
  const [notice, setNotice] = useState<ProductPageCursor["notice"]>();
  const isSearching = searchText.length >= 2;
  const execute = !isSearching && !isMetadataLoading && !backgroundError;
  const response = useCachedPromise(
    (url: string) => (options: ProductPageOptions) => fetchProductsPage(url, options, abortable.current?.signal),
    [productsUrl],
    {
      abortable,
      execute,
      onData: (_data, options) => {
        loadingMore.current = false;
        const pageNotice = (options?.cursor as ProductPageCursor | undefined)?.notice;
        // Keep completion from reopening when the hook reuses an empty cached first page.
        pageHasMore.current = _data.length > 0 && !pageNotice;
        setNotice(pageNotice);
        if (pageNotice) {
          showToast({
            style: Toast.Style.Failure,
            ...pageNotice,
          });
        }
      },
    },
  );

  const isLoading = isMetadataLoading || (isSearching ? searchSuggest.isLoading : response.isLoading);
  const errorMessage = (isSearching ? searchSuggest.error?.message : response.error?.message) ?? backgroundError;

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
  } else if (searchText.length < 2) {
    products = response.data ?? [];
  }

  function reloadProducts() {
    loadingMore.current = false;
    response.revalidate();
  }

  return (
    <Grid
      navigationTitle={notice ? `Showing ${products.length} Products (Partial Results)` : undefined}
      filtering={!isSearching}
      pagination={
        execute && response.pagination
          ? {
              ...response.pagination,
              hasMore: response.pagination.hasMore && pageHasMore.current && !notice && !response.error,
              onLoadMore: () => {
                if (
                  response.isLoading ||
                  response.error ||
                  loadingMore.current ||
                  !pageHasMore.current ||
                  notice ||
                  !response.pagination?.hasMore
                )
                  return;
                loadingMore.current = true;
                response.pagination.onLoadMore();
              },
            }
          : undefined
      }
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
              onSelectCollection(val === "__all__" ? null : val);
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
      {!errorMessage &&
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
                  {notice && <Action title="Reload Products" icon={Icon.ArrowClockwise} onAction={reloadProducts} />}
                </ActionPanel>
              }
            />
          );
        })}
    </Grid>
  );
}
