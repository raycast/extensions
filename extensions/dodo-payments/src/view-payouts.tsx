import { List, ActionPanel, Action, Icon, Color, showToast, Toast } from "@raycast/api";
import React, { useCallback } from "react";
import { withAuth } from "./contexts/AuthContext";
import { withAuthGuard } from "./hooks/useAuthGuard";
import { useInfinitePayouts } from "./hooks/useQueries";
import type { PayoutListResponse } from "dodopayments/resources";
import { formatCurrencyAndAmount, formatDateShort, getReadableStatus } from "./utils/formatting";

function getStatusBadgeColor(status: PayoutListResponse["status"]): Color {
  switch (status.toLowerCase()) {
    case "completed":
    case "paid":
      return Color.Green;
    case "failed":
    case "rejected":
      return Color.Red;
    case "pending":
    case "processing":
      return Color.Orange;
    case "not_initiated":
      return Color.SecondaryText;
    case "initiated":
      return Color.Blue;
    default:
      return Color.SecondaryText;
  }
}

function PayoutsList() {
  const { data: payoutsData, isLoading, error, fetchNextPage, hasNextPage } = useInfinitePayouts({ limit: 50 });

  // Show toast notifications based on query state
  React.useEffect(() => {
    if (isLoading) {
      showToast({
        style: Toast.Style.Animated,
        title: "Loading payouts...",
      });
    } else if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load payouts",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } else if (payoutsData) {
      const totalItems = payoutsData.pages.reduce((acc, page) => acc + page.items.length, 0);
      showToast({
        style: Toast.Style.Success,
        title: `Loaded ${totalItems} payouts`,
      });
    }
  }, [isLoading, error, payoutsData]);

  // Flatten all pages into a single array
  const payouts: PayoutListResponse[] = React.useMemo(
    () => payoutsData?.pages.flatMap((page) => page.items) || [],
    [payoutsData?.pages],
  );

  const handleFetchNextPage = useCallback(() => fetchNextPage(), [fetchNextPage]);

  if (!isLoading && payouts.length === 0) {
    return (
      <List searchBarPlaceholder="Search payouts...">
        <List.EmptyView
          icon={Icon.BankNote}
          title="No Payouts Found"
          description="No payouts are available for your account."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search payouts..."
      pagination={{
        hasMore: hasNextPage,
        pageSize: 20,
        onLoadMore: handleFetchNextPage,
      }}
      isShowingDetail
    >
      {payouts.map((payout) => (
        <List.Item
          key={payout.payout_id}
          id={payout.payout_id}
          icon={{
            source: Icon.BankNote,
            tintColor: getStatusBadgeColor(payout.status),
          }}
          title={payout.name || `Payout ${payout.payout_id}`}
          accessories={[
            {
              text: formatCurrencyAndAmount(payout.amount, payout.currency),
              icon: Icon.Receipt,
            },
          ]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  {payout.payout_document_url && (
                    <List.Item.Detail.Metadata.Link
                      title="Payout Document"
                      text={payout.payout_document_url}
                      target={payout.payout_document_url}
                    />
                  )}

                  <List.Item.Detail.Metadata.Label
                    title="Amount"
                    text={formatCurrencyAndAmount(payout.amount, payout.currency)}
                  />
                  <List.Item.Detail.Metadata.Label title="Created At" text={formatDateShort(payout.created_at)} />
                  <List.Item.Detail.Metadata.Label title="Updated At" text={formatDateShort(payout.updated_at)} />

                  {/* Status Badge */}
                  <List.Item.Detail.Metadata.TagList title="Status">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={getReadableStatus(payout.status)}
                      color={getStatusBadgeColor(payout.status)}
                    />
                  </List.Item.Detail.Metadata.TagList>

                  <List.Item.Detail.Metadata.Separator />

                  {/* Financial Details */}
                  <List.Item.Detail.Metadata.Label
                    title="Fee"
                    text={formatCurrencyAndAmount(payout.fee, payout.currency)}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Tax"
                    text={formatCurrencyAndAmount(payout.tax, payout.currency)}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Refunds"
                    text={formatCurrencyAndAmount(payout.refunds, payout.currency)}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Chargebacks"
                    text={formatCurrencyAndAmount(payout.chargebacks, payout.currency)}
                  />

                  <List.Item.Detail.Metadata.Separator />

                  {/* Additional Details */}
                  <List.Item.Detail.Metadata.Label title="Payment Method" text={payout.payment_method || "—"} />
                  <List.Item.Detail.Metadata.Label title="Business ID" text={payout.business_id} />
                  <List.Item.Detail.Metadata.Label title="Payout ID" text={payout.payout_id} />

                  {payout.remarks && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Remarks" text={payout.remarks} />
                    </>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in Dodo Payments"
                url={`https://app.dodopayments.com/business/payouts/${payout.payout_id}?backTo=/business/payouts`}
                icon={Icon.Globe}
              />

              <Action.CopyToClipboard title="Copy Payout ID" content={payout.payout_id} />

              <Action.CopyToClipboard
                title="Copy Business ID"
                content={payout.business_id}
                shortcut={{ modifiers: ["cmd"], key: "b" }}
              />

              {payout.payout_document_url && (
                <>
                  <Action.OpenInBrowser
                    title="Show Payout Document"
                    url={payout.payout_document_url}
                    icon={Icon.Document}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />

                  <Action.CopyToClipboard
                    title="Copy Payout Document URL"
                    content={payout.payout_document_url}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  />
                </>
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// Export the component wrapped with authentication
export default withAuth(withAuthGuard(PayoutsList));
