import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { MailAccount } from "./components/account";
import { getMailAccounts } from "./scripts/account";
import { Account } from "./types";

export default function MailAccounts() {
  const { data: accounts, isLoading: isLoadingAccounts } = useCachedPromise(getMailAccounts);

  return (
    <List searchBarPlaceholder="Search for accounts" isLoading={isLoadingAccounts}>
      {accounts && accounts.length > 0 ? (
        accounts?.map((account: Account) => <MailAccount key={account.id} {...account} />)
      ) : (
        <List.EmptyView
          title={"No Mail Accounts Found"}
          description={"Check again to make sure you are signed in..."}
        />
      )}
    </List>
  );
}
