import { List } from "@raycast/api";
import { useState, useEffect } from "react";
import { MessageListItem } from "./components/messages";
import { getMailAccounts } from "./scripts/account";
import { getAccountMessages } from "./scripts/messages";
import { Account, Message } from "./types/types";

export default function SeeImportantMail() {
  const [accounts, setAccounts] = useState<Account[] | undefined>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const getAccounts = async () => {
      let accounts = await getMailAccounts(); 
      if (accounts) {
        const promises = accounts.map((account: Account) => {
          return getAccountMessages(account.id, "important", "Important", 5);
        })
        const messages = await Promise.all(promises);
        accounts = accounts.map((account: Account, index: number) => {
          account.messages = messages[index];
          return account;
        })
        setAccounts(accounts);
      }
      setIsLoading(false);
    };
    getAccounts();
    return () => {
      setAccounts([]);
    };
  }, []);

  return <List isLoading={isLoading}>
    {accounts?.map((account: Account, index: number) => (
      <List.Section key={index} title={account.name} subtitle={account.email}>
        {account.messages?.map((message: Message, index: number) => (
          <MessageListItem key={index} {...message} />
        ))}
      </List.Section>
    ))}
  </List>;
}
