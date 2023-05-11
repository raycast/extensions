import { useState, useCallback, useRef } from "react";
import { List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { MessageListItem } from "./components/messages";
import { getMailAccounts } from "./scripts/account";
import { getAccountMessages } from "./scripts/messages";
import { Account, Mailbox, Message } from "./types";
import { invoke } from "./utils";
import { isInbox } from "./utils/mailbox";
import * as cache from "./utils/cache";

export default function SeeRecentMail() {
  const [account, setAccount] = useState<Account>();

  const fetchAccounts = useCallback(async () => {
    const accounts = await getMailAccounts();

    if (!accounts) {
      showToast(Toast.Style.Failure, "Could not get recent messages from accounts");
      return [];
    }

    const messages = await Promise.all(
      accounts.map((account: Account) => {
        const mailbox = account.mailboxes.find(isInbox);
        if (mailbox) {
          return getAccountMessages(account, mailbox, 10, true);
        } else {
          return [];
        }
      })
    );

    return accounts.map((account: Account, index: number) => {
      account.messages = messages[index]?.slice(0, 5);
      return account;
    });
  }, []);

  const accountsAbortController = useRef<AbortController>(new AbortController());

  const {
    data: accounts,
    mutate: mutateAccounts,
    isLoading: isLoadingAccounts,
  } = useCachedPromise(fetchAccounts, [], { abortable: accountsAbortController });

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
            account.messages = messages.filter((x) => !x.read);
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
      navigationTitle={`${account?.name || "All Accounts"} - Recent Mail`}
      searchBarPlaceholder="Search for recent emails"
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
            const recentMailbox = account.mailboxes.find(isInbox);
            return recentMailbox ? (
              <List.Section key={account.id} title={account.name} subtitle={account.email}>
                {account.messages?.map((message: Message) => (
                  <MessageListItem
                    key={message.id}
                    mailbox={recentMailbox}
                    account={account}
                    message={message}
                    onAction={(action) => {
                      handleAction(action, recentMailbox);
                    }}
                  />
                ))}
              </List.Section>
            ) : undefined;
          })
      ) : (
        <List.EmptyView title={"No Recent Unread Messages"} description={"You're all caught up..."} />
      )}
    </List>
  );
}
