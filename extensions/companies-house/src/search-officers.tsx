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
import { createSearchFetcher } from "./pagination";

export default function SearchOfficers() {
  const [searchText, setSearchText] = useState("");

  const { isLoading, data, pagination, error } = useCachedPromise(
    createSearchFetcher(searchOfficers),
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
          title="Couldn't Load Officers"
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
      ) : searchText && isLoading ? (
        <List.EmptyView icon={Icon.Clock} title="Searching…" />
      ) : searchText ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Officers Found"
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
