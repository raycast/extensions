import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import capitalize from "lodash/capitalize";
import get from "lodash/get";
import type Stripe from "stripe";
import { useStripeApi, useStripeDashboard } from "./hooks";
import { convertAmount } from "./utils";
import { STRIPE_ENDPOINTS } from "./enums";
import { ListContainer, withEnvContext } from "./components";

type Balance = {
  amount: number;
  currency: string;
  sourceTypes: Array<{ type: string; value: string }>;
};

const createSourceTypes = (balance: Stripe.Balance.Available): Balance["sourceTypes"] => {
  if (!balance.source_types) {
    return [];
  }

  const sourceTypes = Object.entries(balance.source_types).map(([type, value]) => ({
    type: capitalize(type),
    value: `${balance.currency.toUpperCase()}  ${convertAmount(value as number)}`,
  }));

  return sourceTypes;
};

const resolveBalance = (balance: Stripe.Balance.Available): Balance => {
  const resolvedBalance: Balance = {
    amount: convertAmount(balance.amount),
    currency: balance.currency.toUpperCase(),
    sourceTypes: createSourceTypes(balance),
  };

  return resolvedBalance;
};

const Balance = () => {
  const { isLoading, data, error } = useStripeApi(STRIPE_ENDPOINTS.BALANCE);
  const { dashboardUrl } = useStripeDashboard();
  const available = error ? [] : get(data, "available", []);
  const pending = error ? [] : get(data, "pending", []);
  const connectReserved = error ? [] : get(data, "connect_reserved", []);
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
    <ListContainer isLoading={isLoading} isShowingDetail={!isLoading}>
      <List.Section title="Available">{availableBalance.map(renderBalance)}</List.Section>
      <List.Section title="Pending">{pendingBalance.map(renderBalance)}</List.Section>
      <List.Section title="Connect Reserved">{connectReservedBalance.map(renderBalance)}</List.Section>
    </ListContainer>
  );
};

export default withEnvContext(Balance);
