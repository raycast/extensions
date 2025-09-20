import { List, ActionPanel, Action, Icon, Color, showToast, Toast } from "@raycast/api";
import React, { useCallback } from "react";
import { withAuth } from "./contexts/AuthContext";
import { withAuthGuard } from "./hooks/useAuthGuard";
import { useInfiniteDisputes } from "./hooks/useQueries";
import type { DisputeListResponse, DisputeStage } from "dodopayments/resources";
import { formatDateShort } from "./utils/formatting";

function getDisputeStatusBadgeColor(status: string): Color {
  switch (status) {
    case "dispute_opened":
      return Color.Red; // Red for open disputes
    case "dispute_challenged":
      return Color.Orange; // Orange for challenged
    case "dispute_won":
      return Color.Green; // Green for won
    case "dispute_lost":
      return Color.Red; // Red for lost
    case "dispute_expired":
      return Color.SecondaryText; // Gray for expired
    case "dispute_cancelled":
      return Color.SecondaryText; // Gray for cancelled
    case "dispute_accepted":
      return Color.Yellow; // Yellow for accepted
    default:
      return Color.SecondaryText;
  }
}

function getDisputeStatusDisplay(status: string): string {
  switch (status) {
    case "dispute_opened":
      return "Opened";
    case "dispute_challenged":
      return "Challenged";
    case "dispute_won":
      return "Won";
    case "dispute_lost":
      return "Lost";
    case "dispute_expired":
      return "Expired";
    case "dispute_cancelled":
      return "Cancelled";
    case "dispute_accepted":
      return "Accepted";
    default:
      return status;
  }
}

function getDisputeStageDisplay(stage: DisputeStage): string {
  switch (stage) {
    case "pre_dispute":
      return "Pre-Dispute";
    case "dispute":
      return "Dispute";
    case "pre_arbitration":
      return "Pre-Arbitration";
    default:
      return stage;
  }
}

function formatCurrency(amount: string, currency: string): string {
  const numAmount = parseFloat(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(numAmount);
}

function DisputesList() {
  const { data: disputesData, isLoading, error, fetchNextPage, hasNextPage } = useInfiniteDisputes({ limit: 50 });

  // Show toast notifications based on query state
  React.useEffect(() => {
    if (isLoading) {
      showToast({
        style: Toast.Style.Animated,
        title: "Loading disputes...",
      });
    } else if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load disputes",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } else if (disputesData) {
      const totalItems = disputesData.pages.reduce((acc, page) => acc + page.items.length, 0);
      showToast({
        style: Toast.Style.Success,
        title: `Loaded ${totalItems} disputes`,
      });
    }
  }, [isLoading, error, disputesData]);

  // Flatten all pages into a single array
  const disputes: DisputeListResponse[] = React.useMemo(
    () => disputesData?.pages.flatMap((page) => page.items) || [],
    [disputesData?.pages],
  );

  const handleFetchNextPage = useCallback(() => fetchNextPage(), [fetchNextPage]);

  if (!isLoading && disputes.length === 0) {
    return (
      <List searchBarPlaceholder="Search disputes...">
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="No Disputes Found"
          description="No disputes are available for your account."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search disputes..."
      pagination={{
        hasMore: hasNextPage,
        pageSize: 50,
        onLoadMore: handleFetchNextPage,
      }}
      isShowingDetail
    >
      {disputes.map((dispute) => (
        <List.Item
          key={dispute.dispute_id}
          icon={{
            source: Icon.ExclamationMark,
            tintColor: getDisputeStatusBadgeColor(dispute.dispute_status),
          }}
          title={`Dispute ${dispute.dispute_id}`}
          accessories={[
            {
              text: formatCurrency(dispute.amount, dispute.currency),
            },
          ]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Dispute" text={`Dispute ${dispute.dispute_id.slice(-8)}`} />

                  <List.Item.Detail.Metadata.TagList title="Status">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={getDisputeStatusDisplay(dispute.dispute_status)}
                      color={getDisputeStatusBadgeColor(dispute.dispute_status)}
                    />
                  </List.Item.Detail.Metadata.TagList>

                  <List.Item.Detail.Metadata.Label title="Stage" text={getDisputeStageDisplay(dispute.dispute_stage)} />

                  <List.Item.Detail.Metadata.Label
                    title="Amount"
                    text={formatCurrency(dispute.amount, dispute.currency)}
                  />

                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label title="Dispute ID" text={dispute.dispute_id} />

                  <List.Item.Detail.Metadata.Label title="Payment ID" text={dispute.payment_id} />

                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label title="Business ID" text={dispute.business_id} />

                  <List.Item.Detail.Metadata.Label title="Created" text={formatDateShort(dispute.created_at)} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in Dodo Payments"
                url={`https://app.dodopayments.com/transactions/disputes/${dispute.dispute_id}?backTo=/transactions/disputes`}
                icon={Icon.Globe}
              />
              <Action.CopyToClipboard title="Copy Dispute ID" content={dispute.dispute_id} icon={Icon.Clipboard} />
              <Action.CopyToClipboard
                title="Copy Payment ID"
                content={dispute.payment_id}
                icon={Icon.CreditCard}
                shortcut={{ modifiers: ["cmd"], key: "p" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// Export the component wrapped with authentication
export default withAuth(withAuthGuard(DisputesList));
