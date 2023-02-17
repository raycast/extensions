import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { BankAccount } from "./utils/types";
import { fetchBankAccounts } from "./data-providers/bank-accounts-provider";
import { format_currency } from "./utils/numbers";
import { preferences } from "./utils/preferences";
import React from "react";
import { UpdateBalanceForm } from "./update-balance-form";

export default function Command() {
  const { isLoading, bankAccounts, revalidate } = fetchBankAccounts();

  return (
    <List isLoading={isLoading} throttle>
      {bankAccounts.map((bankAccount: BankAccount) => (
        <List.Item
          key={bankAccount.id}
          icon={{
            source: bankAccount.bank.logo,
            mask: Image.Mask.RoundedRectangle,
          }}
          title={bankAccount.name}
          subtitle={bankAccount.bank.name}
          accessories={[{ text: format_currency(bankAccount.balance, preferences.currency) }]}
          actions={getActions(bankAccount, revalidate)}
        />
      ))}
    </List>
  );
}

function getActions(account: BankAccount, refresh: () => void) {
  return (
    <ActionPanel title="Actions">
      <Action.Push
        shortcut={{ key: "enter", modifiers: [] }}
        title="Update balance"
        icon={Icon.Pencil}
        target={
          <UpdateBalanceForm
            account={account}
            refresh={() => {
              setTimeout(() => refresh(), 1000);
            }}
          />
        }
      />

      <Action.OpenInBrowser
        title="Show in Monse"
        url="https://monse.app/"
        shortcut={{ key: "o", modifiers: ["cmd"] }}
      />
    </ActionPanel>
  );
}
