import {
  Action,
  ActionPanel,
  Icon,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import { searchOfficers } from "./api";
import { OfficerListItem } from "./components/OfficerListItem";
import { PAGE_SIZE } from "./constants";

export default function SearchOfficers() {
  const [searchText, setSearchText] = useState("");

  const { isLoading, data, pagination, error } = useCachedPromise(
    (query: string) => async (options: { page: number }) => {
      if (!query.trim()) return { data: [], hasMore: false };
      const startIndex = options.page * PAGE_SIZE;
      const res = await searchOfficers(query.trim(), startIndex);
      const items = res.items ?? [];
      const total = res.total_results ?? items.length;
      return { data: items, hasMore: startIndex + items.length < total };
    },
    [searchText],
    { keepPreviousData: true },
  );

  return (
    <List
      isLoading={isLoading}
      throttle
      pagination={pagination}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search officers and directors by name…"
    >
      {data?.length ? (
        data.map((item, index) => (
          <OfficerListItem
            key={`${item.links?.self ?? item.title}-${index}`}
            item={item}
          />
        ))
      ) : error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't load officers"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ) : searchText ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No officers found"
          description="Try a different name."
        />
      ) : (
        <List.EmptyView
          icon={Icon.Person}
          title="Search Officers"
          description="Start typing an officer or director name."
        />
      )}
    </List>
  );
}
