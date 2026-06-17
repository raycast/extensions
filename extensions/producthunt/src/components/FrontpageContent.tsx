import {
  List,
  showToast,
  Toast,
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  openExtensionPreferences,
  open,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { Product } from "../types";
import { ProductListItem } from "./ProductListItem";
import { getFrontpageProducts, FeedReason } from "../api";
import { RELOAD_EXTENSIONS_DEEPLINK } from "../constants";

// Single source of truth for the basic-feed banner copy, so the persistent section subtitle and the
// transient toast tell the same story for each fallback reason.
const FEED_SUBTITLE: Record<FeedReason, string> = {
  "no-credentials": "Basic feed — add API credentials for votes, comments & makers in Preferences",
  "incomplete-credentials": "Missing credentials — showing basic feed. Add both Key & Secret in Preferences",
  "invalid-credentials": "Invalid credentials — showing basic feed. Update your Key & Secret in Preferences",
  "api-error": "Basic feed — the Product Hunt API is unavailable right now",
};

/**
 * Shared component for displaying the frontpage content
 * Used by both the main frontpage command and the FrontpageWrapper
 */
export function FrontpageContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [usingFeed, setUsingFeed] = useState(false);
  const [feedReason, setFeedReason] = useState<FeedReason | undefined>();

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
        setFeedReason(feedReason);
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
        } else if (feedReason === "incomplete-credentials") {
          await showToast({
            style: Toast.Style.Failure,
            title: "Missing credentials. Showing basic feed.",
            message: "Fill in both API Key and Secret, or clear both, in Preferences.",
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
              {/* Apply just-edited API keys: prefs are read once at launch, so reload to pick them up. */}
              <Action
                title="Reload Extension"
                icon={Icon.RotateClockwise}
                onAction={() => open(RELOAD_EXTENSIONS_DEEPLINK)}
              />
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
              {/* Apply just-edited API keys: prefs are read once at launch, so reload to pick them up. */}
              <Action
                title="Reload Extension"
                icon={Icon.RotateClockwise}
                onAction={() => open(RELOAD_EXTENSIONS_DEEPLINK)}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section
          title="Today's Featured Launches"
          subtitle={usingFeed ? FEED_SUBTITLE[feedReason ?? "no-credentials"] : undefined}
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
