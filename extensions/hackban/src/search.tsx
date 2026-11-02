import { Icon, List } from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { useState } from "react";

import { accountAccessory, AccountIssues, EmptyViewActions } from "./components/accounts";
import { BoardActions } from "./components/board-view";
import { CardActions } from "./components/card-actions";
import { ensureAccount, gather } from "./lib/hackban";

const searchAll = (query: string) => gather((api) => api.search(query));

function Search() {
  const [query, setQuery] = useState("");
  const q = query.trim();
  // The search tool needs two characters or more.
  const ready = q.length >= 2;
  const { data, isLoading, revalidate } = useCachedPromise(searchAll, [q], {
    execute: ready,
    keepPreviousData: true,
  });
  const results = ready ? data : undefined;
  const accounts = results?.accounts ?? [];

  return (
    <List
      isLoading={ready && isLoading}
      filtering={false}
      throttle
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search boards and cards"
    >
      {ready ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No results"
          description={`Nothing on your boards matches "${q}".`}
          actions={<EmptyViewActions onRefresh={revalidate} />}
        />
      ) : (
        // Nothing has been searched yet, so there's nothing to refresh.
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Hackban"
          description="Board names, card titles and descriptions."
          actions={<EmptyViewActions />}
        />
      )}
      <AccountIssues data={results} onFixed={revalidate} />
      <List.Section title="Boards">
        {results?.results.flatMap(({ account, data }) =>
          data.boards.map((b) => (
            <List.Item
              key={`${account.id}:${b.id}`}
              title={b.name}
              icon={Icon.AppWindowGrid3x3}
              accessories={accountAccessory(account, accounts)}
              actions={<BoardActions account={account} board={b} onRefresh={revalidate} />}
            />
          )),
        )}
      </List.Section>
      <List.Section title="Cards">
        {results?.results.flatMap(({ account, data }) =>
          data.cards.map((c) => (
            <List.Item
              key={`${account.id}:${c.id}`}
              title={c.title}
              subtitle={c.board}
              icon={c.archived ? Icon.Tray : Icon.Circle}
              accessories={[
                ...(c.archived ? [{ tag: "Archived" }] : []),
                { text: c.list, tooltip: "List" },
                ...accountAccessory(account, accounts),
              ]}
              actions={<CardActions account={account} card={c} onChange={revalidate} />}
            />
          )),
        )}
      </List.Section>
    </List>
  );
}

export default withAccessToken({ authorize: ensureAccount })(Search);
