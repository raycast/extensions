import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import capitalize from "lodash/capitalize";
import type Stripe from "stripe";
import { useStripeApi, useStripeDashboard } from "@src/hooks";
import { formatAmount } from "@src/utils";
import { STRIPE_ENDPOINTS } from "@src/enums";
import { ListContainer, withProfileContext } from "@src/components";
import { SHORTCUTS } from "@src/constants/keyboard-shortcuts";

/**
 * Action panel for balance items.
 * Provides actions to view balance details in Stripe Dashboard and copy values.
 */
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
      <Action.CopyToClipboard title="Copy Amount" content={formattedAmount} shortcut={SHORTCUTS.COPY_PRIMARY} />
      <Action.CopyToClipboard
        title="Copy Currency"
        content={balance.currency.toUpperCase()}
        shortcut={SHORTCUTS.COPY_SECONDARY}
      />
    </ActionPanel>
  );
};

/**
 * Detail view showing breakdown of balance by source types (card, bank transfer, etc).
 * Only shown when balance has source_types data.
 */
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

/**
 * List item displaying a single currency balance.
 * Shows amount and optional breakdown by source type.
 */
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

/**
 * Balance View - Displays Stripe account balance across currencies.
 *
 * Shows three categories of balance:
 * - Available: Funds available for payout
 * - Pending: Funds not yet available (still processing)
 * - Connect Reserved: Funds held in reserve for Stripe Connect accounts
 *
 * Each balance can be expanded to show breakdown by source type (card, bank, etc).
 */
const Balance = () => {
  const { isLoading, data } = useStripeApi(STRIPE_ENDPOINTS.BALANCE);
  const { dashboardUrl } = useStripeDashboard();

  const balanceData = (data as Stripe.Balance) || null;
  const available = balanceData?.available ?? [];
  const pending = balanceData?.pending ?? [];
  const connectReserved = balanceData?.connect_reserved ?? [];

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
