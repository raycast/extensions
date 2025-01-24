import { List } from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { useState } from "react";

import { PageListItem } from "./components";
import { useRecentPages, useUsers } from "./hooks";
import { Database, fetchDatabases, queryDatabase, search } from "./utils/notion";
import { notionService } from "./utils/notion/oauth";

function DatabaseDropdown({
  databases,
  onChange,
}: {
  databases: Database[];
  onChange: (database: Database | undefined) => void;
}) {
  return (
    <List.Dropdown
      onChange={(value) => onChange(value ? databases.find((db) => db.id === value) : undefined)}
      tooltip="Filter by database"
    >
      <List.Dropdown.Item key="all" value={""} title="All" />
      {databases.map((db) => (
        <List.Dropdown.Item
          key={db.id}
          value={db.id}
          title={db.title ?? db.id}
          //          icon={{ source: db.icon_file ?? db.icon_external ?? undefined }}
        />
      ))}
    </List.Dropdown>
  );
}

function Search() {
  const { data: recentPages, setRecentPage, removeRecentPage } = useRecentPages();
  const [searchText, setSearchText] = useState<string>("");
  const [database, setDatabase] = useState<Database | undefined>(undefined);
  const { data, isLoading, pagination, mutate } = useCachedPromise(
    (searchText: string) =>
      async ({ cursor }) => {
        if (!database) {
          const { pages, hasMore, nextCursor } = await search(searchText, cursor);
          return { data: pages, hasMore, cursor: nextCursor };
        } else {
          const { pages, hasMore, nextCursor } = await queryDatabase(
            database.id,
            searchText,
            "last_edited_time",
            cursor,
          );
          return { data: pages, hasMore, cursor: nextCursor };
        }
      },
    [searchText],
  );

  const databases = useCachedPromise(async () => {
    const databases = await fetchDatabases();
    return databases;
  }, []);

  const { data: users } = useUsers();

  const sections = [
    { title: "Recent", pages: recentPages ?? [] },
    { title: "Search", pages: data?.filter((p) => !recentPages?.some((q) => p.id == q.id)) ?? [] },
  ];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search pages"
      onSearchTextChange={setSearchText}
      searchBarAccessory={<DatabaseDropdown databases={databases.data ?? []} onChange={setDatabase} />}
      throttle
      pagination={pagination}
      filtering
    >
      {sections.map((section) => {
        return (
          <List.Section title={section.title} key={section.title}>
            {section.pages.map((p) => {
              return (
                <PageListItem
                  key={`${section.title}-${p.id}`}
                  page={p}
                  users={users}
                  mutate={mutate}
                  setRecentPage={setRecentPage}
                  removeRecentPage={removeRecentPage}
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

export default withAccessToken(notionService)(Search);
