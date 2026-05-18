import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { searchExtensions, formatPrice, getLocalizedValue } from "./api";
import { WooProduct } from "./types";

// Get product type label
function getProductType(product: WooProduct): {
  label: string;
  color: Color;
  icon: Icon;
} {
  if (product.is_theme) {
    return { label: "Theme", color: Color.Blue, icon: Icon.AppWindow };
  }
  if (product.is_business_service) {
    return { label: "Service", color: Color.Orange, icon: Icon.Globe };
  }
  return { label: "Extension", color: Color.Purple, icon: Icon.Plug };
}

// Get vendor URL
function getVendorUrl(product: WooProduct): string | null {
  if (product.vendor_slug) {
    return `https://woocommerce.com/vendor/${product.vendor_slug}/`;
  }
  return null;
}

export default function SearchExtensions() {
  const [searchText, setSearchText] = useState("");

  const {
    data: results,
    isLoading,
    error,
  } = useCachedPromise(
    async (query: string) => {
      if (!query.trim()) return [];
      return searchExtensions(query);
    },
    [searchText],
    {
      keepPreviousData: true,
    },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search WooCommerce.com..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {error && (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Search Error"
          description={error instanceof Error ? error.message : "Search failed"}
        />
      )}

      {!error && searchText.trim() === "" && (
        <List.EmptyView
          icon={{ source: Icon.MagnifyingGlass }}
          title="Search WooCommerce.com Marketplace"
          description="Start typing to search themes and extensions"
        />
      )}

      {!error &&
        searchText.trim() !== "" &&
        (!results || results.length === 0) &&
        !isLoading && (
          <List.EmptyView
            icon={{ source: Icon.XMarkCircle }}
            title="No Results"
            description={`No products found for "${searchText}"`}
          />
        )}

      {(results || []).map((product) => {
        const title = getLocalizedValue(product.title);
        const permalink = getLocalizedValue(product.permalink);
        const productType = getProductType(product);
        const vendorUrl = getVendorUrl(product);
        const icon = product.image_app_icon || product.image;

        return (
          <List.Item
            key={product.objectID}
            icon={
              icon
                ? { source: icon }
                : { source: productType.icon, tintColor: productType.color }
            }
            title={title}
            accessories={[
              // Product type - subtle text instead of prominent badge
              { text: productType.label, icon: productType.icon },
              // Vendor with "by:" prefix
              ...(product.vendor_name
                ? [{ text: `by: ${product.vendor_name}`, icon: Icon.Person }]
                : []),
              // Price with coin icon
              ...(product.price
                ? [{ text: formatPrice(product.price), icon: Icon.Coins }]
                : []),
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    url={permalink}
                    title="Open Product Page"
                  />
                  {vendorUrl && (
                    <Action.OpenInBrowser
                      url={vendorUrl}
                      title={`Open ${product.vendor_name || "Vendor"} Profile`}
                      icon={Icon.Person}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    content={permalink}
                    title="Copy Product URL"
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    content={title}
                    title="Copy Title"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  {vendorUrl && (
                    <Action.CopyToClipboard
                      content={vendorUrl}
                      title="Copy Vendor URL"
                      shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                    />
                  )}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
