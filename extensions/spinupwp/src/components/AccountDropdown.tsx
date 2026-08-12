import { List, Icon } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useEffect } from "react";
import { getAccounts, setActiveAccountId } from "../accounts";
import { Account } from "../types";

interface Props {
  onAccountChange?: () => void;
}

export default function AccountDropdown({ onAccountChange }: Props) {
  const [selectedAccountId, setSelectedAccountId] = useCachedState<string>("spinupwp_selected_account");

  const { data: accounts, isLoading } = useCachedPromise(getAccounts);

  // Set default account if none selected or if selected account is invalid
  useEffect(() => {
    if (!accounts || accounts.length === 0) return;

    const isSelectedAccountInvalid = selectedAccountId && !accounts.some((account) => account.id === selectedAccountId);

    if (!selectedAccountId || isSelectedAccountInvalid) {
      setSelectedAccountId(accounts[0]?.id);
    }
  }, [accounts, selectedAccountId, setSelectedAccountId]);

  // When account changes, update LocalStorage and trigger callback
  useEffect(() => {
    if (!selectedAccountId) return;

    const updateAccount = async () => {
      await setActiveAccountId(selectedAccountId);
      onAccountChange?.();
    };

    updateAccount();
  }, [selectedAccountId, onAccountChange]);

  // Don't show dropdown if no accounts or only one account
  if (!accounts || accounts.length < 2) {
    return null;
  }

  return (
    <List.Dropdown
      tooltip="Select Account"
      value={selectedAccountId}
      onChange={setSelectedAccountId}
      isLoading={isLoading}
    >
      {accounts.map((account: Account) => (
        <List.Dropdown.Item key={account.id} title={account.name} value={account.id} icon={Icon.Person} />
      ))}
    </List.Dropdown>
  );
}
