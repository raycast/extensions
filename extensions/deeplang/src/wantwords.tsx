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
      const url = constructSearchUrl(simplified, "words");
      await showToast({ title: "Opening WantWords search..." });
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
      searchBarPlaceholder="Enter description to find Chinese words..."
      actions={
        <ActionPanel>
          <Action
            title="Search Words"
            onAction={() => handleSearch(searchText)}
          />
        </ActionPanel>
      }
    />
  );
}
