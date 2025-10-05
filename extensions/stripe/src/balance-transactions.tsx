import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type Stripe from "stripe";
import { 
  convertTimestampToDate, 
  titleCase, 
  formatAmountWithSign, 
  getTransactionIcon, 
  getSourceId 
} from "./utils";
import { useStripeApi, useStripeDashboard } from "./hooks";
import { STRIPE_ENDPOINTS } from "./enums";
import { ListContainer, withEnvContext } from "./components";

const TransactionActions = ({ id, source, dashboardUrl }: { id: string; source: string; dashboardUrl: string }) => (
  <ActionPanel>
    <Action.OpenInBrowser 
      title="View in Stripe Dashboard" 
      url={`${dashboardUrl}/balance/transactions/${id}`} 
      icon={Icon.Globe}
    />
    <Action.CopyToClipboard 
      title="Copy Transaction ID" 
      content={id} 
      shortcut={{ modifiers: ["cmd"], key: "c" }}
    />
    {source && (
      <Action.CopyToClipboard 
        title="Copy Source ID" 
        content={source} 
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
    )}
  </ActionPanel>
);

const TransactionDetail = ({ transaction, icon, color }: { 
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
            icon={{ source: icon, tintColor: color as Color.ColorLike }}
          />
          <List.Item.Detail.Metadata.Label title="Status" text={titleCase(transaction.status)} />
          {transaction.description && <List.Item.Detail.Metadata.Label title="Description" text={transaction.description} />}
          
          <List.Item.Detail.Metadata.Separator />
          
          <List.Item.Detail.Metadata.Label title="Financial Details" />
          <List.Item.Detail.Metadata.Label title="Amount" text={formatAmountWithSign(transaction.amount, transaction.currency)} />
          <List.Item.Detail.Metadata.Label title="Fee" text={formatAmountWithSign(transaction.fee, transaction.currency)} />
          <List.Item.Detail.Metadata.Label title="Net" text={formatAmountWithSign(transaction.net, transaction.currency)} />
          
          <List.Item.Detail.Metadata.Separator />
          
          <List.Item.Detail.Metadata.Label title="Timing" />
          <List.Item.Detail.Metadata.Label title="Created" text={convertTimestampToDate(transaction.created)} />
          <List.Item.Detail.Metadata.Label title="Available On" text={convertTimestampToDate(transaction.available_on)} />
          
          <List.Item.Detail.Metadata.Separator />
          
          <List.Item.Detail.Metadata.Label title="Identifiers" />
          <List.Item.Detail.Metadata.Label title="Transaction ID" text={transaction.id} />
          {sourceId && <List.Item.Detail.Metadata.Label title="Source ID" text={sourceId} />}
        </List.Item.Detail.Metadata>
      }
    />
  );
};

const TransactionItem = ({ transaction, dashboardUrl }: { 
  transaction: Stripe.BalanceTransaction; 
  dashboardUrl: string; 
}) => {
  const { icon, color } = getTransactionIcon(transaction.type);
  const title = transaction.description ? titleCase(transaction.description) : titleCase(transaction.type);
  const subtitle = transaction.amount !== 0 ? formatAmountWithSign(transaction.amount, transaction.currency) : undefined;
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

const BalanceTransactions = () => {
  const { isLoading, data } = useStripeApi(STRIPE_ENDPOINTS.BALANCE_TRANSACTIONS, true);
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

export default withEnvContext(BalanceTransactions);
