import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import capitalize from "lodash/capitalize";
import type Stripe from "stripe";
import { useStripeApi, useStripeDashboard, useProfileContext } from "@src/hooks";
import { formatAmount } from "@src/utils";
import { STRIPE_ENDPOINTS } from "@src/enums";
import { ListContainer, withProfileContext, ProfileSwitcherActions } from "@src/components";

const BalanceActions = ({ balance, dashboardUrl }: { balance: Stripe.Balance.Available; dashboardUrl: string }) => {
  const formattedAmount = formatAmount(balance.amount, balance.currency);

  return (
    <ActionPanel>
      <Action.OpenInBrowser
        title="Open in Stripe Dashboard"
        url={`${dashboardUrl}/balance/overview?currency=${balance.currency.toLowerCase()}`}
        icon={Icon.Globe}
      />
      <Action.OpenInBrowser
        title="View Transactions"
        url={`${dashboardUrl}/balance/transactions?currency=${balance.currency.toLowerCase()}`}
        icon={Icon.List}
      />
      <Action.CopyToClipboard
        title="Copy Amount"
        content={formattedAmount}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      <Action.CopyToClipboard
        title="Copy Currency"
        content={balance.currency.toUpperCase()}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
    </ActionPanel>
  );
};

const BalanceDetail = ({ balance }: { balance: Stripe.Balance.Available }) => {
  if (!balance.source_types) return null;

  const sourceTypes = Object.entries(balance.source_types).map(([type, value]) => ({
    type: capitalize(type),
    value: formatAmount(value as number, balance.currency),
  }));

  if (sourceTypes.length === 0) return null;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Source Types" />
          <List.Item.Detail.Metadata.Separator />
          {sourceTypes.map(({ type, value }) => (
            <List.Item.Detail.Metadata.Label key={`${type}-${value}`} title={type} text={value} />
          ))}
        </List.Item.Detail.Metadata>
      }
    />
  );
};

const BalanceItem = ({ balance, dashboardUrl }: { balance: Stripe.Balance.Available; dashboardUrl: string }) => {
  const amount = formatAmount(balance.amount, balance.currency);
  const hasSourceTypes = balance.source_types && Object.keys(balance.source_types).length > 0;

  return (
    <List.Item
      key={`${balance.currency}-${balance.amount}`}
      title={amount}
      icon={{ source: Icon.BankNote, tintColor: Color.Green }}
      actions={<BalanceActions balance={balance} dashboardUrl={dashboardUrl} />}
      detail={hasSourceTypes ? <BalanceDetail balance={balance} /> : undefined}
    />
  );
};

const Balance = () => {
  const { isLoading, data, error } = useStripeApi(STRIPE_ENDPOINTS.BALANCE);
  const { dashboardUrl } = useStripeDashboard();

  const balanceData = data as Stripe.Balance | null;
  const available = error || !balanceData ? [] : balanceData.available;
  const pending = error || !balanceData ? [] : balanceData.pending;
  const connectReserved = error || !balanceData ? [] : (balanceData.connect_reserved ?? []);

  return (
    <ListContainer isLoading={isLoading} isShowingDetail={!isLoading}>
      <List.Section title="Available">
        {available.map((balance) => (
          <BalanceItem key={`available-${balance.currency}`} balance={balance} dashboardUrl={dashboardUrl} />
        ))}
      </List.Section>
      <List.Section title="Pending">
        {pending.map((balance) => (
          <BalanceItem key={`pending-${balance.currency}`} balance={balance} dashboardUrl={dashboardUrl} />
        ))}
      </List.Section>
      <List.Section title="Connect Reserved">
        {connectReserved.map((balance) => (
          <BalanceItem key={`connect-${balance.currency}`} balance={balance} dashboardUrl={dashboardUrl} />
        ))}
      </List.Section>
    </ListContainer>
  );
};

export default withProfileContext(Balance);
