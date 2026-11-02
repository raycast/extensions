import { Color, Icon, List } from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";

import { accountAccessory, AccountIssues, EmptyViewActions } from "./components/accounts";
import { BoardActions } from "./components/board-view";
import { ensureAccount, gather } from "./lib/hackban";

const fetchWorkspaces = () => gather((api) => api.workspaces());

function Boards() {
  const { data, isLoading, revalidate } = useCachedPromise(fetchWorkspaces, []);
  const accounts = data?.accounts ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter boards">
      <List.EmptyView
        icon={Icon.AppWindowGrid3x3}
        title="No boards"
        description="Boards you can open on Hackban show up here."
        actions={<EmptyViewActions onRefresh={revalidate} />}
      />
      <AccountIssues data={data} onFixed={revalidate} />
      {(data?.results ?? []).flatMap(({ account, data: workspaces }) =>
        workspaces.map((w) => (
          <List.Section
            key={`${account.id}:${w.id}`}
            title={w.name}
            subtitle={accounts.length > 1 ? account.label : String(w.boards.length)}
          >
            {/* Starred boards first, as on Hackban's home page. */}
            {[...w.boards]
              .sort((a, b) => Number(b.starred) - Number(a.starred))
              .map((b) => (
                <List.Item
                  key={b.id}
                  title={b.name}
                  keywords={[w.name, account.label]}
                  icon={Icon.AppWindowGrid3x3}
                  accessories={[
                    ...(b.starred
                      ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Starred" }]
                      : []),
                    ...accountAccessory(account, accounts),
                  ]}
                  actions={<BoardActions account={account} board={b} onRefresh={revalidate} />}
                />
              ))}
          </List.Section>
        )),
      )}
    </List>
  );
}

export default withAccessToken({ authorize: ensureAccount })(Boards);
