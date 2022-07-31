import React from "react";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import get from "lodash/get";
import capitalize from "lodash/capitalize";
import { useStripeApi, useStripeDashboard } from "../hooks";
import { convertAmount } from "../utils";
import { ENDPOINTS } from "../enums";
import { withPropsContext } from "../components";

type BalanceResp = {
  amount: number;
  currency: string;
  source_types: unknown[];
};

type Balance = {
  amount: number;
  currency: string;
  sourceTypes: Array<{ type: string; value: string }>;
};

const resolveBalance = ({ amount = 0, currency = "", source_types = [] }: BalanceResp): Balance => {
  const uppercaseCurrency = currency.toUpperCase();

  return {
    amount: convertAmount(amount),
    currency: uppercaseCurrency,
    sourceTypes: Object.entries(source_types).map(([sourceType, value]) => ({
      type: capitalize(sourceType),
      value: `${uppercaseCurrency}  ${convertAmount(value as number)}`,
    })),
  };
};

const Balance = () => {
  const { isLoading, data } = useStripeApi(ENDPOINTS.BALANCE);
  const { dashboardUrl } = useStripeDashboard();
  const available = get(data, "available", []);
  const pending = get(data, "pending", []);
  const connectReserved = get(data, "connect_reserved", []);
  const availableBalance = available.map(resolveBalance);
  const connectReservedBalance = connectReserved.map(resolveBalance);
  const pendingBalance = pending.map(resolveBalance);

  const renderBalance = ({ amount, currency, sourceTypes }: Balance) => {
    const id = `${currency}-${amount}`;
    return (
      <List.Item
        key={id}
        title={`${currency} ${amount}`}
        icon={{ source: Icon.BankNote, tintColor: Color.Green }}
        actions={
          <ActionPanel title="Actions">
            <Action.OpenInBrowser
              title="Open in Stripe Dashboard"
              url={`${dashboardUrl}/balance/overview?currency=${currency.toLowerCase()}`}
            />
          </ActionPanel>
        }
        detail={
          Boolean(sourceTypes.length) && (
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Source Types" />
                  <List.Item.Detail.Metadata.Separator />
                  {sourceTypes.map(({ type, value }) => (
                    <List.Item.Detail.Metadata.Label key={value} title={type} text={value} />
                  ))}
                </List.Item.Detail.Metadata>
              }
            />
          )
        }
      />
    );
  };

  return (
    <List isLoading={isLoading} isShowingDetail={!isLoading}>
      <List.Section title="Available">{availableBalance.map(renderBalance)}</List.Section>
      <List.Section title="Pending">{pendingBalance.map(renderBalance)}</List.Section>
      <List.Section title="Connect Reserved">{connectReservedBalance.map(renderBalance)}</List.Section>
    </List>
  );
};

export default withPropsContext(Balance);
