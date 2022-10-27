import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useState } from "react";
import { preferences } from "./utils/preferences";
import { format_currency } from "./utils/numbers";
import { Transaction } from "./utils/types";
import { fetchTransactions } from "./data-providers/transactions-provider";
import { DetailView } from "./transaction-details";
import { EditTransactionCommand } from "./transaction-edit-form";
import { fetchCategories } from "./data-providers/categories-provider";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { isLoading, transactions, revalidate } = fetchTransactions(searchText);
  fetchCategories();

  return (
    <List isLoading={isLoading} searchText={searchText} onSearchTextChange={setSearchText} throttle>
      {transactions.map((transaction: Transaction) => (
        <List.Item
          key={transaction.id}
          title={transaction.concept.split("\n", 1)[0]}
          subtitle={transaction.notes || ""}
          accessories={[
            { date: new Date(transaction.booked_at) },
            {
              text: format_currency(transaction.amount, preferences.currency),
              icon: {
                source: transaction.type === "expense" ? Icon.ArrowUp : Icon.ArrowDown,
                tintColor: transaction.type === "expense" ? Color.Red : Color.Green,
              },
            },
          ]}
          actions={getActions(transaction, revalidate)}
        />
      ))}
    </List>
  );
}

function getActions(transaction: Transaction, refresh: () => void) {
  return (
    <ActionPanel title="Actions">
      <Action.Push
        shortcut={{ key: "enter", modifiers: [] }}
        title="Show Details"
        icon={Icon.Eye}
        target={<DetailView transaction={transaction} refresh={refresh} />}
      />

      <Action.Push
        shortcut={{ key: "enter", modifiers: ["cmd"] }}
        title="Edit"
        icon={Icon.Pencil}
        target={<EditTransactionCommand transaction={transaction} refresh={refresh} />}
      />

      <Action.OpenInBrowser
        title="Show in Monse"
        url="https://monse.app/transactions"
        shortcut={{ key: "o", modifiers: ["cmd"] }}
      />
    </ActionPanel>
  );
}
