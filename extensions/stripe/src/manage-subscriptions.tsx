import { Action, ActionPanel, Alert, confirmAlert, Icon, List, Color, Detail, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { withProfileContext, ListContainer } from "@src/components";
import { useStripeDashboard, useStripeClient } from "@src/hooks";
import { SHORTCUTS } from "@src/constants/keyboard-shortcuts";
import {
  convertAmount,
  convertTimestampToDate,
  getSubscriptionStatusColor,
  showOperationToast,
  handleStripeError,
} from "@src/utils";
import type Stripe from "stripe";

// Constants
const RESULTS_LIMIT = 10;

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

const SubscriptionDetail = SubscriptionDetailBase;

interface SubscriptionListProps {
  customerId?: string;
}

function SubscriptionList({ customerId }: SubscriptionListProps = {}) {
  const { dashboardUrl } = useStripeDashboard();
  const stripe = useStripeClient();
  const { push } = useNavigation();

  const {
    isLoading,
    data: allSubscriptions,
    pagination,
    revalidate,
  } = useCachedPromise(
    (customerIdParam: string | undefined) => async (options: { page: number; cursor?: string }) => {
      if (!stripe) {
        throw new Error(`Stripe API key is not configured`);
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
        await showOperationToast(
          "Cancelling subscription",
          async () => await stripe.subscriptions.cancel(subscription.id),
          "Subscription cancelled successfully",
        );

        // Revalidate the list to remove the cancelled subscription
        revalidate();
      } catch (error) {
        await handleStripeError(error, "cancel subscription");
      }
    }
  };

  const handleRefundLastPayment = async (subscription: Stripe.Subscription) => {
    if (!stripe) {
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
        await showOperationToast(
          "Processing refund",
          async () => {
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
            return await stripe.refunds.create({ charge: chargeId });
          },
          `Refund processed successfully - ${currency} ${convertAmount(amount)} refunded`,
        );
      } catch (error) {
        await handleStripeError(error, "process refund");
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
                  color: getSubscriptionStatusColor(subscription.status),
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
                  shortcut={SHORTCUTS.DELETE}
                  onAction={() => handleCancelSubscription(subscription)}
                />
                <Action
                  title="Refund Last Payment"
                  icon={{ source: Icon.Receipt, tintColor: Color.Orange }}
                  shortcut={SHORTCUTS.REFUND}
                  onAction={() => handleRefundLastPayment(subscription)}
                />
                <Action.OpenInBrowser
                  title="View in Stripe Dashboard"
                  url={`${dashboardUrl}/subscriptions/${subscription.id}`}
                  shortcut={SHORTCUTS.OPEN_BROWSER}
                />
                {customer?.email && (
                  <Action.CopyToClipboard
                    title="Copy Email"
                    content={customer.email}
                    shortcut={SHORTCUTS.COPY_SECONDARY}
                  />
                )}
                <Action.CopyToClipboard
                  title="Copy Subscription ID"
                  content={subscription.id}
                  shortcut={SHORTCUTS.COPY_ID}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </ListContainer>
  );
}

export default withProfileContext(SubscriptionList) as React.FC<SubscriptionListProps>;
