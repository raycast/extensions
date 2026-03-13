import { useRef } from "react";
import { List, Action, ActionPanel, Color, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { getAccountsAndPots } from "./lib/actions";
import { accountTitle } from "./lib/formatting";
import { PotItem } from "./components/pots";
import { AccountItem } from "./components/accounts";
import { TransactionsList } from "./components/transactions";

export default function Command() {
  const abortable = useRef<AbortController>();

  const { isLoading, data: accountPots } = usePromise(getAccountsAndPots, [], {
    abortable,
  });

  const showNoAccess = (!accountPots || accountPots.length == 0) && !isLoading;

  return (
    <List
      filtering={true}
      isLoading={isLoading}
      searchBarPlaceholder="Search accounts and pots"
      isShowingDetail={!showNoAccess}
    >
      {accountPots?.map(({ account, pots }) => (
        <List.Section key={account.id} title={accountTitle(account)}>
          <AccountItem
            key={account.id}
            account={account}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Transactions"
                  target={<TransactionsList account={account} />}
                />
              </ActionPanel>
            }
          />
          {pots.map((pot) => (
            <PotItem key={pot.id} pot={pot} />
          ))}
        </List.Section>
      ))}
      {showNoAccess && (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
          title="No Monzo Access"
          description="Open the Monzo app to allow Raycast to access your accounts."
        />
      )}
    </List>
  );
}
