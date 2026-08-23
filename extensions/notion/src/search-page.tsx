import { List } from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { useState } from "react";

import { PageListItem } from "./components";
import { useRecentPages, useUsers, usePinnedPages } from "./hooks";
import { search } from "./utils/notion";
import { notionService } from "./utils/notion/oauth";

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
  );

  const { data: users } = useUsers();

  const pinnedIds = new Set(pinnedPages?.map((p) => p.id) ?? []);

  const sections = [
    { title: "Pinned", pages: pinnedPages ?? [], isPinned: true },
    { title: "Recent", pages: recentPages?.filter((p) => !pinnedIds.has(p.id)) ?? [], isPinned: false },
    {
      title: "Search",
      pages: data?.filter((p) => !recentPages?.some((q) => p.id == q.id) && !pinnedIds.has(p.id)) ?? [],
      isPinned: false,
    },
  ];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search pages"
      onSearchTextChange={setSearchText}
      throttle
      pagination={pagination}
      filtering={{ keepSectionOrder: true }}
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
                  isPinned={section.isPinned || pinnedIds.has(p.id)}
                  setPinnedPage={setPinnedPage}
                  removePinnedPage={removePinnedPage}
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
