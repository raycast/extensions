import { useState } from "react";
import { ActionPanel, Action, List, Color, Icon } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useSearchSuggest, useStoreMeta } from "./services/hooks";
import { DEFAULT_RESOURCE_TYPES } from "./constants/config";
import ProductDetail from "./product-detail";
import { buildStoreOrigin } from "./services/shopify-api";
import { formatPrice, normalizeTags, stripHtml } from "./services/product-mapper";

export default function SearchCommand() {
  const [searchText, setSearchText] = useState("");
  const { value: storeRoute } = useLocalStorage<string | null>("storeRoute", null);

  const storeMetaResp = useStoreMeta(storeRoute ?? "");
  const storeMeta = storeMetaResp.data ?? null;
  const storeCurrency = storeMeta?.currency ?? undefined;

  const { data, isLoading, error } = useSearchSuggest(
    storeRoute ?? "",
    searchText,
    DEFAULT_RESOURCE_TYPES,
    searchText.length >= 2,
  );

  const storeOrigin = buildStoreOrigin(storeRoute ?? undefined);
  const products = data?.resources?.results?.products ?? [];
  const pages = data?.resources?.results?.pages ?? [];
  const collections = data?.resources?.results?.collections ?? [];
  const articles = data?.resources?.results?.articles ?? [];

  const hasResults = products.length > 0 || pages.length > 0 || collections.length > 0 || articles.length > 0;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search products, pages, collections, articles..."
      searchText={searchText}
      throttle
    >
      {searchText.length < 2 && (
        <List.EmptyView
          title="Start Searching"
          description="Type at least 2 characters to search across products, pages, collections, and articles"
          icon={Icon.MagnifyingGlass}
        />
      )}

      {searchText.length >= 2 && !isLoading && error && (
        <List.EmptyView
          title="Search Error"
          description={`Failed to search: ${error.message || "Unknown error"}`}
          icon={Icon.ExclamationMark}
        />
      )}

      {searchText.length >= 2 && !isLoading && !error && !hasResults && (
        <List.EmptyView
          title="No Results"
          description={`No results found for "${searchText}"`}
          icon={Icon.XMarkCircle}
        />
      )}

      {products.length > 0 && (
        <List.Section title="Products" subtitle={`${products.length} result${products.length === 1 ? "" : "s"}`}>
          {products.map((product) => {
            const price = formatPrice(product.price, storeCurrency);
            const availability = product.available ? "Available" : "Out of Stock";
            const subtitle = [price, availability, product.vendor].filter(Boolean).join(" • ");

            return (
              <List.Item
                key={`product-${product.id}`}
                title={product.title}
                subtitle={subtitle}
                icon={{ source: product.featured_image?.url || Icon.Box, tintColor: Color.Blue }}
                accessories={[
                  { tag: { value: product.type || "Product", color: Color.Blue } },
                  ...(normalizeTags(product.tags ?? null).length > 0
                    ? [{ tag: normalizeTags(product.tags ?? null)[0] }]
                    : []),
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Product Details"
                      icon={Icon.MagnifyingGlass}
                      target={<ProductDetail handle={product.handle} baseUrl={storeRoute} />}
                    />
                    <Action.OpenInBrowser url={`${storeOrigin}${product.url}`} />
                    <Action.CopyToClipboard content={product.handle} title="Copy Product Handle" />
                    <Action.CopyToClipboard content={`${storeOrigin}${product.url}`} title="Copy Product URL" />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {pages.length > 0 && (
        <List.Section title="Pages" subtitle={`${pages.length} result${pages.length === 1 ? "" : "s"}`}>
          {pages.map((page) => {
            const bodyText = stripHtml(page.body ?? "");
            const bodyPreview = bodyText.substring(0, 100);

            return (
              <List.Item
                key={`page-${page.id}`}
                title={page.title}
                subtitle={bodyPreview}
                icon={{ source: Icon.Document, tintColor: Color.Green }}
                accessories={[{ tag: { value: "Page", color: Color.Green } }]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={`${storeOrigin}${page.url}`} />
                    <Action.CopyToClipboard content={`${storeOrigin}${page.url}`} title="Copy Page URL" />
                    <Action.CopyToClipboard content={page.handle} title="Copy Page Handle" />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {collections.length > 0 && (
        <List.Section
          title="Collections"
          subtitle={`${collections.length} result${collections.length === 1 ? "" : "s"}`}
        >
          {collections.map((collection) => {
            const bodyText = stripHtml(collection.body ?? "");
            const bodyPreview = bodyText.substring(0, 100);

            return (
              <List.Item
                key={`collection-${collection.id}`}
                title={collection.title}
                subtitle={bodyPreview}
                icon={{
                  source: collection.image || Icon.AppWindowGrid3x3,
                  tintColor: Color.Purple,
                }}
                accessories={[{ tag: { value: "Collection", color: Color.Purple } }]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={`${storeOrigin}${collection.url}`} />
                    <Action.CopyToClipboard content={`${storeOrigin}${collection.url}`} title="Copy Collection URL" />
                    <Action.CopyToClipboard content={collection.handle} title="Copy Collection Handle" />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {articles.length > 0 && (
        <List.Section title="Articles" subtitle={`${articles.length} result${articles.length === 1 ? "" : "s"}`}>
          {articles.map((article) => {
            const bodyText = stripHtml(article.body ?? "");
            const bodyPreview = bodyText.substring(0, 100);
            const authorText = article.author ? ` • By ${article.author}` : "";
            const subtitle = `${bodyPreview}${authorText}`;

            return (
              <List.Item
                key={`article-${article.id}`}
                title={article.title}
                subtitle={subtitle}
                icon={{
                  source: article.image || Icon.Text,
                  tintColor: Color.Orange,
                }}
                accessories={[{ tag: { value: "Article", color: Color.Orange } }]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={`${storeOrigin}${article.url}`} />
                    <Action.CopyToClipboard content={`${storeOrigin}${article.url}`} title="Copy Article URL" />
                    <Action.CopyToClipboard content={article.handle} title="Copy Article Handle" />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
