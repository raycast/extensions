import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { useState } from "react";
import { preferences } from "./utils/preferences";
import { format_currency } from "./utils/numbers";
import { Category, Transaction } from "./utils/types";
import { fetchTransactions } from "./data-providers/transactions-provider";
import { EditTransactionCommand } from "./transaction-edit-form";
import { fetchCategories } from "./data-providers/categories-provider";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { isLoading, transactions, revalidate } = fetchTransactions(searchText);
  const { categories } = fetchCategories();

  return (
    <List isShowingDetail isLoading={isLoading} searchText={searchText} onSearchTextChange={setSearchText} throttle>
      {transactions.map((transaction: Transaction) => (
        <List.Item
          key={transaction.id}
          title={transaction.concept.split("\n", 1)[0].substring(0, 30)}
          detail={
            <List.Item.Detail
              markdown={`## ${transaction.concept}\n` + `${transaction.notes || ""}\n`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Amount"
                    text={format_currency(transaction.amount, preferences.currency)}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Booked at"
                    text={new Date(transaction.booked_at).toLocaleString()}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Category"
                    icon={{
                      source: transaction.type === "expense" ? Icon.ArrowUp : Icon.ArrowDown,
                      tintColor: transaction.type === "expense" ? Color.Red : Color.Green,
                    }}
                    text={transaction.category.name}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Bank"
                    text={transaction.bank_account.bank.name}
                    icon={{
                      source: transaction.bank_account.bank.logo,
                      mask: Image.Mask.RoundedRectangle,
                    }}
                  />
                  <List.Item.Detail.Metadata.Label title="Account" text={transaction.bank_account.name} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          accessories={[{ date: new Date(transaction.booked_at) }]}
          actions={getActions(transaction, categories, revalidate)}
        />
      ))}
    </List>
  );
}

function getActions(transaction: Transaction, categories: Category[], refresh: () => void) {
  return (
    <ActionPanel title="Actions">
      <Action.Push
        shortcut={{ key: "enter", modifiers: ["cmd"] }}
        title="Edit"
        icon={Icon.Pencil}
        target={<EditTransactionCommand transaction={transaction} categories={categories} refresh={refresh} />}
      />

      <Action.OpenInBrowser
        title="Show in Monse"
        url="https://monse.app/transactions"
        shortcut={{ key: "o", modifiers: ["cmd"] }}
      />
    </ActionPanel>
  );
}
