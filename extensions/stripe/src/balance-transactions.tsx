import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type Stripe from "stripe";
import { convertTimestampToDate, titleCase, formatAmountWithSign, getTransactionIcon, getSourceId } from "@src/utils";
import { useStripeApi, useStripeDashboard } from "@src/hooks";
import { STRIPE_ENDPOINTS } from "@src/enums";
import { ListContainer, withProfileContext } from "@src/components";
import { SHORTCUTS } from "@src/constants/keyboard-shortcuts";

/**
 * Action panel for balance transaction items.
 * Provides navigation to Stripe Dashboard and copy actions for transaction and source IDs.
 */
const TransactionActions = ({ id, source, dashboardUrl }: { id: string; source: string; dashboardUrl: string }) => (
  <ActionPanel>
    <Action.OpenInBrowser
      title="View in Stripe Dashboard"
      url={`${dashboardUrl}/balance/transactions/${id}`}
      icon={Icon.Globe}
    />
    <Action.CopyToClipboard title="Copy Transaction ID" content={id} shortcut={SHORTCUTS.COPY_PRIMARY} />
    {source && <Action.CopyToClipboard title="Copy Source ID" content={source} shortcut={SHORTCUTS.COPY_SECONDARY} />}
  </ActionPanel>
);

/**
 * Detailed view of a balance transaction.
 * Shows transaction type, status, description, financial details (amount, fee, net),
 * timing (created, available on), and identifiers (transaction ID, source ID).
 */
const TransactionDetail = ({
  transaction,
  icon,
  color,
}: {
  transaction: Stripe.BalanceTransaction;
  icon: Icon;
  color: Color;
}) => {
  const sourceId = getSourceId(transaction.source);

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Type"
            text={titleCase(transaction.type)}
            icon={{ source: icon, tintColor: color }}
          />
          <List.Item.Detail.Metadata.Label title="Status" text={titleCase(transaction.status)} />
          {transaction.description && (
            <List.Item.Detail.Metadata.Label title="Description" text={transaction.description} />
          )}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Financial Details" />
          <List.Item.Detail.Metadata.Label
            title="Amount"
            text={formatAmountWithSign(transaction.amount, transaction.currency)}
          />
          <List.Item.Detail.Metadata.Label
            title="Fee"
            text={formatAmountWithSign(transaction.fee, transaction.currency)}
          />
          <List.Item.Detail.Metadata.Label
            title="Net"
            text={formatAmountWithSign(transaction.net, transaction.currency)}
          />

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Timing" />
          <List.Item.Detail.Metadata.Label title="Created" text={convertTimestampToDate(transaction.created)} />
          <List.Item.Detail.Metadata.Label
            title="Available On"
            text={convertTimestampToDate(transaction.available_on)}
          />

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Identifiers" />
          <List.Item.Detail.Metadata.Label title="Transaction ID" text={transaction.id} />
          {sourceId && <List.Item.Detail.Metadata.Label title="Source ID" text={sourceId} />}
        </List.Item.Detail.Metadata>
      }
    />
  );
};

/**
 * List item for a single balance transaction.
 * Displays transaction description/type, amount with sign, and icon indicating transaction type.
 */
const TransactionItem = ({
  transaction,
  dashboardUrl,
}: {
  transaction: Stripe.BalanceTransaction;
  dashboardUrl: string;
}) => {
  const { icon, color } = getTransactionIcon(transaction.type);
  const title = transaction.description ? titleCase(transaction.description) : titleCase(transaction.type);
  const subtitle =
    transaction.amount !== 0 ? formatAmountWithSign(transaction.amount, transaction.currency) : undefined;
  const sourceId = getSourceId(transaction.source);

  return (
    <List.Item
      key={transaction.id}
      title={title}
      subtitle={subtitle}
      icon={{ source: icon, tintColor: color as Color.ColorLike }}
      actions={<TransactionActions id={transaction.id} source={sourceId} dashboardUrl={dashboardUrl} />}
      detail={<TransactionDetail transaction={transaction} icon={icon} color={color} />}
    />
  );
};

/**
 * Balance Transactions View - Displays recent Stripe balance transactions.
 *
 * Shows all balance transactions with detailed information:
 * - Transaction type (charge, refund, adjustment, payout, etc.)
 * - Amount, fee, and net values with +/- indicators
 * - Status and availability dates
 * - Source IDs for tracking related objects
 *
 * Useful for understanding account balance changes and reconciliation.
 */
const BalanceTransactions = () => {
  const { isLoading, data } = useStripeApi(STRIPE_ENDPOINTS.BALANCE_TRANSACTIONS, { isList: true });
  const { dashboardUrl } = useStripeDashboard();
  const transactions = data as Stripe.BalanceTransaction[];

  return (
    <ListContainer isLoading={isLoading} isShowingDetail={!isLoading}>
      <List.Section title="Transactions">
        {transactions.map((transaction) => (
          <TransactionItem key={transaction.id} transaction={transaction} dashboardUrl={dashboardUrl} />
        ))}
      </List.Section>
    </ListContainer>
  );
};

export default withProfileContext(BalanceTransactions);
