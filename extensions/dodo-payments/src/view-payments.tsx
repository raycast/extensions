import { ActionPanel, Action, List, Icon, Color, showToast, Toast } from "@raycast/api";
import React, { useCallback } from "react";
import { withAuth, useAuth } from "./contexts/AuthContext";
import { withAuthGuard } from "./hooks/useAuthGuard";
import { useInfinitePayments } from "./hooks/useQueries";
import type { PaymentListResponse } from "dodopayments/resources";
import {
  formatCurrencyAndAmount,
  formatDateShort,
  getReadableStatus,
  getPaymentMethodDisplay,
} from "./utils/formatting";

function getPaymentStatusBadgeColor(status: string): Color {
  switch (status.toLowerCase()) {
    case "completed":
    case "success":
    case "succeeded":
      return Color.Green;
    case "failed":
    case "error":
      return Color.Red;
    case "pending":
    case "processing":
      return Color.Yellow;
    case "canceled":
    case "cancelled":
      return Color.Orange;
    case "refunded":
      return Color.Purple;
    default:
      return Color.SecondaryText;
  }
}

function getPaymentTypeBadgeColor(payment: PaymentListResponse): Color {
  // Different colors for different payment types
  if (payment.subscription_id) {
    return Color.Orange; // Orange for subscription payments
  }

  // Purple for refunds
  if (payment.total_amount < 0) {
    return Color.Purple;
  }

  return Color.Blue; // Blue for one-time payments
}

function getPaymentFrequencyBadgeColor(): Color {
  return Color.SecondaryText; // Gray color for frequency badge
}

function getPaymentType(payment: PaymentListResponse): string {
  // Determine payment type based on various characteristics
  if (payment.subscription_id) {
    return "Subscription";
  }

  // Check if it's a refund (negative amount)
  if (payment.total_amount < 0) {
    return "Refund";
  }

  return "One-time";
}

function PaymentsList() {
  const { config } = useAuth();
  const currentMode = config?.mode || "live";

  const { data: paymentsData, isLoading, error, fetchNextPage, hasNextPage } = useInfinitePayments({ limit: 50 });

  // Show toast notifications based on query state
  React.useEffect(() => {
    if (isLoading) {
      showToast({
        style: Toast.Style.Animated,
        title: "Loading payments...",
      });
    } else if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load payments",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } else if (paymentsData) {
      const totalItems = paymentsData.pages.reduce((acc, page) => acc + page.items.length, 0);
      showToast({
        style: Toast.Style.Success,
        title: `Loaded ${totalItems} payments`,
      });
    }
  }, [isLoading, error, paymentsData]);

  // Flatten all pages into a single array
  const payments: PaymentListResponse[] = React.useMemo(
    () => paymentsData?.pages.flatMap((page) => page.items) || [],
    [paymentsData?.pages],
  );

  const handleFetchNextPage = useCallback(() => fetchNextPage(), [fetchNextPage]);

  if (!isLoading && payments.length === 0) {
    return (
      <List searchBarPlaceholder="Search payments...">
        <List.EmptyView
          icon={Icon.CreditCard}
          title="No Payments Found"
          description="No payments are available for your account."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search payments..."
      pagination={{
        hasMore: hasNextPage,
        pageSize: 50,
        onLoadMore: handleFetchNextPage,
      }}
      isShowingDetail
    >
      {payments.map((payment) => (
        <List.Item
          key={payment.payment_id}
          icon={{
            source: Icon.CreditCard,
            tintColor: getPaymentStatusBadgeColor(payment.status || "unknown"),
          }}
          title={payment.metadata?.description || payment.customer.name || "Payment"}
          accessories={[
            {
              text: formatCurrencyAndAmount(payment.total_amount, payment.currency),
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
                    text={payment.customer.email}
                    target={`mailto:${payment.customer.email}`}
                  />
                  <List.Item.Detail.Metadata.Label title="Timestamp" text={formatDateShort(payment.created_at)} />
                  <List.Item.Detail.Metadata.Label title="Organization" text={payment.customer.name || "—"} />

                  {/* Payment Type Badge */}
                  <List.Item.Detail.Metadata.TagList title="Product">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={getPaymentType(payment)}
                      color={getPaymentTypeBadgeColor(payment)}
                    />
                  </List.Item.Detail.Metadata.TagList>

                  {/* Payment Method Badge */}
                  <List.Item.Detail.Metadata.TagList title="Payment Method">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={getPaymentMethodDisplay(payment.payment_method)}
                      color={getPaymentFrequencyBadgeColor()}
                    />
                  </List.Item.Detail.Metadata.TagList>

                  {/* Status Badge */}
                  <List.Item.Detail.Metadata.TagList title="Status">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={getReadableStatus(payment.status)}
                      color={getPaymentStatusBadgeColor(payment.status || "unknown")}
                    />
                  </List.Item.Detail.Metadata.TagList>

                  <List.Item.Detail.Metadata.Label
                    title="Amount"
                    text={formatCurrencyAndAmount(payment.total_amount, payment.currency)}
                  />

                  <List.Item.Detail.Metadata.Separator />

                  {/* Additional Details */}
                  <List.Item.Detail.Metadata.Label title="Customer ID" text={payment.customer.customer_id} />
                  <List.Item.Detail.Metadata.Label title="Payment ID" text={payment.payment_id} />
                  {payment.subscription_id && (
                    <List.Item.Detail.Metadata.Label title="Subscription ID" text={payment.subscription_id} />
                  )}

                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label
                    title="Digital Products Delivered"
                    text={payment.digital_products_delivered ? "Yes" : "No"}
                    icon={{
                      source: Icon.Circle,
                      tintColor: payment.digital_products_delivered ? Color.Green : Color.Red,
                    }}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in Dodo Payments"
                url={`https://app.dodopayments.com/transactions/payments/${payment.payment_id}?backTo=/transactions/payments`}
                icon={Icon.Globe}
              />

              <Action.CopyToClipboard title="Copy Payment ID" content={payment.payment_id} />

              <Action.CopyToClipboard
                title="Copy Invoice Link"
                content={`https://${currentMode}.dodopayments.com/invoices/payments/${payment.payment_id}`}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
              />

              <Action.OpenInBrowser
                title="Show Invoice"
                url={`https://${currentMode}.dodopayments.com/invoices/payments/${payment.payment_id}`}
                icon={Icon.Document}
                shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
              />

              <Action.CopyToClipboard
                title="Copy Customer Email"
                content={payment.customer.email}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
              <Action.OpenInBrowser
                title="Email Customer"
                url={`mailto:${payment.customer.email}`}
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
export default withAuth(withAuthGuard(PaymentsList));
