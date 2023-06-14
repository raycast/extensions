import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { Account } from "./types";
import { MailboxList } from "./components";
import { getAccounts } from "./scripts/accounts";

export default function SeeMailAccounts() {
  const { data: accounts, isLoading: isLoadingAccounts } = useCachedPromise(getAccounts);

  return (
    <List searchBarPlaceholder="Search for mail accounts" isLoading={isLoadingAccounts}>
      {accounts && accounts.length > 0 ? (
        accounts?.map((account: Account) => <MailboxList key={account.id} {...account} />)
      ) : (
        <List.EmptyView
          title={"No Mail Accounts Found"}
          description={"Check again to make sure you are signed in..."}
        />
      )}
    </List>
  );
}
