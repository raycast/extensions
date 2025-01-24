import React, { useState } from "react";
import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  open,
} from "@raycast/api";
import { convertToSimplified, constructSearchUrl } from "./utils";

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  async function handleSearch(text: string) {
    if (!text) return;

    setIsLoading(true);
    try {
      const simplified = await convertToSimplified(text);
      const url = constructSearchUrl(simplified, "quotes");
      await showToast({ title: "Opening WantQuotes search..." });
      await open(url);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Search failed",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter keywords to find Chinese quotes..."
      actions={
        <ActionPanel>
          <Action
            title="Search Quotes"
            onAction={() => handleSearch(searchText)}
          />
        </ActionPanel>
      }
    />
  );
}
