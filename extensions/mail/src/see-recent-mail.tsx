import { List } from "@raycast/api";
import { useState, useEffect } from "react";
import { MessageListItem } from "./components/messages";
import { getMailAccounts } from "./scripts/account";
import { getAccountMessages } from "./scripts/messages";
import { Account, Message } from "./types/types";

export default function SeeRecentMail() {
  const [accounts, setAccounts] = useState<Account[] | undefined>([]);
  const [numUnread, setNumUnread] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const getAccounts = async () => {
      let accounts = await getMailAccounts();
      if (accounts) {
        const promises = accounts.map((account: Account) => {
          return getAccountMessages(account, "recent", "All Mail", 25, true);
        });
        const messages = await Promise.all(promises);
        accounts = accounts.map((account: Account, index: number) => {
          account.messages = messages[index];
          return account;
        });
        setNumUnread(
          accounts.reduce((a: number, account: Account) => a + (account.messages ? account.messages.length : 0), 0)
        );
        setAccounts(accounts);
      }
      setIsLoading(false);
    };
    getAccounts();
    return () => {
      setAccounts([]);
    };
  }, []);

  return (
    <List isLoading={isLoading}>
      {numUnread && numUnread > 0 ? (
        accounts?.map((account: Account, index: number) => (
          <List.Section key={index} title={account.name} subtitle={account.email}>
            {account.messages?.map((message: Message, index: number) => (
              <MessageListItem key={index} account={account} message={message} />
            ))}
          </List.Section>
        ))
      ) : (
        <List.EmptyView
          title="No Recent Unread Messages"
          description="You're all caught up..."
          icon={"../assets/caught-up.svg"}
        />
      )}
    </List>
  );
}
