import { useState } from "react";
import { List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { MessageListItem } from "./components/messages";
import { getMailAccounts } from "./scripts/account";
import { getAccountMessages } from "./scripts/messages";
import { Account, Message } from "./types";
import { isImportantMailbox } from "./utils/mailbox";
import * as cache from "./utils/cache";

export default function SeeImportantMail() {
  const [account, setAccount] = useState<Account>();

  const {
    data: accounts,
    isLoading: isLoadingAccounts,
    revalidate: revalidateAccounts,
  } = useCachedPromise(async () => {
    const accounts = await getMailAccounts();

    if (!accounts) {
      showToast(Toast.Style.Failure, "Could not get important messages from accounts");
      return [];
    }

    const messages = await Promise.all(
      accounts.map((account: Account) => {
        const mailbox = account.mailboxes.find(isImportantMailbox);
        if (mailbox) {
          return getAccountMessages(account, mailbox, mailbox.name, 10);
        } else {
          return [];
        }
      })
    );

    return accounts.map((account: Account, index: number) => {
      account.messages = messages[index];
      return account;
    });
  });

  const numMessages = accounts
    ?.filter((a: Account) => account === undefined || a.id === account.id)
    .reduce((a: number, account: Account) => a + (account.messages ? account.messages.length : 0), 0);

  return (
    <List
      isLoading={isLoadingAccounts}
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
            const importantMailbox = account.mailboxes.find(isImportantMailbox);
            return importantMailbox ? (
              <List.Section key={account.id} title={account.name} subtitle={account.email}>
                {account.messages?.map((message: Message) => (
                  <MessageListItem
                    key={message.id}
                    mailbox={importantMailbox}
                    account={account}
                    message={message}
                    setMessage={(account, message) => {
                      // TODO: We should update all mailboxes for the given account
                      const cachedMessages = cache.getMessages(account.id, importantMailbox.name);
                      const nextCachedMessages = cachedMessages.map((m) => {
                        if (m.id === message.id) {
                          m = { ...m, ...message };
                        }
                        return m;
                      });
                      cache.setMessages(nextCachedMessages, account.id, importantMailbox.name);
                      revalidateAccounts();
                    }}
                    deleteMessage={(account, message) => {
                      // TODO: We should update all mailboxes for the given account
                      const cachedMessages = cache.getMessages(account.id, importantMailbox.name);
                      const nextCachedMessages = cachedMessages.filter((m) => m.id !== message.id);
                      cache.setMessages(nextCachedMessages, account.id, importantMailbox.name);
                      revalidateAccounts();
                    }}
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
