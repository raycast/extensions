import React from "react";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import snakeCase from "lodash/snakeCase";
import { useStripeApi, useStripeDashboard } from "./hooks";
import { convertAmount, convertTimestampToDate, titleCase } from "./utils";
import { STRIPE_ENDPOINTS } from "./enums";
import { ListContainer, withEnvContext } from "./components";

type PaymentIntentResp = {
  id: string;
  amount: number;
  amount_capturable: number;
  amount_received: number;
  created: number;
  cancelled_at: number | null;
  currency: string;
  status: string;
  metadata: any;
};

type PaymentIntent = {
  id: string;
  amount: number;
  amount_capturable: number;
  amount_received: number;
  created_at: string;
  cancelled_at: string;
  currency: string;
  status: string;
  metadata: any;
};

const resolvedMetadata = (metadata: any) =>
  Object.keys(metadata).reduce((acc, key) => {
    const value = metadata[key];
    return { ...acc, [`metadata_${snakeCase(key)}`]: value };
  }, {});

const resolvePaymentIntent = ({
  amount = 0,
  amount_capturable = 0,
  amount_received = 0,
  currency = "",
  created,
  cancelled_at,
  metadata = {},
  ...rest
}: PaymentIntentResp): PaymentIntent => {
  const uppercaseCurrency = currency.toUpperCase();
  return {
    ...rest,
    ...(resolvedMetadata(metadata) as any),
    created_at: convertTimestampToDate(created),
    cancelled_at: convertTimestampToDate(cancelled_at),
    amount_capturable: convertAmount(amount_capturable),
    amount_received: convertAmount(amount_received),
    amount: convertAmount(amount),
    currency: uppercaseCurrency,
  };
};

const resolveMetadataValue = (value: any) => {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return `${value}`;
  }

  return "";
};

const PaymentIntents = () => {
  const { isLoading, data } = useStripeApi(STRIPE_ENDPOINTS.PAYMENT_INTENTS, true);
  const { dashboardUrl } = useStripeDashboard();
  const formattedPaymentIntents = data.map(resolvePaymentIntent);

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
                  const resolvedValue = resolveMetadataValue(value);
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
