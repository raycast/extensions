import { List } from "@raycast/api";
import type { Account } from "../types/accounts";
import { getAccountDisplayName, getAccountTotalValue } from "../types/accounts";
import { formatCompactCurrency } from "../lib/formatters";

interface AccountDropdownProps {
  accounts: Account[];
  names: Record<string, string>;
  onAccountChange: (value: string) => void;
}

export function AccountDropdown({ accounts, names, onAccountChange }: AccountDropdownProps) {
  return (
    <List.Dropdown tooltip="Filter by Account" storeValue onChange={onAccountChange}>
      <List.Dropdown.Item title="All Accounts" value="all" />
      <List.Dropdown.Section title="Accounts">
        {accounts.map((account) => {
          const name = getAccountDisplayName(account, names);
          const value = formatCompactCurrency(getAccountTotalValue(account));
          return (
            <List.Dropdown.Item
              key={account.securitiesAccount.accountNumber}
              title={`${name} (${value})`}
              value={account.securitiesAccount.accountNumber}
            />
          );
        })}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
