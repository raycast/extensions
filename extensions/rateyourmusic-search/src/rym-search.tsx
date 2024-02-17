import { List, ActionPanel, open, Action } from "@raycast/api";
import { useState } from "react";

export default function SearchRateYourMusic() {
  const [query, setQuery] = useState("");
  // Add "genre" to the selectedType state type
  const [selectedType, setSelectedType] = useState<"artist" | "release" | "everything" | "genre">("everything");

  return (
    <List
      searchBarPlaceholder="Search RateYourMusic..."
      onSearchTextChange={setQuery}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Type"
          value={selectedType}
          onChange={(newValue) => setSelectedType(newValue as "artist" | "release" | "everything" | "genre")}
        >
          <List.Dropdown.Item title="Everything" value="everything" />
          <List.Dropdown.Item title="Artist" value="artist" />
          <List.Dropdown.Item title="Release" value="release" />
          <List.Dropdown.Item title="Genre" value="genre" />
        </List.Dropdown>
      }
    >
      <List.Item
        title={`Search for "${query}" as ${selectedType}`}
        actions={
          <ActionPanel>
            <Action
              title="Search on RateYourMusic"
              onAction={() => {
                const baseUrl = "https://rateyourmusic.com";
                const searchParams = {
                  artist: "&searchtype=a",
                  release: "&searchtype=l",
                  genre: `/genre/${encodeURIComponent(query)}`,
                };
                let url = `${baseUrl}/search?searchterm=${encodeURIComponent(query)}`;
                if (selectedType === "everything") {
                  open(url);
                } else if (selectedType in searchParams) {
                  url =
                    selectedType === "genre"
                      ? `${baseUrl}${searchParams[selectedType]}`
                      : `${url}${searchParams[selectedType]}`;
                  open(url);
                }
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
