import { List } from "@raycast/api";
import { useState, useEffect } from "react";
import { MailAccount } from "./components/account";
import { getMailAccounts } from "./scripts/account";
import { Account } from "./types/types";

export default function MailAccounts() {
  const [accounts, setAccounts] = useState<Account[]>();

  useEffect(() => {
    (async () => {
      setAccounts(await getMailAccounts());
    })();
    return () => {
      setAccounts(undefined);
    };
  }, []);

  return (
    <List isLoading={accounts === undefined}>
      {accounts && accounts.length > 0 ? (
        accounts?.map((account: Account) => <MailAccount key={account.id} {...account} />)
      ) : (
        <List.EmptyView
          title={"No Mail Accounts Found"}
          description={"Check again to make sure you are signed in..."}
        />
      )}
    </List>
  );
}
