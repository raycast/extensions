import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
  Color,
  getPreferenceValues,
  Detail,
  useNavigation,
} from "@raycast/api";
import React from "react";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { withEnvContext, ListContainer } from "./components";
import { useStripeDashboard, useEnvContext } from "./hooks";
import { STRIPE_API_VERSION } from "./enums";
import { convertAmount, convertTimestampToDate } from "./utils";
import Stripe from "stripe";

const { stripeTestApiKey, stripeLiveApiKey } = getPreferenceValues();

// Constants
const RESULTS_LIMIT = 10;

// Create Stripe clients for both environments
const stripeTest = stripeTestApiKey ? new Stripe(stripeTestApiKey, { apiVersion: STRIPE_API_VERSION }) : null;
const stripeLive = stripeLiveApiKey ? new Stripe(stripeLiveApiKey, { apiVersion: STRIPE_API_VERSION }) : null;

// Subscription Detail Component
const SubscriptionDetailBase = ({ subscription }: { subscription: Stripe.Subscription }) => {
  const { dashboardUrl } = useStripeDashboard();
  const { pop } = useNavigation();

  const customer = subscription.customer as Stripe.Customer;
  const price = subscription.items.data[0]?.price;
  const amount = price?.unit_amount || 0;
  const currency = subscription.currency?.toUpperCase() || "USD";
  const interval = price?.recurring?.interval || "month";
  const createdDate = convertTimestampToDate(subscription.created);
  const nextBillingDate = convertTimestampToDate(subscription.current_period_end);

  const markdown = `
# Subscription Details

## Customer Information
- **Email**: ${customer?.email || "N/A"}
- **Name**: ${customer?.name || "N/A"}
- **Customer ID**: ${customer?.id || "N/A"}

## Subscription Information
- **ID**: ${subscription.id}
- **Status**: ${subscription.status}
- **Created**: ${createdDate}
- **Next Billing**: ${nextBillingDate}

## Pricing
- **Amount**: ${currency} ${convertAmount(amount)} / ${interval}
${
  price?.product
    ? `- **Product**: ${
        typeof price.product === "string"
          ? price.product
          : ("name" in price.product && price.product.name) || price.product.id
      }`
    : ""
}

${subscription.trial_end ? `## Trial\n- **Trial Ends**: ${convertTimestampToDate(subscription.trial_end)}` : ""}

${subscription.cancel_at ? `## Cancellation\n- **Cancels At**: ${convertTimestampToDate(subscription.cancel_at)}` : ""}

${
  subscription.metadata && Object.keys(subscription.metadata).length > 0
    ? `## Metadata\n${Object.entries(subscription.metadata)
        .map(([key, value]) => `- **${key}**: ${value}`)
        .join("\n")}`
    : ""
}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Back to List" icon={Icon.ArrowLeft} onAction={pop} />
          <Action.OpenInBrowser
            title="View in Stripe Dashboard"
            url={`${dashboardUrl}/subscriptions/${subscription.id}`}
          />
        </ActionPanel>
      }
    />
  );
};

const SubscriptionDetail = withEnvContext(SubscriptionDetailBase);

interface SubscriptionListProps {
  customerId?: string;
}

function SubscriptionList({ customerId }: SubscriptionListProps = {}) {
  const { environment } = useEnvContext();
  const { dashboardUrl } = useStripeDashboard();
  const stripe = environment === "test" ? stripeTest : stripeLive;
  const { push } = useNavigation();

  const {
    isLoading,
    data: allSubscriptions,
    pagination,
    revalidate,
  } = useCachedPromise(
    (customerIdParam: string | undefined) => async (options: { page: number; cursor?: string }) => {
      if (!stripe) {
        throw new Error(`Stripe ${environment} API key is not configured`);
      }

      const params: Stripe.SubscriptionListParams = {
        limit: RESULTS_LIMIT,
        expand: ["data.customer", "data.latest_invoice"],
        status: "all", // Include all subscription statuses (active, canceled, etc.)
      };

      // Filter by customer if customerId is provided
      if (customerIdParam) {
        params.customer = customerIdParam;
      }

      // Add starting_after for pagination
      if (options.cursor) {
        params.starting_after = options.cursor;
      }

      const response = await stripe.subscriptions.list(params);

      return {
        data: response.data,
        hasMore: response.has_more,
        cursor: response.data[response.data.length - 1]?.id,
      };
    },
    [customerId],
    {
      keepPreviousData: true,
    },
  );

  const handleCancelSubscription = async (subscription: Stripe.Subscription) => {
    if (!stripe) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Stripe ${environment} API key is not configured`,
      });
      return;
    }

    const customer = subscription.customer as Stripe.Customer;
    const customerName = customer?.email || customer?.name || "this subscription";

    const confirmed = await confirmAlert({
      title: "Cancel Subscription?",
      message: `Are you sure you want to cancel the subscription for ${customerName}? This action cannot be undone.`,
      icon: Icon.XMarkCircle,
      primaryAction: {
        title: "Cancel Subscription",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await showToast({
          style: Toast.Style.Animated,
          title: "Cancelling subscription...",
        });

        await stripe.subscriptions.cancel(subscription.id);

        await showToast({
          style: Toast.Style.Success,
          title: "Subscription cancelled successfully",
        });

        // Revalidate the list to remove the cancelled subscription
        revalidate();
      } catch (error) {
        await showFailureToast(error, {
          title: "Failed to cancel subscription",
        });
      }
    }
  };

  const handleRefundLastPayment = async (subscription: Stripe.Subscription) => {
    if (!stripe) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Stripe ${environment} API key is not configured`,
      });
      return;
    }

    const customer = subscription.customer as Stripe.Customer;
    const customerName = customer?.email || customer?.name || "this customer";
    const amount = subscription.items.data[0]?.price?.unit_amount || 0;
    const currency = subscription.currency?.toUpperCase() || "USD";

    const confirmed = await confirmAlert({
      title: "Refund Last Payment?",
      message: `Are you sure you want to refund ${currency} ${convertAmount(amount)} to ${customerName}?`,
      icon: Icon.Receipt,
      primaryAction: {
        title: "Refund",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await showToast({
          style: Toast.Style.Animated,
          title: "Processing refund...",
        });

        const latestInvoice = subscription.latest_invoice;
        if (!latestInvoice) {
          throw new Error("No invoice found for this subscription");
        }

        const invoiceId = typeof latestInvoice === "string" ? latestInvoice : latestInvoice.id;
        const invoice = await stripe.invoices.retrieve(invoiceId);

        if (!invoice.charge) {
          throw new Error("No charge found for the latest invoice");
        }

        const chargeId = typeof invoice.charge === "string" ? invoice.charge : invoice.charge.id;
        await stripe.refunds.create({
          charge: chargeId,
        });

        await showToast({
          style: Toast.Style.Success,
          title: "Refund processed successfully",
          message: `${currency} ${convertAmount(amount)} refunded`,
        });
      } catch (error) {
        await showFailureToast(error, {
          title: "Failed to process refund",
        });
      }
    }
  };

  return (
    <ListContainer searchBarPlaceholder="Search by subscription id..." isLoading={isLoading} pagination={pagination}>
      {allSubscriptions?.map((subscription: Stripe.Subscription) => {
        const customer = subscription.customer as Stripe.Customer;
        const price = subscription.items.data[0]?.price;
        const amount = price?.unit_amount || 0;
        const currency = subscription.currency?.toUpperCase() || "USD";
        const interval = price?.recurring?.interval || "month";

        return (
          <List.Item
            key={subscription.id}
            title={customer?.email || customer?.name || "Unnamed Customer"}
            subtitle={`${currency} ${convertAmount(amount)} / ${interval}`}
            accessories={[
              {
                date: new Date(subscription.created * 1000),
                tooltip: "Started",
              },
              {
                tag: {
                  value: subscription.status.toUpperCase(),
                  color:
                    subscription.status === "active"
                      ? Color.Green
                      : subscription.status === "canceled"
                        ? Color.Red
                        : subscription.status === "past_due"
                          ? Color.Orange
                          : subscription.status === "unpaid"
                            ? Color.Red
                            : subscription.status === "incomplete"
                              ? Color.Yellow
                              : subscription.status === "incomplete_expired"
                                ? Color.Red
                                : subscription.status === "trialing"
                                  ? Color.Blue
                                  : subscription.status === "paused"
                                    ? Color.SecondaryText
                                    : Color.SecondaryText,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="View Details"
                  icon={Icon.Eye}
                  onAction={() => push(<SubscriptionDetail subscription={subscription} />)}
                />
                <Action
                  title="Cancel Subscription"
                  icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                  shortcut={{ modifiers: ["cmd"], key: "delete" }}
                  onAction={() => handleCancelSubscription(subscription)}
                />
                <Action
                  title="Refund Last Payment"
                  icon={{ source: Icon.Receipt, tintColor: Color.Orange }}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => handleRefundLastPayment(subscription)}
                />
                <Action.OpenInBrowser
                  title="View in Stripe Dashboard"
                  url={`${dashboardUrl}/subscriptions/${subscription.id}`}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                {customer?.email && (
                  <Action.CopyToClipboard
                    title="Copy Email"
                    content={customer.email}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                )}
                <Action.CopyToClipboard
                  title="Copy Subscription ID"
                  content={subscription.id}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </ListContainer>
  );
}

export default withEnvContext(SubscriptionList) as React.FC<SubscriptionListProps>;
