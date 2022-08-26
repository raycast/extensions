import { List } from "@raycast/api";
import { useState, useEffect } from "react";
import { MessageListItem } from "./components/messages";
import { getMailAccounts } from "./scripts/account";
import { getAccountMessages } from "./scripts/messages";
import { Account, Message } from "./types/types";

export default function SeeImportantMail() {
  const [accounts, setAccounts] = useState<Account[] | undefined>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const getAccounts = async () => {
    let accounts = await getMailAccounts();
    if (accounts) {
      const promises = accounts.map((account: Account) => {
        return getAccountMessages(account, "important", "Important", 5);
      });
      const messages = await Promise.all(promises);
      accounts = accounts.map((account: Account, index: number) => {
        account.messages = messages[index];
        return account;
      });
      setAccounts(accounts);
    }
    setIsLoading(false);
  };

  const setMessage = (account: Account, message: Message) => {
    setAccounts(
      accounts?.map((a: Account) =>
        a.id === account.id
          ? { ...a, messages: account.messages?.map((m: Message) => (m.id === message.id ? message : m)) }
          : a
      )
    );
  };
  const deleteMessage = (account: Account, message: Message) => {
    setAccounts(
      accounts?.map((a: Account) =>
        a.id === account.id ? { ...a, messages: account.messages?.filter((m: Message) => m.id !== message.id) } : a
      )
    );
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
        <List.Section key={index} title={account.name} subtitle={account.email}>
          {account.messages?.map((message: Message, index: number) => (
            <MessageListItem
              key={index}
              id="important"
              account={account}
              message={message}
              setMessage={setMessage}
              deleteMessage={deleteMessage}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
