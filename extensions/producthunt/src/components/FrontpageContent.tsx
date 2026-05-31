import { List, showToast, Toast, Action, ActionPanel, Icon, Keyboard, openExtensionPreferences } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { Product } from "../types";
import { ProductListItem } from "./ProductListItem";
import { getFrontpageProducts } from "../api";

/**
 * Shared component for displaying the frontpage content
 * Used by both the main frontpage command and the FrontpageWrapper
 */
export function FrontpageContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [usingFeed, setUsingFeed] = useState(false);

  const fetchProducts = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(undefined);
      const { products, error, usingFeed, feedReason } = await getFrontpageProducts({ forceRefresh });

      if (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load products",
          message: error,
        });
        setError(error);
      } else {
        setProducts(products);
        setUsingFeed(Boolean(usingFeed));
        if (feedReason === "invalid-credentials") {
          await showToast({
            style: Toast.Style.Failure,
            title: "Invalid Product Hunt API credentials",
            message: "Showing the limited public feed. Update your API Key/Secret in Preferences.",
            primaryAction: {
              title: "Open Extension Preferences",
              onAction: () => {
                openExtensionPreferences();
              },
            },
          });
        }
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error occurred";
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load products",
        message: errorMessage,
      });
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search products...">
      {error ? (
        <List.EmptyView
          icon="no-view.png"
          title="Something went wrong"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={() => fetchProducts(true)}
              />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action.OpenInBrowser
                title="Create a Product Hunt API App"
                url="https://www.producthunt.com/v2/oauth/applications"
              />
            </ActionPanel>
          }
        />
      ) : products.length === 0 && !isLoading ? (
        <List.EmptyView
          icon="no-view.png"
          title="No featured products found"
          description={usingFeed ? "The feed returned no entries. Try again later." : "Check back later."}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={() => fetchProducts(true)}
              />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section
          title="Today's Featured Launches"
          subtitle={
            usingFeed ? "Basic feed — add API credentials for votes, comments & makers in Preferences" : undefined
          }
        >
          {products.map((product, index) => (
            <ProductListItem
              key={product.id}
              product={product}
              featured={true}
              index={index}
              totalProducts={products.length}
              allProducts={products}
              onRefresh={() => fetchProducts(true)}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
