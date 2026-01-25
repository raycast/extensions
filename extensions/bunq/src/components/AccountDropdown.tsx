/**
 * Account dropdown components for List and Form views
 */

import { Form, List } from "@raycast/api";
import type { MonetaryAccount } from "../api/endpoints";
import { formatCurrency } from "../lib/formatters";

interface AccountListDropdownProps {
  /** Currently selected account ID */
  value: string | undefined;
  /** Callback when selection changes */
  onChange: (value: string) => void;
  /** List of accounts to display */
  accounts: MonetaryAccount[] | undefined;
}

/**
 * Account dropdown for List views (searchBarAccessory)
 */
export function AccountListDropdown({ value, onChange, accounts }: AccountListDropdownProps) {
  return (
    <List.Dropdown tooltip="Select Account" value={value ?? ""} onChange={onChange}>
      <List.Dropdown.Section title="Accounts">
        {accounts?.map((account) => (
          <List.Dropdown.Item key={account.id} title={account.description} value={account.id.toString()} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

interface AccountFormDropdownProps {
  /** Dropdown ID for form submission */
  id: string;
  /** Label displayed above the dropdown */
  title: string;
  /** Currently selected account ID */
  value: string;
  /** Callback when selection changes */
  onChange: (value: string) => void;
  /** List of accounts to display */
  accounts: MonetaryAccount[] | undefined;
  /** Whether to show balance in the title. Default: true */
  showBalance?: boolean;
}

/**
 * Account dropdown for Form views
 */
export function AccountFormDropdown({
  id,
  title,
  value,
  onChange,
  accounts,
  showBalance = true,
}: AccountFormDropdownProps) {
  return (
    <Form.Dropdown id={id} title={title} value={value} onChange={onChange}>
      {accounts?.map((account) => (
        <Form.Dropdown.Item
          key={account.id}
          value={account.id.toString()}
          title={
            showBalance
              ? `${account.description} (${formatCurrency(account.balance.value, account.balance.currency)})`
              : account.description
          }
        />
      ))}
    </Form.Dropdown>
  );
}
