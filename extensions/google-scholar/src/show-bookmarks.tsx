import { Action, ActionPanel, Icon, List, showToast, Toast, Alert, confirmAlert } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { BookmarkedArticle, getBookmarks, removeBookmark } from "./utils/bookmarks";
import { generateBibtex } from "./utils/bibtex";

// Helper function to generate BibTeX (can be imported if it's in a shared util)
// function generateBibtex(result: SearchResult): string { ... } // Removed

type BookmarkSortOrder = "savedAt_desc" | "savedAt_asc" | "title_asc" | "title_desc" | "year_asc" | "year_desc";

export default function ShowBookmarksCommand() {
  const [bookmarks, setBookmarks] = useState<BookmarkedArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<BookmarkSortOrder>("savedAt_desc");

  const fetchAndSetBookmarks = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedBookmarks = await getBookmarks();
      // Sort by selected order
      fetchedBookmarks.sort((a, b) => {
        switch (sortOrder) {
          case "savedAt_asc":
            return new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime();
          case "title_asc":
            return (a.title || "").localeCompare(b.title || "");
          case "title_desc":
            return (b.title || "").localeCompare(a.title || "");
          case "year_asc": {
            const yearA = parseInt(a.year || "0", 10);
            const yearB = parseInt(b.year || "0", 10);
            return yearA - yearB;
          }
          case "year_desc": {
            const yearA = parseInt(a.year || "0", 10);
            const yearB = parseInt(b.year || "0", 10);
            return yearB - yearA;
          }
          case "savedAt_desc": // Default
          default:
            return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
        }
      });
      setBookmarks(fetchedBookmarks);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load bookmarks",
        message: error instanceof Error ? error.message : String(error),
      });
      setBookmarks([]);
    } finally {
      setIsLoading(false);
    }
  }, [sortOrder]);

  useEffect(() => {
    fetchAndSetBookmarks();
  }, [fetchAndSetBookmarks]);

  async function handleRemoveBookmark(articleLink: string) {
    await removeBookmark(articleLink);
    await fetchAndSetBookmarks(); // Refresh the list
    await showToast({ style: Toast.Style.Success, title: "Bookmark Removed" });
  }

  async function handleClearAllBookmarks() {
    if (
      await confirmAlert({
        title: "Clear All Bookmarks?",
        message: "Are you sure you want to remove all your saved articles? This action cannot be undone.",
        primaryAction: {
          title: "Clear All",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        for (const bookmark of bookmarks) {
          await removeBookmark(bookmark.link);
        }
        await fetchAndSetBookmarks(); // Refresh the list (should be empty)
        await showToast({ style: Toast.Style.Success, title: "All Bookmarks Cleared" });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to clear bookmarks",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={bookmarks.length > 0}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort Bookmarks"
          storeValue // Remember sort order
          onChange={(newValue) => setSortOrder(newValue as BookmarkSortOrder)}
          value={sortOrder}
        >
          <List.Dropdown.Section title="Sort By">
            <List.Dropdown.Item title="Date Saved (Newest First)" value="savedAt_desc" />
            <List.Dropdown.Item title="Date Saved (Oldest First)" value="savedAt_asc" />
            <List.Dropdown.Item title="Title (A-Z)" value="title_asc" />
            <List.Dropdown.Item title="Title (Z-A)" value="title_desc" />
            <List.Dropdown.Item title="Year (Newest First)" value="year_desc" />
            <List.Dropdown.Item title="Year (Oldest First)" value="year_asc" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {bookmarks.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Bookmarks Yet"
          description="Save articles from the search results to see them here."
          icon={Icon.Star}
        />
      ) : (
        <List.Section title="Saved Articles" subtitle={`${bookmarks.length} article(s)`}>
          {bookmarks.map((bookmark) => (
            <List.Item
              key={bookmark.link}
              title={bookmark.title}
              subtitle={bookmark.authors || "Unknown authors"}
              accessories={[
                { text: `Saved: ${new Date(bookmark.savedAt).toLocaleDateString()}` },
                ...(bookmark.pdfLink ? [{ icon: Icon.Document, tooltip: "PDF Available" }] : []),
              ]}
              detail={
                <List.Item.Detail
                  markdown={`### ${bookmark.title}\n\n${bookmark.snippet || "No abstract available"}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Title" text={bookmark.title} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Authors" text={bookmark.authors || "Unknown"} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Published In" text={bookmark.publication || "Unknown"} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Year" text={bookmark.year || "Unknown"} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Cited By" text={bookmark.citationCount || "0"} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Saved On"
                        text={new Date(bookmark.savedAt).toLocaleString()}
                      />
                      {bookmark.link && (
                        <>
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Link
                            title="Article Link"
                            target={bookmark.link}
                            text="Open Article"
                          />
                        </>
                      )}
                      {bookmark.pdfLink && (
                        <>
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Link title="PDF Link" target={bookmark.pdfLink} text="Open PDF" />
                        </>
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    {bookmark.link && <Action.OpenInBrowser title="Open Article" url={bookmark.link} />}
                    {bookmark.pdfLink && (
                      <Action.OpenInBrowser title="Open Pdf" icon={Icon.Document} url={bookmark.pdfLink} />
                    )}
                    <Action
                      title={"Remove Bookmark"}
                      icon={Icon.StarDisabled}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      onAction={() => handleRemoveBookmark(bookmark.link)}
                    />
                  </ActionPanel.Section>
                  {bookmark.authorProfiles && bookmark.authorProfiles.length > 0 && (
                    <ActionPanel.Section title="Author Profiles">
                      {bookmark.authorProfiles.map((profile) => (
                        <Action.OpenInBrowser
                          key={profile.link}
                          title={`Open ${profile.type === "orcid" ? "ORCID" : profile.type === "scholar" ? "Scholar" : "Profile"} For ${profile.name}`}
                          url={profile.link}
                          icon={profile.type === "orcid" ? Icon.Info : Icon.Person}
                        />
                      ))}
                    </ActionPanel.Section>
                  )}
                  <ActionPanel.Section>
                    <Action.CopyToClipboard
                      title="Copy Bibtex Citation"
                      content={generateBibtex(bookmark)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                    <Action
                      title="Clear All Bookmarks"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                      onAction={handleClearAllBookmarks}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
