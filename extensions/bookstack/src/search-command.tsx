// src/search-command.tsx
import React, { useState, useEffect } from "react";
import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { searchBookStack, SearchResultItem } from "./bookstack-api";
import { stripHtmlTags } from "./utils";

export default function SearchDocumentation() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [items, setItems] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setItems([]);
      return;
    }

    setIsLoading(true);

    searchBookStack(searchTerm)
      .then((results) => {
        setItems(results);
      })
      .catch((error) => {
        showToast(
          Toast.Style.Failure,
          "Failed to fetch data",
          error instanceof Error ? error.message : "An unknown error occurred",
        ).then((r) => console.log(r));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [searchTerm]);

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchTerm} searchBarPlaceholder="Search in BookStack" throttle>
      {items.map((item, index) => (
        <List.Item
          key={item.id + index}
          title={item.name}
          subtitle={stripHtmlTags(item.preview_html?.content || "")}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={item.url} title="Open URL" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
