/**
 * SelectAccountForInvestment component.
 *
 * A lightweight account picker used in the Search Investments flow.
 * The user selects an account (or creates a new one) before confirming
 * the asset details and adding a position.
 *
 * Flow usage:
 * 1) Search results → select investment
 * 2) Pick account (this view)
 * 3) Confirm asset details (name, units, price)
 * 4) Add position
 */

import React, { useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Account } from "../utils/types";
import { ACCOUNT_TYPE_LABELS } from "../utils/constants";

// ──────────────────────────────────────────
// Props
// ──────────────────────────────────────────

export interface SelectAccountForInvestmentProps {
  /** Accounts available to add the investment into */
  accounts: Account[];

  /** Callback fired when the user selects an account */
  onSelectAccount: (account: Account) => void;

  /** Callback to create a new account (pushes AccountForm) */
  onAddAccount: () => void;

  /** Optional loading state if parent is fetching accounts */
  isLoading?: boolean;
}

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────

export function SelectAccountForInvestment({
  accounts,
  onSelectAccount,
  onAddAccount,
  isLoading = false,
}: SelectAccountForInvestmentProps): React.JSX.Element {
  const hasAccounts = accounts.length > 0;

  // Controlled search text — initialises to "" so any search term inherited
  // from the previous screen (e.g. "Apple" from the investment search) does
  // not bleed into this list and inadvertently filter out all accounts.
  const [searchText, setSearchText] = useState("");

  return (
    <List
      navigationTitle="Select Account"
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Choose an account to add this investment..."
    >
      {!hasAccounts && !isLoading && (
        <List.Section title="Get Started">
          <List.Item
            title="Create an Account"
            subtitle="Add your first account to track investments"
            icon={Icon.PlusCircle}
            actions={
              <ActionPanel>
                <Action title="Add Account" icon={Icon.PlusCircle} onAction={onAddAccount} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {hasAccounts && (
        <List.Section title="Accounts">
          {accounts.map((account) => {
            const typeLabel = ACCOUNT_TYPE_LABELS[account.type] ?? account.type;

            return (
              <List.Item
                key={account.id}
                title={account.name}
                subtitle={typeLabel}
                icon={Icon.Folder}
                accessories={[
                  {
                    text: `${account.positions.length} position${account.positions.length === 1 ? "" : "s"}`,
                    tooltip: `${account.positions.length} position${account.positions.length === 1 ? "" : "s"} in this account`,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action title="Select Account" icon={Icon.CheckCircle} onAction={() => onSelectAccount(account)} />
                    <Action
                      title="Add Account"
                      icon={Icon.PlusCircle}
                      onAction={onAddAccount}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
