import { List, ActionPanel, Action, Icon, Color, showToast, Toast } from "@raycast/api";
import React, { useCallback } from "react";
import { withAuth } from "./contexts/AuthContext";
import { withAuthGuard } from "./hooks/useAuthGuard";
import { useInfiniteRefunds } from "./hooks/useQueries";
import type { Refund } from "dodopayments/resources";
import { formatDateShort } from "./utils/formatting";

function getRefundStatusBadgeColor(status: string): Color {
  switch (status) {
    case "succeeded":
      return Color.Green; // Green for successful refunds
    case "failed":
      return Color.Red; // Red for failed refunds
    case "pending":
      return Color.Orange; // Orange for pending refunds
    case "review":
      return Color.Yellow; // Yellow for refunds under review
    default:
      return Color.SecondaryText;
  }
}

function getRefundStatusDisplay(status: string): string {
  switch (status) {
    case "succeeded":
      return "Succeeded";
    case "failed":
      return "Failed";
    case "pending":
      return "Pending";
    case "review":
      return "Under Review";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function formatCurrency(amount?: number | null, currency?: string | null): string {
  if (!amount || !currency) return "N/A";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100); // Amount is in cents
}

function RefundsList() {
  const { data: refundsData, isLoading, error, fetchNextPage, hasNextPage } = useInfiniteRefunds({ limit: 20 });

  // Show toast notifications based on query state
  React.useEffect(() => {
    if (isLoading) {
      showToast({
        style: Toast.Style.Animated,
        title: "Loading refunds...",
      });
    } else if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load refunds",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } else if (refundsData) {
      const totalItems = refundsData.pages.reduce((acc, page) => acc + page.items.length, 0);
      showToast({
        style: Toast.Style.Success,
        title: `Loaded ${totalItems} refunds`,
      });
    }
  }, [isLoading, error, refundsData]);

  // Flatten all pages into a single array
  const refunds: Refund[] = React.useMemo(
    () => refundsData?.pages.flatMap((page) => page.items) || [],
    [refundsData?.pages],
  );

  const handleFetchNextPage = useCallback(() => fetchNextPage(), [fetchNextPage]);

  if (!isLoading && refunds.length === 0) {
    return (
      <List searchBarPlaceholder="Search refunds...">
        <List.EmptyView
          icon={Icon.ArrowCounterClockwise}
          title="No Refunds Found"
          description="No refunds are available for your account."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search refunds..."
      pagination={{
        hasMore: hasNextPage,
        pageSize: 20,
        onLoadMore: handleFetchNextPage,
      }}
      isShowingDetail
    >
      {refunds.map((refund) => (
        <List.Item
          key={refund.refund_id}
          icon={{
            source: Icon.ArrowCounterClockwise,
            tintColor: getRefundStatusBadgeColor(refund.status),
          }}
          title={`Refund ${refund.refund_id}`}
          accessories={[
            {
              text: refund.is_partial ? "Partial" : "Full",
            },
          ]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Refund ID" text={refund.refund_id} />

                  <List.Item.Detail.Metadata.TagList title="Status">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={getRefundStatusDisplay(refund.status)}
                      color={getRefundStatusBadgeColor(refund.status)}
                    />
                  </List.Item.Detail.Metadata.TagList>

                  <List.Item.Detail.Metadata.Label
                    title="Type"
                    text={refund.is_partial ? "Partial Refund" : "Full Refund"}
                  />

                  <List.Item.Detail.Metadata.Label
                    title="Amount"
                    text={formatCurrency(refund.amount, refund.currency)}
                  />

                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label title="Payment ID" text={refund.payment_id} />

                  <List.Item.Detail.Metadata.Label title="Business ID" text={refund.business_id} />

                  {refund.reason && <List.Item.Detail.Metadata.Label title="Reason" text={refund.reason} />}

                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label title="Created" text={formatDateShort(refund.created_at)} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in Dodo Payments"
                url={`https://app.dodopayments.com/transactions/refunds/${refund.refund_id}?backTo=/transactions/refunds`}
                icon={Icon.Globe}
              />

              <Action.CopyToClipboard title="Copy Refund ID" content={refund.refund_id} icon={Icon.Clipboard} />

              <Action.CopyToClipboard
                title="Copy Payment ID"
                content={refund.payment_id}
                icon={Icon.CreditCard}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// Export the component wrapped with authentication
export default withAuth(withAuthGuard(RefundsList));
