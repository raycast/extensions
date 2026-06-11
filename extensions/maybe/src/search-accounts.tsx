import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getAvatarIcon, useCachedPromise } from "@raycast/utils";
import { buildMaybeUrl, maybe } from "./maybe";
import { Account } from "./types";

export default function SearchAccounts() {
  const {
    isLoading,
    data: accounts,
    pagination,
  } = useCachedPromise(
    () => async (options) => {
      const data = await maybe.accounts.list({ page: options.page + 1, per_page: 25 });
      return {
        data: data.accounts,
        hasMore: data.pagination.page < data.pagination.total_pages,
      };
    },
    [],
    { initialData: [] },
  );

  const grouped = accounts.reduce(
    (acc, account) => {
      const type = account.account_type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(account);
      return acc;
    },
    {} as { [account_type: string]: Account[] },
  );

  return (
    <List isLoading={isLoading} pagination={pagination}>
      {!isLoading && !accounts.length ? (
        <List.EmptyView
          icon={Icon.Layers}
          title="No accounts yet"
          description="Add accounts to display net worth data"
        />
      ) : (
        Object.entries(grouped).map(([group, accounts]) => (
          <List.Section key={group} title={group}>
            {accounts.map((account) => (
              <List.Item
                key={account.id}
                icon={getAvatarIcon(account.name)}
                title={account.name}
                subtitle={account.balance}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={buildMaybeUrl(`accounts/${account.id}`)} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
