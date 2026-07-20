import { List, ActionPanel, Action, Icon, Color, showToast, Toast, Form, useNavigation, Clipboard } from "@raycast/api";
import React, { useCallback } from "react";
import { withAuth, useAuth } from "./contexts/AuthContext";
import { withAuthGuard } from "./hooks/useAuthGuard";
import { useInfiniteProducts } from "./hooks/useQueries";
import type { ProductListResponse } from "dodopayments/resources";
import { formatCurrencyAndAmount, formatDateShort } from "./utils/formatting";

function getProductTypeBadgeColor(product: ProductListResponse): Color {
  // Different colors for different product types
  if (product.is_recurring) {
    return Color.Orange; // Orange for subscription products
  }
  return Color.Blue; // Blue for one-time products
}

function getProductType(product: ProductListResponse): string {
  return product.is_recurring ? "Subscription" : "One-time";
}

function getProductFrequencyForBadge(product: ProductListResponse): string {
  // Only show frequency badge for recurring products
  if (!product.is_recurring) {
    return "";
  }

  // Check if product has price detail with frequency information
  if (product.price_detail && product.price_detail.type === "recurring_price") {
    const count = product.price_detail.payment_frequency_count || 1;
    const interval = product.price_detail.payment_frequency_interval?.toLowerCase() || "month";

    if (count === 1) {
      // Singular forms for badges
      switch (interval) {
        case "month":
        case "months":
          return "Monthly";
        case "year":
        case "years":
          return "Yearly";
        case "week":
        case "weeks":
          return "Weekly";
        case "day":
        case "days":
          return "Daily";
        default:
          return interval.charAt(0).toUpperCase() + interval.slice(1) + "ly";
      }
    } else {
      // Plural forms with count for badges
      switch (interval) {
        case "month":
        case "months":
          return `${count} Months`;
        case "year":
        case "years":
          return `${count} Years`;
        case "week":
        case "weeks":
          return `${count} Weeks`;
        case "day":
        case "days":
          return `${count} Days`;
        default:
          return `${count} ${interval.charAt(0).toUpperCase() + interval.slice(1)}s`;
      }
    }
  }

  // Default for recurring products without specific frequency data
  return "Monthly";
}

function getProductFrequencyBadgeColor(product: ProductListResponse): Color {
  // Only show frequency badge for recurring products
  if (!product.is_recurring) {
    return Color.SecondaryText;
  }

  // Check if product has price detail with frequency information
  if (product.price_detail && product.price_detail.type === "recurring_price") {
    const interval = product.price_detail.payment_frequency_interval?.toLowerCase() || "month";

    // Return different colors based on frequency interval
    switch (interval) {
      case "day":
      case "days":
        return Color.Red; // Red for daily (high frequency)
      case "week":
      case "weeks":
        return Color.Orange; // Orange for weekly
      case "month":
      case "months":
        return Color.Blue; // Blue for monthly (most common)
      case "year":
      case "years":
        return Color.Green; // Green for yearly (low frequency)
      default:
        return Color.SecondaryText;
    }
  }

  return Color.Blue; // Default to blue for monthly
}

function getTaxCategory(product: ProductListResponse): string {
  // Check for tax category field and format it to be human readable
  const taxCategory = product.tax_category || "digital_products";

  // Map specific tax categories to human-readable labels
  const categoryMap: Record<string, string> = {
    digital_products: "Digital Products",
    saas: "SaaS",
    e_book: "E-Book",
    edtech: "EdTech",
  };

  return (
    categoryMap[taxCategory] ||
    taxCategory
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
  );
}

function getTaxCategoryBadgeColor(): Color {
  return Color.Purple;
}

function isTaxInclusive(product: ProductListResponse): boolean {
  // Check for tax inclusive field (assuming it might exist in the product data)
  return product.tax_inclusive || false;
}

function getTaxInclusiveBadgeColor(isInclusive: boolean): Color {
  return isInclusive ? Color.Green : Color.Red;
}

function getTaxInclusiveText(isInclusive: boolean): string {
  return isInclusive ? "Yes" : "No";
}

function getCheckoutUrl(productId: string, mode: "live" | "test" = "live", returnUrl?: string): string {
  let checkoutUrl =
    mode === "live"
      ? `https://checkout.dodopayments.com/buy/${productId}`
      : `https://test.checkout.dodopayments.com/buy/${productId}`;

  if (returnUrl) {
    checkoutUrl += `?redirect_url=${encodeURIComponent(returnUrl)}`;
  }

  return checkoutUrl;
}

function CheckoutUrlWithReturnForm({ productId, mode = "live" }: { productId: string; mode?: "live" | "test" }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { returnUrl: string }) {
    const checkoutUrl = getCheckoutUrl(productId, mode, values.returnUrl);

    await showToast({
      style: Toast.Style.Success,
      title: "Checkout URL copied!",
      message: `${mode === "live" ? "Live" : "Test"} checkout URL with return URL copied to clipboard`,
    });

    // Copy to clipboard
    await Clipboard.copy(checkoutUrl);

    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy Checkout URL" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="returnUrl"
        title="Return URL"
        placeholder="https://example.com/success"
        info="URL where customers will be redirected after payment"
      />
    </Form>
  );
}

function ProductsList() {
  const { config } = useAuth();
  const currentMode = config?.mode || "live";

  const { data: productsData, isLoading, error, fetchNextPage, hasNextPage } = useInfiniteProducts({ limit: 50 });

  // Show toast notifications based on query state
  React.useEffect(() => {
    if (isLoading) {
      showToast({
        style: Toast.Style.Animated,
        title: "Loading products...",
      });
    } else if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load products",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } else if (productsData) {
      const totalItems = productsData.pages.reduce((acc, page) => acc + page.items.length, 0);
      showToast({
        style: Toast.Style.Success,
        title: `Loaded ${totalItems} products`,
      });
    }
  }, [isLoading, error, productsData]);

  // Flatten all pages into a single array
  const products: ProductListResponse[] = React.useMemo(
    () => productsData?.pages.flatMap((page) => page.items) || [],
    [productsData?.pages],
  );

  const handleFetchNextPage = useCallback(() => fetchNextPage(), [fetchNextPage]);

  if (!isLoading && products.length === 0) {
    return (
      <List searchBarPlaceholder="Search products...">
        <List.EmptyView
          icon={Icon.Box}
          title="No Products Found"
          description="No products are available for your account."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search products..."
      pagination={{
        hasMore: hasNextPage,
        pageSize: 50,
        onLoadMore: handleFetchNextPage,
      }}
      isShowingDetail
    >
      {products.map((product) => (
        <List.Item
          key={product.product_id}
          icon={{
            source: Icon.Box,
            tintColor: getProductTypeBadgeColor(product),
          }}
          title={product.name || "Unnamed Product"}
          accessories={[
            {
              text: formatCurrencyAndAmount(product.price || 0, product.currency || "USD"),
            },
          ]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  {product.image ? (
                    <>
                      <List.Item.Detail.Metadata.Link title="Image" text={product.image} target={product.image} />
                      <List.Item.Detail.Metadata.Separator />
                    </>
                  ) : null}
                  {/* Product Information */}
                  <List.Item.Detail.Metadata.Label title="Product" text={product.name || "—"} />

                  <List.Item.Detail.Metadata.Label title="Description" text={product.description || "—"} />

                  <List.Item.Detail.Metadata.Label title="Created" text={formatDateShort(product.created_at)} />

                  {/* Product Type Badge */}
                  <List.Item.Detail.Metadata.TagList title="Type">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={getProductType(product)}
                      color={getProductTypeBadgeColor(product)}
                    />
                  </List.Item.Detail.Metadata.TagList>

                  {/* Frequency Badge for Subscription Products */}
                  {product.is_recurring && (
                    <List.Item.Detail.Metadata.TagList title="Frequency">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={getProductFrequencyForBadge(product)}
                        color={getProductFrequencyBadgeColor(product)}
                      />
                    </List.Item.Detail.Metadata.TagList>
                  )}

                  <List.Item.Detail.Metadata.Label
                    title="Price"
                    text={formatCurrencyAndAmount(product.price || 0, product.currency || "USD")}
                  />

                  {product.price_detail?.type === "recurring_price" && !!product.price_detail?.trial_period_days && (
                    <List.Item.Detail.Metadata.TagList title="Trial Period">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={`${product.price_detail.trial_period_days} Days`}
                        color={Color.Green}
                      />
                    </List.Item.Detail.Metadata.TagList>
                  )}

                  <List.Item.Detail.Metadata.Separator />

                  {/* Additional Details */}
                  <List.Item.Detail.Metadata.Label title="Product ID" text={product.product_id} />
                  <List.Item.Detail.Metadata.Label title="Currency" text={product.currency || "USD"} />

                  <List.Item.Detail.Metadata.Separator />

                  {/* Tax Category Badge */}
                  <List.Item.Detail.Metadata.TagList title="Tax Category">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={getTaxCategory(product)}
                      color={getTaxCategoryBadgeColor()}
                    />
                  </List.Item.Detail.Metadata.TagList>

                  {/* Tax Inclusive Badge */}
                  <List.Item.Detail.Metadata.TagList title="Tax Inclusive">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={getTaxInclusiveText(isTaxInclusive(product))}
                      color={getTaxInclusiveBadgeColor(isTaxInclusive(product))}
                    />
                  </List.Item.Detail.Metadata.TagList>
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Checkout URL"
                content={getCheckoutUrl(product.product_id, currentMode)}
              />
              <Action.Push
                title="Copy Checkout URL with Return URL"
                target={<CheckoutUrlWithReturnForm productId={product.product_id} mode={currentMode} />}
                icon={Icon.Clipboard}
              />

              <Action.OpenInBrowser
                title="Edit in Dodo Payments"
                url={`https://app.dodopayments.com/products/edit?id=${product.product_id}`}
                icon={Icon.Globe}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action.OpenInBrowser
                title="Preview Checkout"
                url={`https://app.dodopayments.com/products/preview/${product.product_id}`}
                icon={Icon.Eye}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              />

              <Action.CopyToClipboard
                title="Copy Product ID"
                content={product.product_id}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Product Name"
                content={product.name || ""}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// Export the component wrapped with authentication
export default withAuth(withAuthGuard(ProductsList));
