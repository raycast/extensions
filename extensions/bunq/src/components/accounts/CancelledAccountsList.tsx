/**
 * Cancelled accounts list component.
 */

import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import type { useBunqSession } from "../../hooks/useBunqSession";
import type { MonetaryAccount } from "../../api/endpoints";
import { formatCurrency } from "../../lib/formatters";
import { getBalanceColor } from "../../lib/status-helpers";
import { copyToClipboard } from "../../lib/actions";
import { TransactionList } from "./TransactionList";

interface CancelledAccountsListProps {
  accounts: MonetaryAccount[];
  session: ReturnType<typeof useBunqSession>;
}

export function CancelledAccountsList({ accounts, session }: CancelledAccountsListProps) {
  const { push } = useNavigation();

  return (
    <List navigationTitle="Cancelled Accounts">
      {accounts.map((account) => {
        const balance = formatCurrency(account.balance.value, account.balance.currency);
        const iban = account.alias.find((a) => a.type === "IBAN")?.value || "";

        return (
          <List.Item
            key={account.id}
            title={account.description}
            accessories={[
              { text: { value: balance, color: getBalanceColor(account.balance.value) }, tooltip: "Balance" },
            ]}
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="View All Transactions"
                    icon={Icon.List}
                    onAction={() => push(<TransactionList account={account} session={session} />)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Copy IBAN"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                    onAction={() => copyToClipboard(iban, "IBAN")}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
