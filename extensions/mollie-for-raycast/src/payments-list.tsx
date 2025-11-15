// src/payments-list.tsx
import { List, Icon, Color, ActionPanel, Action, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { authorize } from "./oauth";
import { useState, useEffect, useMemo } from "react";

// --- Type Interfaces for Mollie API Responses ---
interface Amount {
  value: string;
  currency: string;
}

interface Payment {
  id: string;
  amount: Amount;
  description: string;
  status: "paid" | "open" | "pending" | "failed" | "expired" | "canceled" | "refunded" | "refund-pending";
  method: string | null;
  createdAt: string;
  _links: {
    dashboard: {
      href: string;
    };
  };
}

interface PaginatedPayments {
  _embedded: {
    payments: Payment[];
  };
}

// Helper to format currency
const formatCurrency = (value: string, currency: string) => {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(parseFloat(value));
};

// Helper to format date/time - show time if today, date if other day
const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTimestamp = today.getTime();
  const paymentDate = new Date(date);
  paymentDate.setHours(0, 0, 0, 0);

  if (paymentDate.getTime() === todayTimestamp) {
    // Show time if today
    return date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  } else {
    // Show date if any other day
    return date.toLocaleDateString("nl-NL", { day: "2-digit", month: "short" });
  }
};

// Helper to get payment method icon
const getPaymentMethodIcon = (method: string | null): { source: string } | Icon => {
  if (!method) return Icon.BankNote;

  switch (method.toLowerCase()) {
    case "creditcard":
      return { source: "payment-methods/creditcard.png" };
    case "ideal":
      return { source: "payment-methods/ideal.png" };
    case "bancontact":
      return { source: "payment-methods/bancontact.png" };
    case "banktransfer":
      return { source: "payment-methods/banktransfer.png" };
    case "paypal":
      return { source: "payment-methods/paypal.png" };
    case "applepay":
      return { source: "payment-methods/applepay.png" };
    case "klarnapaylater":
      return { source: "payment-methods/klarna.png" };
    case "klarnasliceit":
      return { source: "payment-methods/klarna.png" };
    case "giftcard":
      return { source: "payment-methods/giftcard.png" };
    case "voucher":
      return { source: "payment-methods/voucher.png" };
    case "sofort":
      return { source: "payment-methods/sofort.png" };
    case "eps":
      return { source: "payment-methods/eps.png" };
    case "giropay":
      return { source: "payment-methods/giropay.png" };
    case "belfius":
      return { source: "payment-methods/belfius.png" };
    case "kbc":
      return { source: "payment-methods/kbc.png" };
    case "przelewy24":
      return { source: "payment-methods/przelewy24.png" };
    case "mybank":
      return { source: "payment-methods/mybank.png" };
    default:
      // Fallback to Raycast icon if no image is found
      return Icon.BankNote;
  }
};

// Helper to get status pill display
const getStatusTag = (status: Payment["status"]): List.Item.Accessory => {
  switch (status) {
    case "paid":
      return { tag: { value: "Paid", color: Color.Green } };
    case "open":
      return { tag: { value: "Open", color: Color.Blue } };
    case "pending":
      return { tag: { value: "Pending", color: Color.Orange } };
    case "failed":
      return { tag: { value: "Failed", color: Color.Red } };
    case "expired":
      return { tag: { value: "Expired", color: Color.SecondaryText } };
    case "canceled":
      return { tag: { value: "Canceled", color: Color.SecondaryText } };
    case "refunded":
      return { tag: { value: "Refunded", color: Color.Purple } };
    case "refund-pending":
      return { tag: { value: "Refund Pending", color: Color.Magenta } };
    default:
      return { tag: { value: status, color: Color.SecondaryText } };
  }
};

// The actual Payments List component
function PaymentsList({ accessToken }: { accessToken: string }) {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading, revalidate } = useFetch<PaginatedPayments>(`https://api.mollie.com/v2/payments?limit=250`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    keepPreviousData: true,
  });

  const allPayments = data?._embedded?.payments || [];

  // Function to handle refund
  async function handleRefund(payment: Payment) {
    const confirmed = await confirmAlert({
      title: "Refund Payment",
      message: `Are you sure you want to refund ${formatCurrency(payment.amount.value, payment.amount.currency)} for "${payment.description || "No description"}"?`,
      primaryAction: {
        title: "Refund",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Processing refund...",
    });

    try {
      const response = await fetch(`https://api.mollie.com/v2/payments/${payment.id}/refunds`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: {
            currency: payment.amount.currency,
            value: payment.amount.value,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.title || `HTTP error! Status: ${response.status}`);
      }

      toast.style = Toast.Style.Success;
      toast.title = "Refund Successful";
      toast.message = `Refunded ${formatCurrency(payment.amount.value, payment.amount.currency)}`;

      // Refresh the payment list
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Refund Failed";
      toast.message = error instanceof Error ? error.message : "An unknown error occurred.";
    }
  }

  // Filter payments based on selected status
  const filteredPayments = useMemo(() => {
    if (statusFilter === "all") {
      return allPayments;
    }
    return allPayments.filter((payment) => payment.status === statusFilter);
  }, [allPayments, statusFilter]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search payments..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Status" value={statusFilter} onChange={setStatusFilter}>
          <List.Dropdown.Item title="All Payments" value="all" />
          <List.Dropdown.Section title="Status">
            <List.Dropdown.Item title="Paid" value="paid" icon={{ source: Icon.Dot, tintColor: Color.Green }} />
            <List.Dropdown.Item title="Open" value="open" icon={{ source: Icon.Dot, tintColor: Color.Blue }} />
            <List.Dropdown.Item title="Pending" value="pending" icon={{ source: Icon.Dot, tintColor: Color.Orange }} />
            <List.Dropdown.Item title="Failed" value="failed" icon={{ source: Icon.Dot, tintColor: Color.Red }} />
            <List.Dropdown.Item
              title="Refunded"
              value="refunded"
              icon={{ source: Icon.Dot, tintColor: Color.Purple }}
            />
            <List.Dropdown.Item
              title="Refund Pending"
              value="refund-pending"
              icon={{ source: Icon.Dot, tintColor: Color.Magenta }}
            />
            <List.Dropdown.Item
              title="Expired"
              value="expired"
              icon={{ source: Icon.Dot, tintColor: Color.SecondaryText }}
            />
            <List.Dropdown.Item
              title="Canceled"
              value="canceled"
              icon={{ source: Icon.Dot, tintColor: Color.SecondaryText }}
            />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredPayments.map((payment) => {
        const statusTag = getStatusTag(payment.status);
        const paymentMethodIcon = getPaymentMethodIcon(payment.method);
        const formattedDateTime = formatDateTime(payment.createdAt);
        return (
          <List.Item
            key={payment.id}
            icon={paymentMethodIcon}
            title={payment.description || "No description"}
            subtitle={formattedDateTime}
            accessories={[statusTag, { text: formatCurrency(payment.amount.value, payment.amount.currency) }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={payment._links.dashboard.href} title="Open in Mollie Dashboard" />
                {payment.status === "paid" && (
                  <Action
                    title="Refund Payment"
                    icon={Icon.ArrowCounterClockwise}
                    style={Action.Style.Destructive}
                    onAction={() => handleRefund(payment)}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                )}
                <Action.CopyToClipboard title="Copy Payment Id to Clipboard" content={payment.id} />
                <Action.CopyToClipboard
                  title="Copy Amount to Clipboard"
                  content={formatCurrency(payment.amount.value, payment.amount.currency)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
      {!isLoading && filteredPayments.length === 0 && (
        <List.EmptyView
          title="No Payments Found"
          description={
            statusFilter === "all"
              ? "You don't have any payments yet."
              : `No ${statusFilter} payments found. Try changing the filter.`
          }
          icon={Icon.BankNote}
        />
      )}
    </List>
  );
}

// Main component to handle the authorization flow
export default function Command() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function doAuthorize() {
      try {
        const token = await authorize();
        setAccessToken(token);
      } catch (err) {
        console.error("Authorization failed:", err);
        setError(err as Error);
        showToast(Toast.Style.Failure, "Authorization Failed", (err as Error).message);
      } finally {
        setIsLoading(false);
      }
    }
    doAuthorize();
  }, []);

  if (error) {
    return (
      <List>
        <List.EmptyView title="Authorization Failed" description={error.message} icon={Icon.Warning} />
      </List>
    );
  }

  return isLoading ? <List isLoading={true} /> : <PaymentsList accessToken={accessToken!} />;
}
