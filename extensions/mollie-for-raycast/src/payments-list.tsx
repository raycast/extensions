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
const getPaymentMethodIcon = (method: string | null): { source: string } => {
  if (!method) return { source: "payment-methods/Fallback.png" };

  switch (method.toLowerCase()) {
    // Card payments
    case "creditcard":
      return { source: "payment-methods/Credit-card.png" };
    case "americanexpress":
      return { source: "payment-methods/Amex.png" };
    case "cartebancaire":
      return { source: "payment-methods/Carte-Bancaire.png" };
    case "maestro":
      return { source: "payment-methods/Maestro.png" };
    case "mastercard":
      return { source: "payment-methods/Mastercard.png" };
    case "visa":
      return { source: "payment-methods/Visa.png" };
    case "postepay":
      return { source: "payment-methods/PostePay.png" };

    // Wallet payments
    case "applepay":
      return { source: "payment-methods/Apple-Pay.png" };
    case "googlepay":
      return { source: "payment-methods/Google-Pay.png" };
    case "paypal":
      return { source: "payment-methods/PayPal.png" };

    // iDEAL variants
    case "ideal":
      return { source: "payment-methods/iDEAL-Wero.png" };
    case "idealin3":
      return { source: "payment-methods/iDEALin3.png" };
    case "idealqr":
      return { source: "payment-methods/iDEAL-QR.png" };

    // Klarna variants
    case "klarna":
    case "klarnapaylater":
    case "klarnasliceit":
    case "klarnapaynow":
      return { source: "payment-methods/Klarna.png" };

    // Buy now pay later
    case "alma":
      return { source: "payment-methods/Alma.png" };
    case "billie":
      return { source: "payment-methods/Billie.png" };
    case "in3":
      return { source: "payment-methods/in3.png" };
    case "in3business":
      return { source: "payment-methods/in3business.png" };
    case "riverty":
      return { source: "payment-methods/Riverty.png" };

    // Bank transfers & direct debit
    case "banktransfer":
      return { source: "payment-methods/Banktransfer.png" };
    case "directdebit":
      return { source: "payment-methods/Direct-debit.png" };
    case "bacs":
      return { source: "payment-methods/BACS.png" };

    // Belgian methods
    case "bancontact":
      return { source: "payment-methods/Bancontact.png" };
    case "belfius":
      return { source: "payment-methods/Belfius.png" };
    case "kbc":
      return { source: "payment-methods/KBC.png" };
    case "payconiq":
      return { source: "payment-methods/Payconiq.png" };

    // German methods
    case "eps":
      return { source: "payment-methods/EPS.png" };
    case "giropay":
      return { source: "payment-methods/giropay.png" };

    // Italian methods
    case "bancomatpay":
      return { source: "payment-methods/Bancomat.png" };
    case "mybank":
      return { source: "payment-methods/MyBank.png" };
    case "satispay":
      return { source: "payment-methods/Satispay.png" };

    // Portuguese methods
    case "mbway":
      return { source: "payment-methods/MB-Way.png" };
    case "multibanco":
      return { source: "payment-methods/Multibanco.png" };

    // Polish methods
    case "blik":
      return { source: "payment-methods/Blik.png" };
    case "przelewy24":
      return { source: "payment-methods/P24.png" };

    // Spanish methods
    case "bizum":
      return { source: "payment-methods/Bizum.png" };

    // Nordic methods
    case "mobilepay":
      return { source: "payment-methods/MobilePay.png" };
    case "swish":
      return { source: "payment-methods/Swish.png" };
    case "vipps":
      return { source: "payment-methods/Vipps.png" };

    // Swiss methods
    case "twint":
      return { source: "payment-methods/Twint.png" };

    // Other European methods
    case "trustly":
      return { source: "payment-methods/Trustly.png" };
    case "paybybank":
      return { source: "payment-methods/Pay-By-Bank.png" };
    case "wero":
      return { source: "payment-methods/Wero.png" };

    // Vouchers & gift cards
    case "giftcard":
      return { source: "payment-methods/Giftcard.png" };
    case "voucher":
      return { source: "payment-methods/Voucher.png" };
    case "paysafecard":
      return { source: "payment-methods/paysafecard.png" };

    // Point of sale
    case "pointofsale":
      return { source: "payment-methods/Point-of-Sale.png" };

    default:
      return { source: "payment-methods/Fallback.png" };
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
                <Action.CopyToClipboard title="Copy Payment ID to Clipboard" content={payment.id} />
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
