import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { BankGetAccountTransactions } from "../api/bank";
import { formatCurrency, formatDate } from "../utils/formatting";

export interface AccountDetailProps {
  transactions: BankGetAccountTransactions;
  url?: string;
}

export default (props: AccountDetailProps) => {
  return (
    <List isLoading={!props.url}>
      {props.transactions.Transactions.Transaction.map((transaction) => (
        <List.Item
          title={transaction.Reference}
          icon={
            transaction.TagStatus === "untagged"
              ? {
                  source: Icon.Dot,
                  tintColor: Color.Yellow,
                  tooltip: "This transaction has not yet been tagged.",
                }
              : undefined
          }
          key={transaction.TransactionId}
          subtitle={formatDate(transaction.TransactionDate)}
          accessories={[{ text: formatCurrency(transaction.Amount, props.transactions.MetaData.Currency) }]}
          actions={<ActionPanel>{!!props.url && <Action.OpenInBrowser url={props.url} />}</ActionPanel>}
        />
      ))}
    </List>
  );
};
