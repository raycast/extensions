import { Action, ActionPanel, Icon, List, popToRoot, launchCommand, LaunchType } from "@raycast/api";
import { useEffect, useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { useWooCommerce } from "../hooks/useWooCommerce";
import type { WooProduct, WooStore } from "../types/types";
import { formatCurrency } from "../helpers/formatters";

type WooProductFilterStatus = WooProduct["status"] | "any";

export function SearchProducts({ store }: { store: WooStore }) {
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState<WooProductFilterStatus>("any");
  const {
    data: products,
    isLoading,
    error,
  } = useWooCommerce<WooProduct[]>(store, "products", {
    per_page: "20",
    search: searchText,
    status: filterStatus,
  });

  useEffect(() => {
    if (!error) return;
    console.error(error);
    void showFailureToast({
      title: "Error Fetching Products",
      message: error.message || "Please check your store settings and try again.",
    });
  }, [error]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search products..."
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by status"
          onChange={(value) => setFilterStatus(value as WooProductFilterStatus)}
          value={filterStatus}
        >
          <List.Dropdown.Item title="Any" value="any" />
          <List.Dropdown.Item title="Draft" value="draft" />
          <List.Dropdown.Item title="Pending" value="pending" />
          <List.Dropdown.Item title="Private" value="private" />
          <List.Dropdown.Item title="Publish" value="publish" />
        </List.Dropdown>
      }
    >
      {products?.map((product) => (
        <ProductListItem key={product.id} product={product} store={store} />
      ))}

      {!isLoading && error && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to Load Products"
          description={error.message || "Please check your store settings and try again."}
          actions={
            <ActionPanel>
              <Action
                title="Manage Stores"
                icon={Icon.Gear}
                onAction={() =>
                  launchCommand({
                    name: "manage-stores",
                    type: LaunchType.UserInitiated,
                  })
                }
              />
            </ActionPanel>
          }
        />
      )}

      {!isLoading && !error && products?.length === 0 && (
        <List.EmptyView title="No Products Found" description="Try a different search term or status filter." />
      )}
    </List>
  );
}

function ProductListItem({ product, store }: { product: WooProduct; store: WooStore }) {
  let price = "";
  if (!product.price) {
    price = "-";
  } else if (product.type === "bundle") {
    const minPrice = formatCurrency(product.bundle_price?.price.min.excl_tax ?? "-", store);
    const maxPrice = formatCurrency(product.bundle_price?.price.max.excl_tax ?? "-", store);
    price = minPrice === maxPrice ? minPrice : `${minPrice} - ${maxPrice}`;
  } else {
    price = formatCurrency(product.price, store);
  }

  const stockStatus = product.stock_status ?? "";
  const accessories = [{ text: stockStatus }, { text: price }];

  return (
    <List.Item
      key={product.id}
      icon={product.images?.[0]?.src ? { source: product.images[0].src } : undefined}
      title={product.name}
      subtitle={product.sku || product.type || ""}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in WooCommerce"
            url={`${store.storeUrl}/wp-admin/post.php?post=${product.id}&action=edit`}
            onOpen={() => popToRoot()}
          />
        </ActionPanel>
      }
    />
  );
}
