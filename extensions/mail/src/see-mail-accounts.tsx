import { List } from "@raycast/api";
import { useState, useEffect } from "react";
import { MailAccount } from "./components/account";
import { getMailAccounts } from "./scripts/account";
import { Account } from "./types/types";

export default function MailAccounts() {
  const [accounts, setAccounts] = useState<Account[] | null>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const getAccounts = async () => {
      setAccounts(await getMailAccounts());
      setIsLoading(false);
    };
    getAccounts();
    return () => {
      setAccounts([]);
    };
  }, []);

  return (
    <List isLoading={isLoading}>
      {accounts?.map((account: Account, index: number) => (
        <MailAccount key={index} {...account} />
      ))}
    </List>
  );
}
