import { Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useRef, useState } from "react";

import { MessageListItem } from "./components";
import { getAccounts } from "./scripts/accounts";
import { getMessages } from "./scripts/messages";
import { Account, Mailbox } from "./types";
import { invoke } from "./utils";
import { Cache } from "./utils/cache";
import { isImportantMailbox } from "./utils/mailbox";

export default function SeeImportantMail() {
  const [account, setAccount] = useState<Account>();

  const fetchAccounts = useCallback(async () => {
    const accounts = await getAccounts();

    if (!accounts) {
      return [];
    }

    const messages = await Promise.all(
      accounts.map((account) => {
        const mailbox = account.mailboxes.find(isImportantMailbox);
        if (!mailbox) {
          return [];
        }
        return getMessages(account, mailbox, true);
      }),
    );

    return accounts.map((account, index) => {
      account.messages = messages[index] ?? [];
      return account;
    });
  }, []);

  const accountsAbortController = useRef<AbortController>(new AbortController());

  const {
    data: accounts,
    mutate: mutateAccounts,
    isLoading: isLoadingAccounts,
    error,
  } = useCachedPromise(fetchAccounts, [], {
    abortable: accountsAbortController,
    failureToastOptions: { title: "Could not get important messages from accounts" },
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

          return data.map((account) => {
            const messages = Cache.getMessages(account.id, mailbox.name);
            account.messages = messages;
            return account;
          });
        },
      },
    );
  }, []);

  const numMessages =
    accounts
      ?.filter((a) => account === undefined || a.id === account.id)
      .reduce((a, account) => a + (account.messages ? account.messages.length : 0), 0) ?? 0;

  return (
    <List
      isLoading={isLoadingAccounts}
      navigationTitle={`${account?.name || "All Accounts"} - Important Mail`}
      searchBarPlaceholder="Search for important emails"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Choose Account"
          onChange={(value: string) => {
            setAccount(accounts?.find((a) => a.id === value));
          }}
        >
          <List.Dropdown.Item title="All Accounts" value="" />
          <List.Dropdown.Section>
            {accounts?.map((account) => (
              <List.Dropdown.Item
                key={account.id}
                title={account.name}
                value={account.id}
                icon={{ source: Icon.AtSymbol, tintColor: Color.Blue }}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {numMessages &&
        accounts
          ?.filter((a) => account === undefined || a.id === account.id)
          .map((account) => {
            const importantMailbox = account.mailboxes.find(isImportantMailbox);
            return importantMailbox ? (
              <List.Section key={account.id} title={account.name} subtitle={account.emails[0]}>
                {account.messages?.map((message) => (
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
          })}
      {!error && !numMessages && !isLoadingAccounts && (
        <List.EmptyView
          title={"No Important Messages"}
          description={"You don't have any important messages..."}
          icon={{ source: Icon.Envelope, tintColor: Color.Purple }}
        />
      )}
      {error && (
        <List.EmptyView
          title="Could not get recent messages"
          description={error.message}
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
        />
      )}
    </List>
  );
}
