import { List } from "@raycast/api";
import { useState, useEffect } from "react";
import { AccountsItem } from "../lib/types/users-types.types";
import { getAccounts } from "../lib/utils";

export default function AccountPicker({ onPick }: { onPick: (account: AccountsItem) => void }) {
  const [accounts, setAccounts] = useState<AccountsItem[]>([]);

  function onPickAccount(accId: string) {
    const acc = accounts.find((acc) => acc.id === accId) as AccountsItem;
    onPick(acc);
  }

  useEffect(() => {
    async function init() {
      const userAccounts = await getAccounts();
      console.log({ userAccounts });
      setAccounts(userAccounts);
      onPick(userAccounts[0]);
    }
    init();
  }, []);
  return (
    <List.Dropdown tooltip="Account" storeValue onChange={onPickAccount}>
      <List.Dropdown.Section title="Account">
        {accounts.map((acc) => (
          <List.Dropdown.Item key={acc.id} title={acc.name} value={acc.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
