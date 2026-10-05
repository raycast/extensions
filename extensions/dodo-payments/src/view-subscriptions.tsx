import { List, ActionPanel, Action, Icon, Color, showToast, Toast } from "@raycast/api";
import React, { useCallback } from "react";
import { withAuth } from "./contexts/AuthContext";
import { withAuthGuard } from "./hooks/useAuthGuard";
import { useInfiniteSubscriptions } from "./hooks/useQueries";
import type { SubscriptionListResponse } from "dodopayments/resources";
import { formatCurrencyAndAmount, formatDateShort, getReadableStatus } from "./utils/formatting";

function getStatusBadgeColor(status: string): Color {
  switch (status.toLowerCase()) {
    case "active":
      return Color.Green;
    case "canceled":
    case "cancelled":
      return Color.Red;
    case "paused":
      return Color.Yellow;
    case "past_due":
      return Color.Orange;
    case "trialing":
      return Color.Blue;
    default:
      return Color.SecondaryText;
  }
}

function getBillingFrequency(subscription: SubscriptionListResponse): string {
  // Try to determine billing frequency from metadata or other fields
  const metadata = subscription.metadata;
  if (metadata?.billing_frequency) {
    return metadata.billing_frequency;
  }

  // Check if subscription has billing interval information
  // This would typically come from the subscription object structure
  // For now, we'll use a smart default based on common patterns

  // If we have access to billing interval data, handle it here
  // Example: if subscription has payment_frequency_interval and payment_frequency_count
  if (subscription.payment_frequency_interval && subscription.payment_frequency_count) {
    const count = subscription.payment_frequency_count;
    const interval = subscription.payment_frequency_interval.toLowerCase();

    if (count === 1) {
      // Singular forms for display
      switch (interval) {
        case "month":
        case "months":
          return "month";
        case "year":
        case "years":
          return "year";
        case "week":
        case "weeks":
          return "week";
        case "day":
        case "days":
          return "day";
        default:
          return interval;
      }
    } else {
      // Plural forms with count
      switch (interval) {
        case "month":
        case "months":
          return `${count} months`;
        case "year":
        case "years":
          return `${count} years`;
        case "week":
        case "weeks":
          return `${count} weeks`;
        case "day":
        case "days":
          return `${count} days`;
        default:
          return `${count} ${interval}s`;
      }
    }
  }

  // Default to "month" if we can't determine
  return "month";
}

function getBillingFrequencyForBadge(subscription: SubscriptionListResponse): string {
  // For badges, use a more compact and capitalized version
  const metadata = subscription.metadata;
  if (metadata?.billing_frequency) {
    return metadata.billing_frequency;
  }

  // Handle structured billing interval data
  if (subscription.payment_frequency_interval && subscription.payment_frequency_count) {
    const count = subscription.payment_frequency_count;
    const interval = subscription.payment_frequency_interval.toLowerCase();

    if (count === 1) {
      // Singular forms with "ly" suffix for badges
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
      // For multiple intervals, show count + interval
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

  // Default to "Monthly" for badges
  return "Monthly";
}

function getBillingFrequencyBadgeColor(subscription: SubscriptionListResponse): Color {
  // Check metadata first
  const metadata = subscription.metadata;
  if (metadata?.billing_frequency) {
    const frequency = metadata.billing_frequency.toLowerCase();
    switch (frequency) {
      case "daily":
        return Color.Red;
      case "weekly":
        return Color.Orange;
      case "monthly":
        return Color.Blue;
      case "yearly":
        return Color.Green;
      default:
        return Color.Yellow;
    }
  }

  // Handle structured billing interval data
  if (subscription.payment_frequency_interval) {
    const interval = subscription.payment_frequency_interval.toLowerCase();

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
        return Color.Yellow;
    }
  }

  return Color.Blue; // Default to blue for monthly
}

function SubscriptionsList() {
  const {
    data: subscriptionsData,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteSubscriptions({ limit: 20 });

  // Show toast notifications based on query state
  React.useEffect(() => {
    if (isLoading) {
      showToast({
        style: Toast.Style.Animated,
        title: "Loading subscriptions...",
      });
    } else if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load subscriptions",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } else if (subscriptionsData) {
      const totalItems = subscriptionsData.pages.reduce((acc, page) => acc + page.items.length, 0);
      showToast({
        style: Toast.Style.Success,
        title: `Loaded ${totalItems} subscriptions`,
      });
    }
  }, [isLoading, error, subscriptionsData]);

  // Flatten all pages into a single array
  const subscriptions: SubscriptionListResponse[] = React.useMemo(
    () => subscriptionsData?.pages.flatMap((page) => page.items) || [],
    [subscriptionsData?.pages],
  );

  const handleFetchNextPage = useCallback(() => fetchNextPage(), [fetchNextPage]);

  if (!isLoading && subscriptions.length === 0) {
    return (
      <List searchBarPlaceholder="Search subscriptions...">
        <List.EmptyView
          icon={Icon.List}
          title="No Subscriptions Found"
          description="No subscriptions are available for your account."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search subscriptions..."
      pagination={{
        hasMore: hasNextPage,
        pageSize: 20,
        onLoadMore: handleFetchNextPage,
      }}
      isShowingDetail
    >
      {subscriptions.map((subscription) => (
        <List.Item
          key={subscription.subscription_id}
          id={subscription.subscription_id}
          icon={{
            source: Icon.Repeat,
            tintColor: getStatusBadgeColor(subscription.status),
          }}
          title={subscription.metadata?.description || subscription.customer.name || "Subscription"}
          accessories={[
            {
              text: `${formatCurrencyAndAmount(
                subscription.recurring_pre_tax_amount,
                subscription.currency,
              )}/${getBillingFrequency(subscription)}`,
              icon: Icon.Receipt,
            },
          ]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  {/* Customer Information with clickable email */}
                  <List.Item.Detail.Metadata.Link
                    title="Customer"
                    text={subscription.customer.email}
                    target={`mailto:${subscription.customer.email}`}
                  />
                  <List.Item.Detail.Metadata.Label title="Started At" text={formatDateShort(subscription.created_at)} />

                  <List.Item.Detail.Metadata.Label
                    title="Next Billing Date"
                    text={formatDateShort(subscription.next_billing_date)}
                  />
                  <List.Item.Detail.Metadata.Label title="Organization" text={subscription.customer.name || "—"} />

                  <List.Item.Detail.Metadata.TagList title="Frequency">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={getBillingFrequencyForBadge(subscription)}
                      color={getBillingFrequencyBadgeColor(subscription)}
                    />
                  </List.Item.Detail.Metadata.TagList>

                  {/* Status Badge */}
                  <List.Item.Detail.Metadata.TagList title="Status">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={getReadableStatus(subscription.status)}
                      color={getStatusBadgeColor(subscription.status)}
                    />
                  </List.Item.Detail.Metadata.TagList>

                  <List.Item.Detail.Metadata.Label
                    title="Amount"
                    text={formatCurrencyAndAmount(subscription.recurring_pre_tax_amount, subscription.currency)}
                  />

                  <List.Item.Detail.Metadata.Separator />

                  {/* Additional Details */}
                  <List.Item.Detail.Metadata.Label title="Customer ID" text={subscription.customer.customer_id} />
                  <List.Item.Detail.Metadata.Label title="Subscription ID" text={subscription.subscription_id} />
                  <List.Item.Detail.Metadata.Label title="Product ID" text={subscription.product_id} />

                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label
                    title="On Demand"
                    text={subscription.on_demand ? "Yes" : "No"}
                    icon={{
                      source: Icon.Circle,
                      tintColor: subscription.on_demand ? Color.Blue : Color.SecondaryText,
                    }}
                  />
                  {subscription.cancel_at_next_billing_date && (
                    <List.Item.Detail.Metadata.Label
                      title="Cancel at Next Billing"
                      text="Yes"
                      icon={{ source: Icon.Circle, tintColor: Color.Orange }}
                    />
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in Dodo Payments"
                url={`https://app.dodopayments.com/sales/subscriptions/${subscription.subscription_id}?backTo=/sales/subscriptions`}
                icon={Icon.Globe}
              />

              <Action.CopyToClipboard title="Copy Subscription ID" content={subscription.subscription_id} />

              <Action.CopyToClipboard
                title="Copy Customer Email"
                content={subscription.customer.email}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
              <Action.OpenInBrowser
                title="Email Customer"
                url={`mailto:${subscription.customer.email}`}
                icon={Icon.Envelope}
                shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// Export the component wrapped with authentication
export default withAuth(withAuthGuard(SubscriptionsList));
