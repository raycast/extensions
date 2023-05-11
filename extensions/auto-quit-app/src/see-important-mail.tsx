import { useState, useCallback, useRef } from "react";
import { List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { MessageListItem } from "./components/messages";
import { getMailAccounts } from "./scripts/account";
import { getAccountMessages } from "./scripts/messages";
import { Account, Mailbox, Message } from "./types";
import { invoke } from "./utils";
import { isImportantMailbox } from "./utils/mailbox";
import * as cache from "./utils/cache";

export default function SeeImportantMail() {
  const [account, setAccount] = useState<Account>();

  const fetchAccounts = useCallback(async () => {
    const accounts = await getMailAccounts();

    if (!accounts) {
      showToast(Toast.Style.Failure, "Could not get important messages from accounts");
      return [];
    }

    const messages = await Promise.all(
      accounts.map((account: Account) => {
        const mailbox = account.mailboxes.find(isImportantMailbox);
        if (mailbox) {
          return getAccountMessages(account, mailbox);
        } else {
          return [];
        }
      })
    );

    return accounts.map((account: Account, index: number) => {
      account.messages = messages[index];
      return account;
    });
  }, []);

  const accountsAbortController = useRef<AbortController>(new AbortController());

  const {
    data: accounts,
    mutate: mutateAccounts,
    isLoading: isLoadingAccounts,
  } = useCachedPromise(fetchAccounts, [], {
    abortable: accountsAbortController,
  });

  const handleAction = useCallback((action: () => Promise<void>, mailbox: Mailbox) => {
    mutateAccounts(
      invoke(async () => {
        accountsAbortController.current.abort();

        await action();
        const accounts = await fetchAccounts();

        return accounts;
      }),
      {
        optimisticUpdate: (data) => {
          if (!data) return data;

          return data.map((account: Account) => {
            const messages = cache.getMessages(account.id, mailbox.name);
            account.messages = messages;
            return account;
          });
        },
      }
    );
  }, []);

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
                    onAction={(action) => {
                      handleAction(action, importantMailbox);
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
