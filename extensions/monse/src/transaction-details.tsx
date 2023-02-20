import { Category, Transaction } from "./utils/types";
import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { format_currency } from "./utils/numbers";
import { preferences } from "./utils/preferences";
import { useState } from "react";
import { EditTransactionCommand } from "./transaction-edit-form";

export function DetailView(props: { transaction: Transaction; refresh: () => void }) {
  const { transaction, refresh } = props;
  const [notes, setNotes] = useState<string>(transaction.notes ?? "");
  const [category, setCategory] = useState<Category>(transaction.category!);

  return (
    <Detail
      markdown={`## ${transaction.concept}
${notes || ""}`}
      navigationTitle="Transaction details"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Bank"
            text={transaction.bank_account.bank.name}
            icon={transaction.bank_account.bank.logo}
          />
          <Detail.Metadata.Label title="Account" text={transaction.bank_account.name} />
          <Detail.Metadata.Label title="Booked at" text={new Date(transaction.booked_at).toLocaleString()} />
          <Detail.Metadata.Label title="Quantity" text={format_currency(transaction.amount, preferences.currency)} />
          <Detail.Metadata.TagList title="Category">
            <Detail.Metadata.TagList.Item
              text={category.name}
              color={transaction.type === "expense" ? "#f43f5e" : "#14b8a6"}
            />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push
            shortcut={{ key: "enter", modifiers: [] }}
            title="Edit"
            icon={Icon.Pencil}
            target={
              <EditTransactionCommand
                transaction={transaction}
                refresh={(t) => {
                  setCategory(() => t.category);
                  setNotes(() => t.notes ?? "");
                  refresh();
                }}
              />
            }
          />

          <Action.OpenInBrowser
            title="Show in Monse"
            url="https://monse.app/transactions"
            shortcut={{ key: "enter", modifiers: ["cmd"] }}
          />
        </ActionPanel>
      }
    />
  );
}
