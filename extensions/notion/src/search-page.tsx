import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { useState } from "react";

import { PageListItem } from "./components";
import { useRecentPages, useUsers, usePinnedPages } from "./hooks";
import { search } from "./utils/notion";
import { notionService } from "./utils/notion/oauth";
import { openConnectionSettings, showNotionError } from "./utils/notion/errors";
import { getSearchSections } from "./utils/searchSections";

function Search() {
  const { data: pinnedPages, setPinnedPage, removePinnedPage } = usePinnedPages();
  const { data: recentPages, setRecentPage, removeRecentPage } = useRecentPages();
  const [searchText, setSearchText] = useState<string>("");

  const { data, isLoading, pagination, mutate } = useCachedPromise(
    (searchText: string) =>
      async ({ cursor }) => {
        const { pages, hasMore, nextCursor } = await search(searchText, cursor);
        return { data: pages, hasMore, cursor: nextCursor };
      },
    [searchText],
    { onError: (error) => void showNotionError(error, "Failed to search Notion") },
  );

  const { data: users } = useUsers();

  const pinnedIds = new Set(pinnedPages?.map((p) => p.id) ?? []);

  const sections = getSearchSections(searchText, data ?? [], pinnedPages ?? [], recentPages ?? []);
  const searchActions = [
    <Action
      key="refresh"
      title="Refresh Results"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={() => mutate()}
    />,
    <Action key="connection" title="Manage Notion Connection" icon={Icon.Gear} onAction={openConnectionSettings} />,
  ];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search pages"
      onSearchTextChange={setSearchText}
      throttle
      pagination={pagination}
      filtering={false}
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
                  customActions={searchActions}
                  setRecentPage={setRecentPage}
                  removeRecentPage={removeRecentPage}
                  isPinned={section.isPinned || pinnedIds.has(p.id)}
                  setPinnedPage={setPinnedPage}
                  removePinnedPage={removePinnedPage}
                />
              );
            })}
          </List.Section>
        );
      })}
      <List.EmptyView
        title="No pages found"
        description="Check page access in Notion, then refresh. Newly shared pages can take time to appear."
        actions={<ActionPanel>{searchActions}</ActionPanel>}
      />
    </List>
  );
}

export default withAccessToken(notionService)(Search);
