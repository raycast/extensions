import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useEffect, useState } from "react";
import { google } from "./lib/google-auth";
import { createDocument } from "./lib/google-docs";
import { listFolders } from "./lib/google-drive";
import {
  addRecentFolder,
  getRecentFolders,
  type RecentFolder,
} from "./lib/recent-folders";
import type { GoogleFolder } from "./types";

// Step 2: Document naming form
function CreateDocForm({ folder }: { folder: GoogleFolder }) {
  const [isCreating, setIsCreating] = useState(false);

  async function handleSubmit(values: { documentName: string }) {
    const documentName = values.documentName.trim() || "Untitled Document";

    setIsCreating(true);
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Creating document...",
      });

      // Save folder as recently used
      await addRecentFolder(folder);

      const doc = await createDocument(documentName, folder.id);

      await showToast({
        style: Toast.Style.Success,
        title: "Document created!",
        message: doc.name,
      });

      await open(doc.webViewLink);
    } catch (error) {
      console.error("Failed to create document:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create document",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Form
      isLoading={isCreating}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Document"
            icon={Icon.Document}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Folder" text={folder.name} />
      <Form.TextField
        id="documentName"
        title="Document Name"
        placeholder="Untitled Document"
        autoFocus
      />
    </Form>
  );
}

// Step 1: Folder selection
function FolderSelector() {
  const { push } = useNavigation();
  const [recentFolders, setRecentFolders] = useState<RecentFolder[]>([]);
  const [searchResults, setSearchResults] = useState<GoogleFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadRecentFolders();
  }, []);

  async function loadRecentFolders() {
    try {
      const recent = await getRecentFolders();
      setRecentFolders(recent);
    } catch (error) {
      console.error("Failed to load recent folders:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSearch(query: string) {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setIsLoading(true);
    try {
      const results = await listFolders(query);
      setSearchResults(results);
    } catch (error) {
      console.error("Failed to search folders:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to search folders",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleSearchTextChange(text: string) {
    setSearchText(text);
    if (!text.trim()) {
      setSearchResults([]);
      setIsSearching(false);
    }
  }

  function handleSelectFolder(folder: GoogleFolder) {
    push(<CreateDocForm folder={folder} />);
  }

  // Convert recent folders to GoogleFolder type for consistent handling
  const recentAsGoogleFolders: GoogleFolder[] = recentFolders.map((f) => ({
    id: f.id,
    name: f.name,
    mimeType: "application/vnd.google-apps.folder",
  }));

  const foldersToShow = isSearching ? searchResults : recentAsGoogleFolders;
  const sectionTitle = isSearching ? "Search Results" : "Recent Folders";

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Google Drive folders..."
      onSearchTextChange={handleSearchTextChange}
      throttle
      actions={
        <ActionPanel>
          <Action
            title="Search"
            icon={Icon.MagnifyingGlass}
            onAction={() => handleSearch(searchText)}
          />
        </ActionPanel>
      }
    >
      {foldersToShow.length === 0 && !isLoading ? (
        <List.EmptyView
          title={isSearching ? "No folders found" : "No recent folders"}
          description={
            isSearching
              ? "Try a different search term"
              : "Search for a folder to get started"
          }
          icon={Icon.Folder}
        />
      ) : (
        <List.Section title={sectionTitle}>
          {foldersToShow.map((folder) => (
            <List.Item
              key={folder.id}
              title={folder.name}
              icon={Icon.Folder}
              actions={
                <ActionPanel>
                  <Action
                    title="Select Folder"
                    icon={Icon.Check}
                    onAction={() => handleSelectFolder(folder)}
                  />
                  <Action
                    title="Search"
                    icon={Icon.MagnifyingGlass}
                    onAction={() => handleSearch(searchText)}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default withAccessToken(google)(FolderSelector);
