import { List } from "@raycast/api";
import { useEffect } from "react";
import { AccountsItem } from "../lib/types/users-types.types";
import useAuth from "../hooks/useAuth";

export default function AccountPicker({ onPick }: { onPick: (account: AccountsItem) => void }) {
  const { accounts } = useAuth();

  function onPickAccount(accId: string) {
    if (!accounts) return;

    const acc = accounts.find((acc) => acc.id === accId);
    if (!acc) return;
    onPick(acc);
  }

  useEffect(() => {
    if (accounts && accounts?.length > 0) {
      onPick(accounts[0]);
    }
  }, [accounts]);
  return (
    <List.Dropdown tooltip="Account" storeValue onChange={onPickAccount}>
      <List.Dropdown.Section title="Account">
        {accounts && (
          <>
            {accounts.map((acc) => (
              <List.Dropdown.Item key={acc.id} title={acc.name} value={acc.id} />
            ))}
          </>
        )}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
