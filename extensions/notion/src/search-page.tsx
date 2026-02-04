import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import { PageListItem } from "./components";
import { useRecentPages, useUsers } from "./hooks";
import { search } from "./utils/notion";
import { getNotionAccounts, getNotionAccountLabel } from "./utils/notion/oauth";

function Search() {
  const { data: recentPages, setRecentPage, removeRecentPage } = useRecentPages();
  const [searchText, setSearchText] = useState<string>("");
  const accounts = getNotionAccounts();
  const primaryAccount = accounts[0];
  const secondaryAccount = accounts[1];
  const hasMultipleAccounts = accounts.length > 1;

  const { data, isLoading, pagination, mutate } = useCachedPromise(
    (searchText: string, accountKeys: string) =>
      async ({ cursor }) => {
        void accountKeys;
        const cursorState = (() => {
          if (!cursor) return {};
          if (typeof cursor !== "string") return {};
          try {
            return JSON.parse(cursor) as Record<string, string | null>;
          } catch {
            return {};
          }
        })();

        const responses = await Promise.all(
          accounts.map(async (account) => {
            const result = await search(searchText, cursorState[account.id] ?? undefined, 25, account.id);
            return { accountId: account.id, result };
          }),
        );

        const pages = responses.flatMap((response) => response.result.pages);
        pages.sort((a, b) => (b.last_edited_time ?? 0) - (a.last_edited_time ?? 0));

        const hasMore = responses.some((response) => response.result.hasMore);
        const nextCursor = hasMore
          ? JSON.stringify(
              responses.reduce<Record<string, string | null>>((acc, response) => {
                acc[response.accountId] = response.result.nextCursor ?? null;
                return acc;
              }, {}),
            )
          : undefined;

        return { data: pages, hasMore, cursor: nextCursor };
      },
    [searchText, accounts.map((account) => account.id).join(",")],
  );

  const { data: primaryUsers } = useUsers(primaryAccount?.id);
  const { data: secondaryUsers } = useUsers(secondaryAccount?.id, { enabled: !!secondaryAccount });

  const sections = [
    { title: "Recent", pages: recentPages ?? [] },
    {
      title: "Search",
      pages:
        data?.filter(
          (p) => !recentPages?.some((q) => p.id === q.id && (p.accountId ?? primaryAccount?.id) === q.accountId),
        ) ?? [],
    },
  ];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search pages"
      onSearchTextChange={setSearchText}
      throttle
      pagination={pagination}
      filtering
    >
      {sections.map((section) => {
        return (
          <List.Section title={section.title} key={section.title}>
            {section.pages.map((p) => {
              const accountId = p.accountId ?? primaryAccount?.id;
              const users = accountId === secondaryAccount?.id ? secondaryUsers : primaryUsers;
              const accountLabel = hasMultipleAccounts ? getNotionAccountLabel(accountId) : undefined;
              return (
                <PageListItem
                  key={`${section.title}-${accountId ?? "default"}-${p.id}`}
                  page={p}
                  users={users}
                  mutate={mutate}
                  setRecentPage={setRecentPage}
                  removeRecentPage={(id) => removeRecentPage(id, accountId)}
                  accountLabel={accountLabel}
                  showTypeAccessory
                />
              );
            })}
          </List.Section>
        );
      })}
      <List.EmptyView title="No pages found" />
    </List>
  );
}

export default Search;
