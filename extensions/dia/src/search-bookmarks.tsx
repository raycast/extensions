import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useState } from "react";
import { useBookmarkSearch } from "./bookmarks";
import { BookmarkListItem } from "./components/BookmarkListItem";

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const [folderPath, setFolderPath] = useState<string[]>([]);
  const { items, isLoading, errorView, currentPath } = useBookmarkSearch(searchText, folderPath);

  if (errorView) {
    return errorView;
  }

  const handleNavigate = (idPath: string[]) => {
    setFolderPath(idPath);
    setSearchText(""); // Clear search when navigating
  };

  const handleNavigateBack = () => {
    if (folderPath.length > 0) {
      setFolderPath(folderPath.slice(0, -1));
      setSearchText(""); // Clear search when navigating back
    }
  };

  // Build breadcrumb for navigation bar
  const navigationTitle = currentPath.length > 0 ? currentPath.join(" › ") : "Bookmarks";

  // Separate folders and bookmarks for better organization
  const folders = items.filter((item) => item.type === "folder");
  const bookmarks = items.filter((item) => item.type === "url");

  return (
    <List
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
      searchBarPlaceholder={searchText ? "Search all bookmarks..." : "Search or browse bookmarks..."}
      navigationTitle={navigationTitle}
      actions={
        folderPath.length > 0 ? (
          <ActionPanel>
            <Action title="Go Back" icon={Icon.ArrowLeft} onAction={handleNavigateBack} />
          </ActionPanel>
        ) : undefined
      }
    >
      {!searchText && folderPath.length > 0 && (
        <List.Item
          key="back"
          title="Back"
          icon={{ source: Icon.ArrowLeft, tintColor: "#999" }}
          actions={
            <ActionPanel>
              <Action title="Go Back" icon={Icon.ArrowLeft} onAction={handleNavigateBack} />
            </ActionPanel>
          }
        />
      )}

      {!searchText && folders.length > 0 && (
        <List.Section title="Folders">
          {folders.map((item) => (
            <BookmarkListItem key={item.id} item={item} onNavigate={handleNavigate} />
          ))}
        </List.Section>
      )}

      {!searchText && bookmarks.length > 0 && (
        <List.Section title={folders.length > 0 ? "Bookmarks" : undefined}>
          {bookmarks.map((item) => (
            <BookmarkListItem key={item.id} item={item} onNavigate={handleNavigate} />
          ))}
        </List.Section>
      )}

      {searchText && items.length > 0 && (
        <List.Section title={`${items.length} result${items.length !== 1 ? "s" : ""}`}>
          {items.map((item) => (
            <BookmarkListItem key={item.id} item={item} onNavigate={handleNavigate} />
          ))}
        </List.Section>
      )}

      {!isLoading && items.length === 0 && searchText && (
        <List.EmptyView
          title="No bookmarks found"
          description={`No bookmarks match "${searchText}"`}
          icon={Icon.MagnifyingGlass}
        />
      )}

      {!isLoading && items.length === 0 && !searchText && folderPath.length > 0 && (
        <List.EmptyView title="Empty folder" description="This folder contains no bookmarks" icon={Icon.Folder} />
      )}
    </List>
  );
}
