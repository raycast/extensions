import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  getLocalStorageItem,
  setLocalStorageItem,
  getPreferenceValues,
  Icon,
  Color,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { useWeReadBookData } from "./api/weread";
import { ReadwiseAPI } from "./api/readwise";
import { WeReadBook, WeReadBookmark, WeReadThought, ReadwiseHighlight, SyncStatus } from "./types";

interface BookDetailProps {
  bookId: string;
  book: WeReadBook;
}

export default function BookDetail({ bookId, book }: BookDetailProps) {
  const preferences = getPreferenceValues<Preferences>();
  const { wereadCookie, readwiseToken } = preferences;
  const [syncStatus, setSyncStatus] = useState<SyncStatus>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadSyncStatus() {
      try {
        const statusJson = await getLocalStorageItem<string>(`syncStatus_${bookId}`);

        // Parse JSON string back to object
        let status: SyncStatus;
        if (statusJson) {
          try {
            status = JSON.parse(statusJson);
          } catch (parseError) {
            console.error("Failed to parse sync status:", parseError);
            status = { bookId, lastSyncTime: 0, syncedBookmarkIds: [] };
          }
        } else {
          status = { bookId, lastSyncTime: 0, syncedBookmarkIds: [] };
        }

        setSyncStatus(status);
      } catch (error) {
        console.error("Failed to load sync status:", error);
      }
    }
    loadSyncStatus();
  }, [bookId]);

  const { data: bookData, isLoading: isLoadingData, error, revalidate } = useWeReadBookData(bookId, wereadCookie);

  // Debug logging when bookData changes
  useEffect(() => {
    if (bookData) {
      console.log("[BookDetail] BookData loaded for book:", {
        bookId: bookId,
        bookTitle: book.title,
        totalBookmarks: bookData.bookmarks?.length || 0,
        totalThoughts: bookData.thoughts?.length || 0,
        sampleBookmarks: bookData.bookmarks?.slice(0, 3).map((b) => ({
          bookmarkId: b.bookmarkId,
          markText: b.markText?.substring(0, 50) + "...",
          chapterTitle: b.chapterTitle,
          hasMarkText: !!b.markText,
        })),
      });

      // Check for any bookmarks with missing markText
      const invalidBookmarks = bookData.bookmarks?.filter((b) => !b.markText) || [];
      if (invalidBookmarks.length > 0) {
        console.error("[BookDetail] Found bookmarks with missing markText:", invalidBookmarks);
      }
    }
  }, [bookData]);

  const syncToReadwise = async () => {
    if (!readwiseToken || !bookData) {
      await showFailureToast(new Error("Sync Failed"), { title: "Missing Readwise token or book data" });
      return;
    }

    setIsLoading(true);

    try {
      const readwiseApi = new ReadwiseAPI(readwiseToken);

      // Filter out already synced bookmarks
      const newBookmarks = bookData.bookmarks.filter(
        (bookmark) => !syncStatus?.syncedBookmarkIds.includes(bookmark.bookmarkId),
      );

      if (newBookmarks.length === 0) {
        await showToast({
          style: Toast.Style.Success,
          title: "Already Synced",
          message: "All highlights are already synced to Readwise",
        });
        return;
      }

      // Convert to Readwise format
      const highlights: ReadwiseHighlight[] = newBookmarks.map((bookmark) => {
        // Find corresponding thought/review for this bookmark
        const thought = bookData.thoughts.find((t) => t.chapterUid === bookmark.chapterUid);

        console.log(`[Sync] Processing bookmark:`, {
          bookmarkId: bookmark.bookmarkId,
          markText: bookmark.markText?.substring(0, 50),
          chapterIdx: bookmark.chapterIdx,
          chapterTitle: bookmark.chapterTitle,
          createTime: bookmark.createTime,
        });

        // Create clean highlight object with no circular references
        const cleanHighlight: ReadwiseHighlight = {
          text: String(bookmark.markText || ""),
          title: String(book.title || ""),
          author: String(book.author || ""),
          highlighted_at: new Date(bookmark.createTime * 1000).toISOString(),
          location_type: "order",
        };

        // Only add note if it exists
        if (thought?.content) {
          cleanHighlight.note = String(thought.content);
        }

        // Only add location if it's a valid number
        if (bookmark.chapterIdx !== undefined && bookmark.chapterIdx !== null) {
          cleanHighlight.location = Number(bookmark.chapterIdx);
        }

        return cleanHighlight;
      });

      await readwiseApi.createHighlights(highlights);

      // Update sync status with clean data - use JSON serialization to avoid Raycast issues
      const syncedIds = syncStatus?.syncedBookmarkIds || [];
      const newIds = newBookmarks.map((b) => String(b.bookmarkId));

      const newSyncStatus = {
        bookId: String(bookId),
        lastSyncTime: Date.now(),
        syncedBookmarkIds: [...syncedIds, ...newIds],
      };

      console.log("[Sync] Saving sync status:", newSyncStatus);

      try {
        // Serialize manually to avoid Raycast serialization issues
        const statusJson = JSON.stringify(newSyncStatus);
        await setLocalStorageItem(`syncStatus_${bookId}`, statusJson);
        setSyncStatus(newSyncStatus);
        console.log("[Sync] Sync status saved successfully");
      } catch (storageError) {
        console.error("[Sync] Failed to save sync status:", storageError);
        // Don't fail the whole sync if storage fails
      }
    } catch (error) {
      console.error("Sync failed:", error);
      await showFailureToast(error, { title: "Sync Failed" });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getHighlightIcon = (bookmarkId: string) => {
    const isSynced = syncStatus?.syncedBookmarkIds.includes(bookmarkId);
    return isSynced ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.Bookmark;
  };

  if (error) {
    return (
      <List>
        <List.EmptyView
          title="Failed to Load Book Data"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={revalidate} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const totalHighlights = bookData?.bookmarks.length || 0;
  const syncedCount = syncStatus?.syncedBookmarkIds.length || 0;
  const newCount = totalHighlights - syncedCount;

  return (
    <List
      isLoading={isLoadingData || isLoading}
      navigationTitle={`${book.title} - Highlights`}
      searchBarPlaceholder="Search highlights..."
      actions={
        <ActionPanel>
          <Action
            title={`Sync ${newCount} New Highlights`}
            onAction={syncToReadwise}
            icon={Icon.Upload}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
          <Action
            title="Refresh"
            onAction={revalidate}
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      {!bookData ? (
        <List.EmptyView title="Loading book data..." />
      ) : (
        <>
          <List.Section title={`Highlights (${totalHighlights} total, ${syncedCount} synced)`}>
            {bookData.bookmarks
              .filter((bookmark: WeReadBookmark) => {
                // Validate bookmark data before rendering
                const isValid = bookmark && bookmark.bookmarkId && bookmark.markText;
                if (!isValid) {
                  console.error("[BookDetail] Invalid bookmark found:", {
                    bookId: bookId,
                    bookTitle: book.title,
                    bookmark: bookmark,
                    bookmarkId: bookmark?.bookmarkId,
                    markText: bookmark?.markText,
                    chapterTitle: bookmark?.chapterTitle,
                    createTime: bookmark?.createTime,
                  });
                }
                return isValid;
              })
              .map((bookmark: WeReadBookmark) => {
                const thought = bookData.thoughts.find((t) => t.chapterUid === bookmark.chapterUid);
                const isSynced = syncStatus?.syncedBookmarkIds.includes(bookmark.bookmarkId);

                // Additional safety checks for title and subtitle
                const safeTitle = String(bookmark.markText || "Empty highlight").trim() || "Empty highlight";
                const safeSubtitle = String(bookmark.chapterTitle || "Unknown chapter").trim() || "Unknown chapter";

                console.log("[BookDetail] Rendering bookmark:", {
                  bookmarkId: bookmark.bookmarkId,
                  title: safeTitle.substring(0, 50) + "...",
                  subtitle: safeSubtitle,
                  isSynced: isSynced,
                });

                return (
                  <List.Item
                    key={bookmark.bookmarkId}
                    title={safeTitle}
                    subtitle={safeSubtitle}
                    accessories={[
                      { text: formatDate(bookmark.createTime) },
                      ...(isSynced
                        ? [{ text: "Synced", icon: { source: Icon.Checkmark, tintColor: Color.Green } }]
                        : []),
                    ]}
                    icon={getHighlightIcon(bookmark.bookmarkId)}
                    detail={
                      <List.Item.Detail
                        markdown={`## ${safeSubtitle}\n\n> ${safeTitle}\n\n${thought ? `**Note:** ${String(thought.content || "").trim()}` : ""}`}
                        metadata={
                          <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.Label title="Chapter" text={safeSubtitle} />
                            <List.Item.Detail.Metadata.Label title="Date" text={formatDate(bookmark.createTime)} />
                            <List.Item.Detail.Metadata.Label title="Status" text={isSynced ? "Synced" : "Not synced"} />
                            {thought && (
                              <List.Item.Detail.Metadata.Label
                                title="Note"
                                text={String(thought.content || "").trim() || "No content"}
                              />
                            )}
                          </List.Item.Detail.Metadata>
                        }
                      />
                    }
                    actions={
                      <ActionPanel>
                        <Action
                          title={isSynced ? "Already Synced" : "Sync This Highlight"}
                          onAction={async () => {
                            if (isSynced) {
                              await showToast({
                                style: Toast.Style.Success,
                                title: "Already Synced",
                                message: "This highlight is already in Readwise",
                              });
                              return;
                            }

                            if (!readwiseToken) {
                              await showFailureToast(new Error("Missing Token"), {
                                title: "Please configure Readwise token in Settings",
                              });
                              return;
                            }

                            try {
                              const readwiseApi = new ReadwiseAPI(readwiseToken);

                              console.log(`[Single Sync] Processing bookmark:`, {
                                bookmarkId: bookmark.bookmarkId,
                                markText: bookmark.markText?.substring(0, 50),
                                chapterIdx: bookmark.chapterIdx,
                                chapterTitle: bookmark.chapterTitle,
                                createTime: bookmark.createTime,
                              });

                              // Create clean highlight object with no circular references
                              const highlight: ReadwiseHighlight = {
                                text: String(bookmark.markText || ""),
                                title: String(book.title || ""),
                                author: String(book.author || ""),
                                highlighted_at: new Date(bookmark.createTime * 1000).toISOString(),
                                location_type: "order",
                              };

                              // Only add note if it exists
                              if (thought?.content) {
                                highlight.note = String(thought.content);
                              }

                              // Only add location if it's a valid number
                              if (bookmark.chapterIdx !== undefined && bookmark.chapterIdx !== null) {
                                highlight.location = Number(bookmark.chapterIdx);
                              }

                              console.log(`[Single Sync] Highlight to send:`, highlight);

                              await readwiseApi.createHighlights([highlight]);

                              // Update sync status with clean data - use JSON serialization to avoid Raycast issues
                              const syncedIds = syncStatus?.syncedBookmarkIds || [];
                              const newSyncStatus = {
                                bookId: String(bookId),
                                lastSyncTime: Date.now(),
                                syncedBookmarkIds: [...syncedIds, String(bookmark.bookmarkId)],
                              };

                              console.log("[Single Sync] Saving sync status:", newSyncStatus);

                              try {
                                // Serialize manually to avoid Raycast serialization issues
                                const statusJson = JSON.stringify(newSyncStatus);
                                await setLocalStorageItem(`syncStatus_${bookId}`, statusJson);
                                setSyncStatus(newSyncStatus);
                                console.log("[Single Sync] Sync status saved successfully");
                              } catch (storageError) {
                                console.error("[Single Sync] Failed to save sync status:", storageError);
                                // Don't fail the whole sync if storage fails
                              }
                            } catch (error) {
                              console.error("Single highlight sync failed:", error);
                              await showFailureToast(error, { title: "Highlight Sync Failed" });
                            }
                          }}
                          icon={isSynced ? Icon.Checkmark : Icon.Upload}
                        />
                        {newCount > 0 && (
                          <Action
                            title={`Sync All ${newCount} New Highlights`}
                            onAction={syncToReadwise}
                            icon={Icon.Upload}
                            shortcut={{ modifiers: ["cmd"], key: "s" }}
                          />
                        )}
                        <Action
                          title="Refresh"
                          onAction={revalidate}
                          icon={Icon.ArrowClockwise}
                          shortcut={{ modifiers: ["cmd"], key: "r" }}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
          </List.Section>

          {bookData.thoughts.length > 0 && (
            <List.Section title={`Thoughts (${bookData.thoughts.length})`}>
              {bookData.thoughts
                .filter((thought: WeReadThought) => {
                  // Validate thought data before rendering
                  const isValid = thought && thought.reviewId && thought.content;
                  if (!isValid) {
                    console.error("[BookDetail] Invalid thought found:", {
                      bookId: bookId,
                      bookTitle: book.title,
                      thought: thought,
                      reviewId: thought?.reviewId,
                      content: thought?.content,
                      chapterTitle: thought?.chapterTitle,
                      createTime: thought?.createTime,
                    });
                  }
                  return isValid;
                })
                .map((thought: WeReadThought) => {
                  // Additional safety checks for title and subtitle
                  const safeTitle = String(thought.content || "Empty thought").trim() || "Empty thought";
                  const safeSubtitle = String(thought.chapterTitle || "Unknown chapter").trim() || "Unknown chapter";

                  console.log("[BookDetail] Rendering thought:", {
                    reviewId: thought.reviewId,
                    title: safeTitle.substring(0, 50) + "...",
                    subtitle: safeSubtitle,
                  });

                  return (
                    <List.Item
                      key={thought.reviewId}
                      title={safeTitle}
                      subtitle={safeSubtitle}
                      accessories={[{ text: formatDate(thought.createTime) }]}
                      icon={Icon.SpeechBubble}
                      detail={
                        <List.Item.Detail
                          markdown={`## ${safeSubtitle}\n\n**Thought:** ${safeTitle}\n\n**Context:** ${String(thought.abstract || "").trim() || "No context"}`}
                        />
                      }
                    />
                  );
                })}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
