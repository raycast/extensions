import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import { PageListItem } from "./components";
import { useRecentPages, useUsers, useDatabases } from "./hooks";
import { search, type Page } from "./utils/notion";
import { getNotionAccounts, getNotionAccountLabel } from "./utils/notion/oauth";

const ALL_ACCOUNTS = "all";

function Search() {
  const { data: recentPages, setRecentPage, removeRecentPage } = useRecentPages();
  const [searchText, setSearchText] = useState<string>("");
  const [accountFilter, setAccountFilter] = useState<string>(ALL_ACCOUNTS);
  const accounts = getNotionAccounts();
  const primaryAccount = accounts[0];
  const secondaryAccount = accounts[1];
  const hasMultipleAccounts = accounts.length > 1;

  // Fetch databases to get their names
  const { data: primaryDatabases } = useDatabases(primaryAccount?.id);
  const { data: secondaryDatabases } = useDatabases(secondaryAccount?.id);

  // Create a lookup map for database names, indexed by both data_source ID and database ID
  const databaseNameMap = new Map<string, string>();
  const indexDatabase = (db: { id: string; parent_database_id?: string; title: string | null }) => {
    if (!db.title) return;
    databaseNameMap.set(db.id, db.title);
    if (db.parent_database_id) databaseNameMap.set(db.parent_database_id, db.title);
  };
  primaryDatabases?.forEach(indexDatabase);
  secondaryDatabases?.forEach(indexDatabase);

  // Helper to enrich pages with database names
  const enrichWithDatabaseName = (page: Page): Page => {
    if (page.parent_database_id && !page.parent_database_name) {
      const dbName = databaseNameMap.get(page.parent_database_id);
      if (dbName) {
        return { ...page, parent_database_name: dbName };
      }
    }
    return page;
  };

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
            if (cursorState[account.id] === null) {
              return { accountId: account.id, result: { pages: [], hasMore: false, nextCursor: null } };
            }
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

  // Enrich pages with database names
  const enrichedData = data?.map(enrichWithDatabaseName);
  const enrichedRecentPages = recentPages?.map(enrichWithDatabaseName);

  const filterByAccount = (page: Page) =>
    accountFilter === ALL_ACCOUNTS || (page.accountId ?? primaryAccount?.id) === accountFilter;

  const sections = [
    { title: "Recent", pages: (enrichedRecentPages ?? []).filter(filterByAccount) },
    {
      title: "Search",
      pages:
        enrichedData
          ?.filter(
            (p) => !recentPages?.some((q) => p.id === q.id && (p.accountId ?? primaryAccount?.id) === q.accountId),
          )
          .filter(filterByAccount) ?? [],
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
      searchBarAccessory={
        hasMultipleAccounts ? (
          <List.Dropdown tooltip="Filter by Account" value={accountFilter} onChange={setAccountFilter}>
            <List.Dropdown.Item title="All Accounts" value={ALL_ACCOUNTS} />
            {accounts.map((account) => (
              <List.Dropdown.Item key={account.id} title={account.label} value={account.id} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
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
