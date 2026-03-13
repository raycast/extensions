import { Color, Icon, List, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useEffect, useRef, useState } from "react";

import { MessageListItem } from "./components";
import { getAccounts } from "./scripts/accounts";
import { getMessages } from "./scripts/messages";
import { Account, Mailbox } from "./types";
import { invoke } from "./utils";
import { Cache } from "./utils/cache";
import { isInbox } from "./utils/mailbox";

export default function SeeRecentMail() {
  const [account, setAccount] = useState<Account>();

  const fetchAccounts = useCallback(async () => {
    const accounts = await getAccounts();

    if (!accounts) {
      return [];
    }

    const unreadOnly = getPreferenceValues().unreadonly;
    const accountsWithMessages: Account[] = [];

    for (const account of accounts) {
      if (account.enabled === false) continue;

      const mailbox = account.mailboxes.find(isInbox);

      if (!mailbox) {
        accountsWithMessages.push({ ...account, messages: [] });
        continue;
      }

      const messages = await getMessages(account, mailbox, unreadOnly, undefined, "summary");
      accountsWithMessages.push({ ...account, messages: messages ?? [] });
    }

    return accountsWithMessages;
  }, []);

  const accountsAbortController = useRef<AbortController>(new AbortController());

  const {
    data: accounts,
    mutate: mutateAccounts,
    isLoading: isLoadingAccounts,
    error,
  } = useCachedPromise(fetchAccounts, [], {
    abortable: accountsAbortController,
    failureToastOptions: { title: "Could not get recent messages from accounts" },
  });

  useEffect(() => {
    if (!accounts || accounts.length === 0) return;

    let isMounted = true;
    const hydratePreviews = async () => {
      let hasUpdates = false;
      const unreadOnly = getPreferenceValues().unreadonly;
      const updatedAccounts = [...accounts];

      for (let i = 0; i < updatedAccounts.length; i++) {
        const account = updatedAccounts[i];
        const mailbox = account.mailboxes.find(isInbox);
        if (!mailbox) continue;

        const needsPreview = account.messages?.some(
          (m) => m.hydrationStage === "summary" || (!m.senderName && !m.senderAddress),
        );
        if (needsPreview) {
          const previewMessages = await getMessages(account, mailbox, unreadOnly, undefined, "preview");
          if (previewMessages) {
            updatedAccounts[i] = { ...account, messages: previewMessages };
            hasUpdates = true;
          }
        }
      }

      if (isMounted && hasUpdates) {
        mutateAccounts(Promise.resolve(updatedAccounts), { shouldRevalidateAfter: false });
      }
    };

    hydratePreviews();

    return () => {
      isMounted = false;
    };
  }, [accounts, mutateAccounts]);

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
            const messages = Cache.getMessagesSummary(account.id, mailbox.name);
            account.messages = messages.filter((x) => !x.read);
            return account;
          });
        },
      },
    );
  }, []);

  const handleRefresh = useCallback(() => {
    mutateAccounts();
  }, [mutateAccounts]);

  const numMessages =
    accounts
      ?.filter((a) => account === undefined || a.id === account.id)
      .reduce((a, account) => a + (account.messages ? account.messages.length : 0), 0) ?? 0;

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
            {accounts?.filter((a) => a.enabled !== false).map((account) => (
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
      {numMessages > 0
        ? accounts
            ?.filter((a) => (account === undefined || a.id === account.id) && a.enabled !== false)
            .map((account) => {
              const recentMailbox = account.mailboxes.find(isInbox);
              return recentMailbox ? (
                <List.Section key={account.id} title={account.name} subtitle={account.emails[0]}>
                  {account.messages?.map((message) => (
                    <MessageListItem
                      key={message.id}
                      mailbox={recentMailbox}
                      account={account}
                      message={message}
                      onAction={(action) => {
                        handleAction(action, recentMailbox);
                      }}
                      onRefresh={handleRefresh}
                    />
                  ))}
                </List.Section>
              ) : null;
            })
        : null}
      {!error && !numMessages && !isLoadingAccounts && (
        <List.EmptyView
          title={"No Recent Unread Messages"}
          description={"You're all caught up..."}
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
