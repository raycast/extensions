import { Icon, List } from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { useState } from "react";

import { accountAccessory, AccountIssues, EmptyViewActions } from "./components/accounts";
import { ToggleCompleteAction } from "./components/actions";
import { CardActions } from "./components/card-actions";
import { cardIcon, type DueState, dueAccessory, dueState, labelAccessories } from "./lib/format";
import { type CardSummary, ensureAccount, type From, gather } from "./lib/hackban";

const SECTIONS: { state: DueState; title: string }[] = [
  { state: "overdue", title: "Overdue" },
  { state: "today", title: "Due Today" },
  { state: "week", title: "Due This Week" },
  { state: "later", title: "Due Later" },
  { state: "none", title: "No Due Date" },
  { state: "done", title: "Done" },
];

const fetchMyCards = () => gather((api) => api.myCards());
const dueTime = (c: CardSummary) => (c.due ? Date.parse(c.due) : Infinity);

function MyCards() {
  const [filter, setFilter] = useState("");
  const { data, isLoading, revalidate } = useCachedPromise(fetchMyCards, []);
  const accounts = data?.accounts ?? [];
  // Each account's cards come soonest due first; keep that order once they're merged.
  const cards: From<CardSummary>[] = (data?.results ?? [])
    .flatMap(({ account, data }) => data.map((c) => ({ ...c, account })))
    .sort((a, b) => dueTime(a) - dueTime(b) || 0);
  const boardsByAccount = (data?.results ?? []).map(({ account, data }) => ({
    account,
    boards: [...new Set(data.map((c) => c.board))].sort((a, b) => a.localeCompare(b)),
  }));
  const shown = filter ? cards.filter((c) => `${c.account.id}:${c.board}` === filter) : cards;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter your cards"
      searchBarAccessory={
        <List.Dropdown tooltip="Board" storeValue onChange={setFilter}>
          <List.Dropdown.Item title="All Boards" value="" />
          {boardsByAccount.map(({ account, boards }) => (
            <List.Dropdown.Section key={account.id} title={accounts.length > 1 ? account.label : undefined}>
              {boards.map((b) => (
                <List.Dropdown.Item key={b} title={b} value={`${account.id}:${b}`} />
              ))}
            </List.Dropdown.Section>
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.CheckCircle}
        title="No cards"
        description="Cards you're a member of show up here."
        actions={<EmptyViewActions onRefresh={revalidate} />}
      />
      <AccountIssues data={data} onFixed={revalidate} />
      {SECTIONS.map(({ state, title }) => {
        const inSection = shown.filter((c) => dueState(c.due, c.dueComplete) === state);
        return (
          <List.Section key={state} title={title} subtitle={inSection.length ? String(inSection.length) : undefined}>
            {inSection.map((c) => (
              <List.Item
                key={`${c.account.id}:${c.id}`}
                title={c.title}
                subtitle={c.board}
                keywords={[c.board, c.list, c.account.label, ...(c.labels ?? [])]}
                icon={cardIcon(c.due, c.dueComplete)}
                accessories={[
                  ...labelAccessories(c.labels),
                  { text: c.list, tooltip: "List" },
                  ...dueAccessory(c.due, c.dueComplete),
                  ...accountAccessory(c.account, accounts),
                ]}
                actions={
                  <CardActions account={c.account} card={c} onChange={revalidate}>
                    <ToggleCompleteAction
                      account={c.account}
                      cardId={c.id}
                      complete={!!c.dueComplete}
                      onChange={revalidate}
                    />
                  </CardActions>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

export default withAccessToken({ authorize: ensureAccount })(MyCards);
