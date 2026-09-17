import { Detail, Color, showToast, Toast, open, ActionPanel, Action, Icon } from "@raycast/api";
import { Product } from "../types";
import { generateTopicUrl } from "../util/topicUtils";
import { useState, useEffect, useCallback } from "react";
import { enhanceProductWithMetadata } from "../api";
import { ApiError } from "../api/client";
import { signIn, signOut, reauthorize, isSignedIn, authErrorToast } from "../api/oauth";
import { HOST_URL, RELOAD_EXTENSIONS_DEEPLINK } from "../constants";
import { ProductActions, ViewContext } from "./ProductActions";
import { cleanText } from "../util/textUtils";
import { renderStarRating } from "../util/format";
import { logger } from "@chrismessina/raycast-logger";

const log = logger.child("[ProductHuntDetail]");

interface ProductDetailViewProps {
  product: Product;
  index?: number;
  totalProducts?: number;
  onNavigateToProduct?: (product: Product, index: number) => void;
}

export function ProductDetailView({
  product: initialProduct,
  index,
  totalProducts,
  onNavigateToProduct,
}: ProductDetailViewProps) {
  const [product, setProduct] = useState<Product>(initialProduct);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [authRejected, setAuthRejected] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    isSignedIn().then(setSignedIn);
  }, []);

  const loadDetail = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    setAuthRejected(false);
    try {
      const enhancedProduct = await enhanceProductWithMetadata(initialProduct);
      setProduct(enhancedProduct);
    } catch (e) {
      // enhanceProductWithMetadata throws only on a real enrichment failure (not on
      // no-creds/no-slug/not-found). Surface it visibly rather than showing thin data as complete.
      log.error("detail enrichment failed", e);
      if (e instanceof ApiError && e.category === "authRejected") {
        setAuthRejected(true);
      }
      setError(e instanceof Error ? e.message : "Failed to load product details.");
    } finally {
      setIsLoading(false);
    }
  }, [initialProduct]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  // Account actions, so a user can sign in / out from within a product detail page (not just the
  // list). Mirrors FrontpageContent: reload the command afterward so the new auth state takes effect.
  const handleSignIn = useCallback(async () => {
    try {
      await signIn();
      setSignedIn(true);
      await showToast({ style: Toast.Style.Success, title: "Signed in to Product Hunt" });
      await open(RELOAD_EXTENSIONS_DEEPLINK);
    } catch (e) {
      await authErrorToast("Sign in failed", e);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      setSignedIn(false);
      await showToast({ style: Toast.Style.Success, title: "Signed out" });
      await open(RELOAD_EXTENSIONS_DEEPLINK);
    } catch (e) {
      await authErrorToast("Sign out failed", e);
    }
  }, []);

  const handleReauthorize = useCallback(async () => {
    try {
      await reauthorize();
      setSignedIn(true);
      await showToast({ style: Toast.Style.Success, title: "Signed in to Product Hunt" });
      await open(RELOAD_EXTENSIONS_DEEPLINK);
    } catch (e) {
      await authErrorToast("Sign in failed", e);
    }
  }, []);

  const formattedDate = new Date(product.createdAt).toLocaleDateString();

  const displayImage = product.featuredImage || "";

  // Filter gallery images to ensure only valid URLs are used
  const validGalleryImages =
    product.galleryImages?.filter((img) => {
      try {
        // Check if it's a valid URL or base64 data URL
        return img && (img.startsWith("http") || img.startsWith("data:"));
      } catch (e) {
        log.error("invalid gallery image URL", { img, error: e });
        return false;
      }
    }) || [];

  // Detail enrichment errored — show a visible error with retry / open-in-browser, NOT a
  // thin page masquerading as complete (per review: detail must not silently degrade).
  if (error) {
    return (
      <Detail
        navigationTitle={cleanText(initialProduct.name)}
        markdown={`# Couldn't load details\n\n${cleanText(initialProduct.name)} couldn't be loaded from the Product Hunt API.\n\n\`\`\`\n${error}\n\`\`\``}
        actions={
          <ActionPanel>
            {authRejected && (
              <Action
                title="Sign in Again"
                icon={Icon.Person}
                onAction={async () => {
                  try {
                    await reauthorize();
                    await loadDetail();
                  } catch (err) {
                    await authErrorToast("Sign in failed", err);
                  }
                }}
              />
            )}
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={loadDetail} />
            <Action.OpenInBrowser title="Open in Browser" url={initialProduct.url} />
          </ActionPanel>
        }
      />
    );
  }

  // Create markdown content for the product details
  const markdown = `
  # ${cleanText(product.name)}
  
  _${cleanText(product.tagline)}_
  
  ${displayImage ? `![${cleanText(product.name)}](${displayImage})` : ""}
  
  ${cleanText(product.description) || "No description available."}
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={cleanText(product.name)}
      isLoading={isLoading}
      actions={
        <ProductActions
          product={product}
          validGalleryImages={validGalleryImages}
          index={index}
          totalProducts={totalProducts}
          onNavigateToProduct={onNavigateToProduct}
          viewContext={ViewContext.Detail}
          showTopics={true}
          signedIn={signedIn}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          onReauthorize={authRejected ? handleReauthorize : undefined}
        />
      }
      metadata={
        <Detail.Metadata>
          {/* Product Stats */}
          {!product.isFeedFallback && (
            <Detail.Metadata.Label
              title="Votes"
              // When signed in, prefix the count with ▲ (you upvoted) / △ (you didn't), matching the
              // list-row glyph. When signed out (isVoted absent), show just the count — no triangle.
              text={
                product.isVoted == null
                  ? `${product.votesCount}`
                  : `${product.isVoted ? "▲" : "△"} ${product.votesCount}`
              }
            />
          )}
          {!product.isFeedFallback && (
            <Detail.Metadata.Label title="Comments" text={product.commentsCount.toString()} />
          )}
          {(() => {
            const hasReviews =
              product.reviewsCount != null &&
              product.reviewsCount > 0 &&
              typeof product.reviewsRating === "number" &&
              Number.isFinite(product.reviewsRating);
            if (!hasReviews) return null;
            const rating = product.reviewsRating as number;
            const formatted = rating.toFixed(2).replace(/\.?0+$/, "");
            return (
              <Detail.Metadata.Label
                title="Reviews"
                text={`${renderStarRating(rating)} ${formatted} (${product.reviewsCount})`}
              />
            );
          })()}
          <Detail.Metadata.Label title="Launch Date" text={formattedDate} />

          {/* Ranking Information — all four ranks guard on `!= null` (ranks are 1-based, so a real
              rank is always truthy, but `!= null` is consistent and won't hide a hypothetical #0). */}
          {product.dailyRank != null && <Detail.Metadata.Label title="Daily Rank" text={`#${product.dailyRank}`} />}
          {product.weeklyRank != null && <Detail.Metadata.Label title="Weekly Rank" text={`#${product.weeklyRank}`} />}
          {product.monthlyRank != null && (
            <Detail.Metadata.Label title="Monthly Rank" text={`#${product.monthlyRank}`} />
          )}
          {product.yearlyRank != null && <Detail.Metadata.Label title="Yearly Rank" text={`#${product.yearlyRank}`} />}
          {product.makerReplies != null && product.makerReplies > 0 && (
            <Detail.Metadata.Label title="Maker Replies" text={`${product.makerReplies}`} />
          )}

          {/* Previous Launches */}
          {product.previousLaunches && product.productHubUrl && (
            <Detail.Metadata.Link
              title="Previous Launches"
              text={`${product.previousLaunches} launches`}
              target={product.productHubUrl}
            />
          )}

          {/* Hunter Section - Always show hunter if available */}
          {product.hunter ? (
            <Detail.Metadata.TagList title="Hunter">
              <Detail.Metadata.TagList.Item
                key={product.hunter.id || "hunter"}
                text={product.hunter.name}
                color={Color.Orange}
                onAction={() => {
                  if (product.hunter?.profileUrl) {
                    showToast({
                      style: Toast.Style.Success,
                      title: `Opening hunter profile: ${product.hunter.name}`,
                    });
                    open(product.hunter.profileUrl);
                  } else if (product.hunter?.username) {
                    const profileUrl = `${HOST_URL}@${product.hunter.username}`;
                    showToast({
                      style: Toast.Style.Success,
                      title: `Opening hunter profile: ${product.hunter.name}`,
                    });
                    open(profileUrl);
                  }
                }}
              />
            </Detail.Metadata.TagList>
          ) : null}

          {/* Makers Section - Only show when we have makers */}
          {product.makers && product.makers.length > 0 ? (
            <Detail.Metadata.TagList title={product.makers.length === 1 ? "Maker" : "Makers"}>
              {/* Show all makers, including the hunter if they're listed as a maker */}
              {product.makers.map((maker, index) => (
                <Detail.Metadata.TagList.Item
                  key={maker.id || `maker-${index}`}
                  text={maker.name}
                  color={Color.Purple}
                  onAction={() => {
                    if (maker.profileUrl) {
                      showToast({
                        style: Toast.Style.Success,
                        title: `Opening maker profile: ${maker.name}`,
                      });
                      open(maker.profileUrl);
                    } else if (maker.username) {
                      const profileUrl = `${HOST_URL}@${maker.username}`;
                      showToast({
                        style: Toast.Style.Success,
                        title: `Opening maker profile: ${maker.name}`,
                      });
                      open(profileUrl);
                    }
                  }}
                />
              ))}
            </Detail.Metadata.TagList>
          ) : product.maker && product.hunter && product.maker.name !== product.hunter.name ? (
            // Only show maker if it's not the same person as the hunter
            <Detail.Metadata.Label title="Maker" text={product.maker.name} />
          ) : null}

          {/* Post.user = the submitter; shown as "Hunted by" (PH vernacular — reversal of the earlier
              "Posted by" decision, 2026-07-12). Not a verified hunter field, but submitter ≈ hunter in
              practice and the familiar label is better UX. Internal field stays `submittedBy`. */}
          {product.submittedBy ? (
            <Detail.Metadata.TagList title="Hunted by">
              <Detail.Metadata.TagList.Item
                key={product.submittedBy.id || "submitter"}
                text={product.submittedBy.name}
                color={Color.Blue}
                onAction={() => {
                  const url =
                    product.submittedBy?.profileUrl ??
                    (product.submittedBy?.username ? `${HOST_URL}@${product.submittedBy.username}` : undefined);
                  if (url) {
                    showToast({
                      style: Toast.Style.Success,
                      title: `Opening profile: ${product.submittedBy?.name}`,
                    });
                    open(url);
                  }
                }}
              />
            </Detail.Metadata.TagList>
          ) : null}

          {/* Topics Section */}
          {product.topics && product.topics.length > 0 && (
            <Detail.Metadata.TagList title="Topics">
              {product.topics.map((topic) => (
                <Detail.Metadata.TagList.Item
                  key={topic.id}
                  text={topic.name}
                  color={Color.Blue}
                  onAction={() => {
                    const topicUrl = generateTopicUrl(topic);

                    showToast({
                      style: Toast.Style.Success,
                      title: `Opening topic: ${topic.name}`,
                    });

                    // Open the topic URL in the browser
                    open(topicUrl);
                  }}
                />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
    />
  );
}
