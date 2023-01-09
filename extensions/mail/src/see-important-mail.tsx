import { List, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { MessageListItem } from "./components/messages";
import { getMailAccounts } from "./scripts/account";
import { getAccountMessages } from "./scripts/messages";
import { Account, Message } from "./types/types";
import { isImportantMailbox } from "./utils/mailbox";

export default function SeeImportantMail() {
  const [account, setAccount] = useState<Account>();
  const [accounts, setAccounts] = useState<Account[] | undefined>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
    (async () => {
      const accounts = await getMailAccounts();
      if (accounts) {
        const messages = await Promise.all(
          accounts.map((account: Account) => {
            const mailbox = account.mailboxes.find((m) => isImportantMailbox(m));
            if (mailbox) {
              return getAccountMessages(account, mailbox, mailbox.name, 25);
            } else {
              return [];
            }
          })
        );
        setAccounts(
          accounts.map((account: Account, index: number) => {
            account.messages = messages[index];
            return account;
          })
        );
      } else {
        showToast(Toast.Style.Failure, "Could not get important messages from accounts");
      }
      setIsLoading(false);
    })();
    return () => {
      setAccounts([]);
    };
  }, []);

  const numMessages = accounts
    ?.filter((a: Account) => account === undefined || a.id === account.id)
    .reduce((a: number, account: Account) => a + (account.messages ? account.messages.length : 0), 0);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${account?.name || "All Accounts"} - Important Mail`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Choose Account"
          onChange={(value: string) => {
            setAccount(accounts?.find((a) => a.id === value));
          }}
        >
          <List.Dropdown.Item title="All Accounts" value="" />
          <List.Dropdown.Section>
            {accounts?.map((account: Account) => (
              <List.Dropdown.Item key={account.id} title={account.name} value={account.id} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {numMessages && numMessages > 0 ? (
        accounts
          ?.filter((a: Account) => account === undefined || a.id === account.id)
          .map((account: Account) => {
            const importantMailbox = account.mailboxes.find((m) => isImportantMailbox(m));
            return importantMailbox ? (
              <List.Section key={account.id} title={account.name} subtitle={account.email}>
                {account.messages?.map((message: Message) => (
                  <MessageListItem
                    key={message.id}
                    mailbox={importantMailbox}
                    account={account}
                    message={message}
                    setMessage={setMessage}
                    deleteMessage={deleteMessage}
                  />
                ))}
              </List.Section>
            ) : undefined;
          })
      ) : (
        <List.EmptyView title={"No Important Messages"} description={"You don't have any important messages..."} />
      )}
    </List>
  );
}
