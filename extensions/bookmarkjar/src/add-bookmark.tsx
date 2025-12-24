import {
  Action,
  ActionPanel,
  Icon,
  List,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { addBookmark, isValidUrl } from "./lib/api";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Parse URLs from input (split by newlines or spaces)
  const urls = searchText
    .split(/[\n\s]+/)
    .map((u) => u.trim())
    .filter((u) => u.length > 0);

  const validUrls = urls.filter(isValidUrl);
  const hasValidUrls = validUrls.length > 0;

  async function saveBookmarks() {
    if (!hasValidUrls) return;

    setIsLoading(true);
    try {
      // Save each URL
      for (const url of validUrls) {
        await addBookmark(url);
      }
      await showToast({
        style: Toast.Style.Success,
        title:
          validUrls.length === 1
            ? "Bookmark saved!"
            : `${validUrls.length} bookmarks saved!`,
      });
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save",
        message: error instanceof Error ? error.message : "Unknown error",
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
      searchBarPlaceholder="Paste URL(s) to save..."
      filtering={false}
    >
      {hasValidUrls ? (
        validUrls.map((url, index) => (
          <List.Item
            key={index}
            icon={Icon.Link}
            title={url}
            actions={
              <ActionPanel>
                <Action
                  title={
                    validUrls.length === 1
                      ? "Save Bookmark"
                      : `Save ${validUrls.length} Bookmarks`
                  }
                  icon={Icon.Plus}
                  onAction={saveBookmarks}
                />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView
          icon={Icon.Link}
          title="Enter a URL"
          description="Paste one or more URLs separated by spaces or newlines"
        />
      )}
    </List>
  );
}
