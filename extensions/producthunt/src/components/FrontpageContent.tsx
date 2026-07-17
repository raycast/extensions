import { List, showToast, Toast, Action, ActionPanel, Icon, Keyboard, open, LocalStorage } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { Product } from "../types";
import { ProductListItem } from "./ProductListItem";
import { getFrontpageProducts, FeedReason } from "../api";
import { RELOAD_EXTENSIONS_DEEPLINK } from "../constants";
import { signIn, signOut, reauthorize, isSignedIn, authErrorToast } from "../api/oauth";
import { failureToast } from "../util/toast";

// Single source of truth for the basic-feed banner copy, so the persistent section subtitle and the
// transient toast tell the same story for each fallback reason.
const FEED_SUBTITLE: Record<FeedReason, string> = {
  "signed-out": "Basic feed — sign in to Product Hunt for votes, comments, makers & your upvotes",
  "auth-rejected": "Basic feed — your sign-in was rejected. Sign in again for full data",
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
  const [signedIn, setSignedIn] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    isSignedIn().then(setSignedIn);
  }, []);

  const fetchProducts = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(undefined);
      const { products, error, usingFeed, feedReason } = await getFrontpageProducts({ forceRefresh });

      if (error) {
        await failureToast("Failed to load products", error);
        setError(error);
      } else {
        setProducts(products);
        setUsingFeed(Boolean(usingFeed));
        setFeedReason(feedReason);
        // A rejected token was cleared server-side by client.ts; reflect that in local auth state
        // so the Account menu shows "Sign in Again" (not a stale "Sign out").
        if (feedReason === "auth-rejected") setSignedIn(false);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error occurred";
      await failureToast("Failed to load products", e);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSignIn = useCallback(async () => {
    try {
      await signIn();
      setSignedIn(true);
      await showToast({ style: Toast.Style.Success, title: "Signed in to Product Hunt" });
      await open(RELOAD_EXTENSIONS_DEEPLINK);
    } catch (error) {
      await authErrorToast("Sign in failed", error);
    }
  }, []);

  const handleReauthorize = useCallback(async () => {
    try {
      await reauthorize();
      setSignedIn(true);
      await showToast({ style: Toast.Style.Success, title: "Signed in to Product Hunt" });
      await open(RELOAD_EXTENSIONS_DEEPLINK);
    } catch (error) {
      await authErrorToast("Sign in failed", error);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      setSignedIn(false);
      await showToast({ style: Toast.Style.Success, title: "Signed out" });
      await open(RELOAD_EXTENSIONS_DEEPLINK);
    } catch (error) {
      await authErrorToast("Sign out failed", error);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const KEY = "v3.0b_signin_notice_shown";
      if (await LocalStorage.getItem<string>(KEY)) return;
      if (await isSignedIn()) {
        await LocalStorage.setItem(KEY, "1");
        return;
      }
      await showToast({
        style: Toast.Style.Success,
        title: "Product Hunt now uses sign-in",
        message: "Sign in to Product Hunt for votes, comments, makers, and your upvotes.",
        primaryAction: {
          title: "Sign in to Product Hunt",
          onAction: () => {
            handleSignIn();
          },
        },
      });
      await LocalStorage.setItem(KEY, "1"); // set only after the toast is shown
    })();
    // Run once on mount; handleSignIn is stable (useCallback with []).
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
              {usingFeed && (
                <Action
                  title={feedReason === "auth-rejected" ? "Sign in Again" : "Sign in to Product Hunt"}
                  icon={Icon.Person}
                  onAction={feedReason === "auth-rejected" ? handleReauthorize : handleSignIn}
                />
              )}
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={() => fetchProducts(true)}
              />
              {/* Reload picks up preference and sign-in changes: state is snapshotted at launch. */}
              <Action
                title="Reload Extension"
                icon={Icon.RotateClockwise}
                onAction={() => open(RELOAD_EXTENSIONS_DEEPLINK)}
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
              {usingFeed && (
                <Action
                  title={feedReason === "auth-rejected" ? "Sign in Again" : "Sign in to Product Hunt"}
                  icon={Icon.Person}
                  onAction={feedReason === "auth-rejected" ? handleReauthorize : handleSignIn}
                />
              )}
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={() => fetchProducts(true)}
              />
              {/* Reload picks up preference and sign-in changes: state is snapshotted at launch. */}
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
          // Signed in → the official API's true Pacific-today list. Signed out → the Atom feed, which
          // is a rolling ~50 most-recent window (its <updated> is stamped to "now" for every entry and
          // <published> is the original creation date), so it can't be filtered to "today" — label it
          // honestly as "Recent Launches" rather than implying it's today's featured set.
          title={usingFeed ? "Recent Launches" : "Today's Featured Launches"}
          subtitle={usingFeed ? FEED_SUBTITLE[feedReason ?? "signed-out"] : undefined}
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
              signedIn={signedIn}
              onSignIn={handleSignIn}
              onSignOut={handleSignOut}
              onReauthorize={feedReason === "auth-rejected" ? handleReauthorize : undefined}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
