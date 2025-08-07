import { List, ActionPanel, Action, Icon, Color, showToast, Toast } from "@raycast/api";
import React, { useCallback } from "react";
import { withAuth } from "./contexts/AuthContext";
import { withAuthGuard } from "./hooks/useAuthGuard";
import { useInfiniteDiscounts } from "./hooks/useQueries";
import type { Discount } from "dodopayments/resources";
import { formatDateShort } from "./utils/formatting";

function getDiscountStatusBadgeColor(discount: Discount): Color {
  // Check if discount is expired
  if (discount.expires_at && new Date(discount.expires_at) < new Date()) {
    return Color.Red; // Red for expired
  }

  // Check if usage limit is reached
  if (discount.usage_limit && discount.times_used >= discount.usage_limit) {
    return Color.Orange; // Orange for usage limit reached
  }

  return Color.Green; // Green for active
}

function getDiscountStatus(discount: Discount): string {
  // Check if discount is expired
  if (discount.expires_at && new Date(discount.expires_at) < new Date()) {
    return "Expired";
  }

  // Check if usage limit is reached
  if (discount.usage_limit && discount.times_used >= discount.usage_limit) {
    return "Usage Limit Reached";
  }

  return "Active";
}

function formatDiscountAmount(discount: Discount): string {
  if (discount.type === "percentage") {
    // Amount is in basis points (e.g., 540 = 5.4%)
    return `${(discount.amount / 100).toFixed(1)}%`;
  }
  // For other types, amount is in USD cents
  return `$${(discount.amount / 100).toFixed(2)}`;
}

function formatDiscountType(type: string): string {
  switch (type) {
    case "percentage":
      return "Percentage";
    case "flat":
      return "Fixed Amount";
    case "flat_per_unit":
      return "Fixed Per Unit";
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

function DiscountsList() {
  const { data: discountsData, isLoading, error, fetchNextPage, hasNextPage } = useInfiniteDiscounts({ limit: 20 });

  // Show toast notifications based on query state
  React.useEffect(() => {
    if (isLoading) {
      showToast({
        style: Toast.Style.Animated,
        title: "Loading discount codes...",
      });
    } else if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load discount codes",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } else if (discountsData) {
      const totalItems = discountsData.pages.reduce((acc, page) => acc + page.items.length, 0);
      showToast({
        style: Toast.Style.Success,
        title: `Loaded ${totalItems} discount codes`,
      });
    }
  }, [isLoading, error, discountsData]);

  // Flatten all pages into a single array
  const discounts: Discount[] = React.useMemo(
    () => discountsData?.pages.flatMap((page) => page.items) || [],
    [discountsData?.pages],
  );

  const handleFetchNextPage = useCallback(() => fetchNextPage(), [fetchNextPage]);

  if (!isLoading && discounts.length === 0) {
    return (
      <List searchBarPlaceholder="Search discount codes...">
        <List.EmptyView
          icon={Icon.Hashtag}
          title="No Discount Codes Found"
          description="No discount codes are available for your account."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search discount codes..."
      pagination={{
        hasMore: hasNextPage,
        pageSize: 20,
        onLoadMore: handleFetchNextPage,
      }}
      isShowingDetail
    >
      {discounts.map((discount) => (
        <List.Item
          key={discount.discount_id}
          icon={{
            source: Icon.Hashtag,
            tintColor: getDiscountStatusBadgeColor(discount),
          }}
          title={discount.code}
          subtitle={discount.name || ""}
          accessories={[
            {
              text: formatDiscountAmount(discount),
              icon: Icon.Tag,
            },
          ]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Discount Code" text={discount.code} />

                  <List.Item.Detail.Metadata.TagList title="Status">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={getDiscountStatus(discount)}
                      color={getDiscountStatusBadgeColor(discount)}
                    />
                  </List.Item.Detail.Metadata.TagList>

                  <List.Item.Detail.Metadata.Label title="Type" text={formatDiscountType(discount.type)} />

                  <List.Item.Detail.Metadata.Label title="Amount" text={formatDiscountAmount(discount)} />

                  <List.Item.Detail.Metadata.Label
                    title="Usage"
                    text={`${discount.times_used}${discount.usage_limit ? ` / ${discount.usage_limit}` : " (unlimited)"}`}
                  />

                  {discount.name && <List.Item.Detail.Metadata.Label title="Name" text={discount.name} />}

                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label
                    title="Expires"
                    text={discount.expires_at ? formatDateShort(discount.expires_at) : "Never"}
                  />

                  <List.Item.Detail.Metadata.Label title="Created" text={formatDateShort(discount.created_at)} />

                  <List.Item.Detail.Metadata.Label title="Discount ID" text={discount.discount_id} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in Dodo Payments"
                url={`https://app.dodopayments.com/sales/discounts/edit?id=${discount.discount_id}&backTo=/sales/discounts`}
                icon={Icon.Globe}
              />

              <Action.CopyToClipboard title="Copy Discount Code" content={discount.code} icon={Icon.Clipboard} />

              <Action.CopyToClipboard
                title="Copy Discount ID"
                content={discount.discount_id}
                icon={Icon.CopyClipboard}
                shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// Export the component wrapped with authentication
export default withAuth(withAuthGuard(DiscountsList));
