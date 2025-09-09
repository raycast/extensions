import { Action, ActionPanel, Icon, List, Color, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { withEnvContext } from "./components";
import { useStripeDashboard, useEnvContext } from "./hooks";
import { STRIPE_API_VERSION } from "./enums";
import Stripe from "stripe";
import { getPreferenceValues } from "@raycast/api";

const { stripeTestApiKey, stripeLiveApiKey } = getPreferenceValues();

// Create Stripe clients for both environments
const stripeTest = stripeTestApiKey ? new Stripe(stripeTestApiKey, { apiVersion: STRIPE_API_VERSION }) : null;
const stripeLive = stripeLiveApiKey ? new Stripe(stripeLiveApiKey, { apiVersion: STRIPE_API_VERSION }) : null;

interface CustomerPaymentsListProps {
  customerId: string;
}

function CustomerPaymentsList({ customerId }: CustomerPaymentsListProps) {
  const { environment } = useEnvContext();
  const { dashboardUrl } = useStripeDashboard();
  const stripe = environment === "test" ? stripeTest : stripeLive;

  const { isLoading, data, revalidate } = useCachedPromise(
    async () => {
      if (!stripe) {
        throw new Error(`Stripe ${environment} API key is not configured`);
      }

      // Fetch charges for this customer
      const charges = await stripe.charges.list({
        customer: customerId,
        limit: 100,
      });

      return charges.data;
    },
    [],
    {
      keepPreviousData: true,
    },
  );

  const handleRefund = async (charge: Stripe.Charge) => {
    if (!stripe) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: `Stripe ${environment} API key is not configured`,
      });
      return;
    }

    const remainingAmount = charge.amount - charge.amount_refunded;

    const confirmed = await confirmAlert({
      title: "Refund Payment",
      message: `Are you sure you want to refund ${(remainingAmount / 100).toFixed(
        2,
      )} ${charge.currency.toUpperCase()}?`,
      primaryAction: {
        title: "Refund",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Processing refund...",
      });

      // Create the refund
      await stripe.refunds.create({
        charge: charge.id,
        reason: "requested_by_customer",
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Refund Successful",
        message: `Refunded ${(remainingAmount / 100).toFixed(2)} ${charge.currency.toUpperCase()}`,
      });

      // Revalidate the list to show updated status
      revalidate();
    } catch (error) {
      await showFailureToast(error, {
        title: "Refund Failed",
      });
    }
  };

  const getStatusColor = (charge: Stripe.Charge): Color => {
    if (charge.refunded) {
      return Color.SecondaryText;
    }
    if (charge.amount_refunded > 0) {
      return Color.Yellow;
    }
    if (charge.status === "succeeded") {
      return Color.Green;
    }
    if (charge.status === "failed") {
      return Color.Red;
    }
    return Color.Blue;
  };

  const formatAmount = (amount: number, currency: string): string => {
    return `${currency.toUpperCase()} ${(amount / 100).toFixed(2)}`;
  };

  const isRefundable = (charge: Stripe.Charge): boolean => {
    // Check if charge was successful and not fully refunded
    return charge.status === "succeeded" && !charge.refunded && charge.amount > charge.amount_refunded;
  };

  const getPaymentIntentId = (charge: Stripe.Charge): string | null => {
    if (!charge.payment_intent) return null;
    if (typeof charge.payment_intent === "string") {
      return charge.payment_intent;
    }
    return charge.payment_intent.id;
  };

  return (
    <List isLoading={isLoading} navigationTitle={`Customer Payments - ${customerId}`}>
      {data?.length === 0 ? (
        <List.EmptyView title="No payments found" description="This customer has no payment history" />
      ) : (
        data?.map((charge) => {
          const isPaymentRefundable = isRefundable(charge);
          const isPartiallyRefunded = charge.amount_refunded > 0 && !charge.refunded;
          const remainingAmount = charge.amount - charge.amount_refunded;
          const paymentIntentId = getPaymentIntentId(charge);

          return (
            <List.Item
              key={charge.id}
              title={formatAmount(charge.amount, charge.currency)}
              subtitle={charge.description || charge.id}
              accessories={[
                {
                  date: new Date(charge.created * 1000),
                  tooltip: "Payment Date",
                },
                {
                  tag: {
                    value: charge.refunded ? "Fully Refunded" : charge.status,
                    color: getStatusColor(charge),
                  },
                },
                ...(isPartiallyRefunded
                  ? [
                      {
                        tag: {
                          value: `Refunded ${formatAmount(charge.amount_refunded, charge.currency)}`,
                          color: Color.Yellow,
                        },
                      },
                    ]
                  : []),
                ...(isPaymentRefundable
                  ? [
                      {
                        tag: {
                          value: `Refundable ${formatAmount(remainingAmount, charge.currency)}`,
                          color: Color.Blue,
                        },
                      },
                    ]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open in Stripe Dashboard"
                    icon={Icon.Globe}
                    url={
                      paymentIntentId
                        ? `${dashboardUrl}/payments/${paymentIntentId}`
                        : `${dashboardUrl}/payments?query=${charge.id}`
                    }
                  />
                  {isPaymentRefundable && (
                    <Action
                      title="Refund Payment"
                      icon={Icon.ArrowCounterClockwise}
                      style={Action.Style.Destructive}
                      onAction={() => handleRefund(charge)}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  )}
                  <Action.CopyToClipboard
                    title="Copy Charge ID"
                    content={charge.id}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  {charge.receipt_email && (
                    <Action.CopyToClipboard
                      title="Copy Receipt Email"
                      content={charge.receipt_email}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                    />
                  )}
                  {charge.receipt_url && (
                    <Action.OpenInBrowser
                      title="View Receipt"
                      icon={Icon.Receipt}
                      url={charge.receipt_url}
                      shortcut={{ modifiers: ["cmd"], key: "p" }}
                    />
                  )}
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

export default withEnvContext(CustomerPaymentsList);
