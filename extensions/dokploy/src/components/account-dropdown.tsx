import { Icon, List } from "@raycast/api";
import { DokployAccount } from "../accounts/types";

interface AccountDropdownProps {
  accounts: DokployAccount[];
  activeAccountId?: string;
  onChange: (accountId: string) => void;
}

/**
 * Search-bar dropdown for switching the instance a command is pointed at.
 * Hidden when there is only one account - there is nothing to switch between.
 */
export function AccountDropdown({ accounts, activeAccountId, onChange }: AccountDropdownProps) {
  if (accounts.length < 2) return null;

  return (
    <List.Dropdown tooltip="Dokploy Account" value={activeAccountId} onChange={onChange} storeValue={false}>
      {accounts.map((account) => (
        <List.Dropdown.Item
          key={account.id}
          title={account.label}
          value={account.id}
          icon={Icon.Building}
          keywords={[account.url]}
        />
      ))}
    </List.Dropdown>
  );
}
