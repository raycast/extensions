// src/show-all-shelves.tsx
import React, { useState, useEffect } from "react";
import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { getAllShelves, SearchResultItem, baseUrl } from "./bookstack-api";
import { stripHtmlTags } from "./utils";

export default function ShowAllShelves() {
  const [shelves, setShelves] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAllShelves()
      .then((shelfData) => {
        setShelves(shelfData);
      })
      .catch((error) => {
        showToast(
          Toast.Style.Failure,
          "Couldn't fetch shelves",
          error instanceof Error ? error.message : String(error),
        ).then((r) => console.log(r));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search shelves...">
      {shelves.map((shelf) => (
        <List.Item
          key={shelf.id.toString()}
          title={shelf.name}
          subtitle={stripHtmlTags(shelf.description)}
          accessories={[{ text: shelf.url }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`${baseUrl}${shelf.url}`} title="View Shelf" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
