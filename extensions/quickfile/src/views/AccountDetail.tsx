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
      <List.EmptyView icon={{ source: "icon-64px.png" }} title="No Transactions to Display" />
      {props.transactions.Transactions.Transaction.map((transaction) => {
        const isTagged = transaction.TagStatus === "tagged";
        return (
          <List.Item
            title={transaction.Reference}
            icon={{
              source: isTagged ? Icon.Checkmark : Icon.Circle,
              tintColor: isTagged ? Color.Green : Color.Red,
              tooltip: `This transaction has ${isTagged ? "" : "not yet "}been tagged.`,
            }}
            key={transaction.TransactionId}
            subtitle={formatDate(transaction.TransactionDate)}
            accessories={[{ text: formatCurrency(transaction.Amount, props.transactions.MetaData.Currency) }]}
            actions={<ActionPanel>{!!props.url && <Action.OpenInBrowser url={props.url} />}</ActionPanel>}
          />
        );
      })}
    </List>
  );
};
