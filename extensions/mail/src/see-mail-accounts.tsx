import { List } from "@raycast/api";
import { useState, useEffect } from "react";
import { MailAccount } from "./components/account";
import { getMailAccounts } from "./scripts/account";
import { Account } from "./types/types";

export default function MailAccounts() {
  const [accounts, setAccounts] = useState<Account[] | undefined>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const getAccounts = async () => {
    setAccounts(await getMailAccounts());
    setIsLoading(false);
  };

  useEffect(() => {
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
