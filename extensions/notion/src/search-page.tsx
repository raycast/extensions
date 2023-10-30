import { List } from "@raycast/api";
import React, { useState } from "react";

import { PageListItem, View } from "./components";
import { useRecentPages, useSearchPages, useUsers } from "./hooks";

function Search() {
  const { data: recentPages, setRecentPage, removeRecentPage } = useRecentPages();
  const [searchText, setSearchText] = useState<string>("");
  const { data: searchPages, isLoading, mutate } = useSearchPages(searchText);
  const { data: users } = useUsers();

  const sections = [
    { title: "Recent", pages: recentPages ?? [] },
    { title: "Search", pages: searchPages?.filter((p) => !recentPages?.some((q) => p.id == q.id)) ?? [] },
  ];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search pages"
      onSearchTextChange={setSearchText}
      throttle
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

export default function Command() {
  return (
    <View>
      <Search />
    </View>
  );
}
