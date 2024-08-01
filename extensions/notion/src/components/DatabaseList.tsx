import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";

import { useDatabaseProperties, useDatabasesView } from "../hooks";
import { queryDatabase, getPageName, Page, User } from "../utils/notion";

import { DatabaseView } from "./DatabaseView";
import { CreatePageForm } from "./forms";

type DatabaseListProps = {
  databasePage: Page;
  setRecentPage: (page: Page) => Promise<void>;
  removeRecentPage: (id: string) => Promise<void>;
  users?: User[];
};

export function DatabaseList({ databasePage, setRecentPage, removeRecentPage, users }: DatabaseListProps) {
  const databaseId = databasePage.id;
  const databaseName = getPageName(databasePage);
  const [searchText, setSearchText] = useState<string>();
  const [sort, setSort] = useState<"last_edited_time" | "created_time">("last_edited_time");
  const {
    data: databasePages,
    isLoading,
    mutate,
  } = useCachedPromise(
    (databaseId, searchText, sort) => queryDatabase(databaseId, searchText, sort),
    [databaseId, searchText, sort],
  );
  const { data: databaseProperties, isLoading: isLoadingDatabaseProperties } = useDatabaseProperties(databaseId);
  const { data: databaseView, isLoading: isLoadingDatabaseViews, setDatabaseView } = useDatabasesView(databaseId);

  useEffect(() => {
    setRecentPage(databasePage);
  }, [databaseId]);

  if (isLoadingDatabaseProperties || isLoadingDatabaseViews) {
    return <List isLoading />;
  }

  const navigationTitle = databaseView?.name
    ? (databasePage.icon_emoji ? databasePage.icon_emoji + " " : "") + databaseView.name
    : databaseName;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter pages"
      navigationTitle={navigationTitle}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort by"
          storeValue
          onChange={(value) => setSort(value as "last_edited_time" | "created_time")}
        >
          <List.Dropdown.Item title="Last Edited At" value="last_edited_time" />
          <List.Dropdown.Item title="Last Created At" value="created_time" />
        </List.Dropdown>
      }
      throttle
    >
      <DatabaseView
        databaseId={databaseId}
        databasePages={databasePages ?? []}
        databaseProperties={databaseProperties}
        databaseView={databaseView}
        setDatabaseView={setDatabaseView}
        sort={sort}
        mutate={mutate}
        setRecentPage={setRecentPage}
        removeRecentPage={removeRecentPage}
        users={users}
      />

      <List.EmptyView
        title="No pages found"
        description="Create a new page for this database by pressing ⏎"
        actions={
          <ActionPanel>
            <Action.Push
              title="Create New Page"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={<CreatePageForm defaults={{ database: databaseId }} mutate={mutate} />}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
