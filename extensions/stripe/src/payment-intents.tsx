import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import snakeCase from "lodash/snakeCase";
import type Stripe from "stripe";
import { useStripeApi, useStripeDashboard } from "./hooks";
import { convertAmount, convertTimestampToDate, titleCase, resolveMetadataValue } from "./utils";
import { STRIPE_ENDPOINTS } from "./enums";
import { ListContainer, withEnvContext } from "./components";

type PaymentIntent = {
  id: string;
  amount: number;
  amount_capturable: number;
  amount_received: number;
  created_at: string;
  cancelled_at: string;
  currency: string;
  status: string;
  metadata: Stripe.Metadata;
};

const resolvedMetadata = (metadata: Stripe.Metadata) =>
  Object.keys(metadata).reduce((acc, key) => {
    const value = metadata[key];
    return { ...acc, [`metadata_${snakeCase(key)}`]: value };
  }, {});

const resolvePaymentIntent = (paymentIntent: Stripe.PaymentIntent): PaymentIntent => {
  const resolvedPaymentIntent: PaymentIntent = {
    ...paymentIntent,
    ...resolvedMetadata(paymentIntent.metadata),
    created_at: convertTimestampToDate(paymentIntent.created),
    cancelled_at: convertTimestampToDate(paymentIntent.canceled_at),
    amount_capturable: convertAmount(paymentIntent.amount_capturable),
    amount_received: convertAmount(paymentIntent.amount_received),
    amount: convertAmount(paymentIntent.amount),
    currency: paymentIntent.currency.toUpperCase(),
  };

  return resolvedPaymentIntent;
};

const PaymentIntents = () => {
  const { isLoading, data } = useStripeApi(STRIPE_ENDPOINTS.PAYMENT_INTENTS, true);
  const { dashboardUrl } = useStripeDashboard();
  const formattedPaymentIntents = (data as Stripe.PaymentIntent[]).map(resolvePaymentIntent);

  const renderPaymentIntents = (paymentIntent: PaymentIntent) => {
    const { amount, currency, id } = paymentIntent;

    return (
      <List.Item
        key={id}
        title={`${currency} ${amount}`}
        icon={{ source: Icon.Coins, tintColor: Color.Yellow }}
        actions={
          <ActionPanel title="Actions">
            <Action.OpenInBrowser title="View Payment Intent" url={`${dashboardUrl}/payments/${id}`} />
            <Action.CopyToClipboard title="Copy Payment Intent ID" content={id} />
          </ActionPanel>
        }
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Metadata" />
                <List.Item.Detail.Metadata.Separator />
                {Object.entries(paymentIntent).map(([type, value]) => {
                  if (type === "metadata") return null;
                  const resolvedValue = resolveMetadataValue(value as string | number | boolean | null | undefined);
                  if (!resolvedValue) return null;

                  return <List.Item.Detail.Metadata.Label key={type} title={titleCase(type)} text={resolvedValue} />;
                })}
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    );
  };

  return (
    <ListContainer isLoading={isLoading} isShowingDetail={!isLoading}>
      <List.Section title="Payment Intents">{formattedPaymentIntents.map(renderPaymentIntents)}</List.Section>
    </ListContainer>
  );
};

export default withEnvContext(PaymentIntents);
