import { Action, ActionPanel, List, showToast, Toast, getPreferenceValues, Icon, Color } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { useWeReadBooks } from "./api/weread";
import { SyncService } from "./services/syncService";
import { WeReadBook, SyncStatus } from "./types";

interface BookSyncInfo {
  book: WeReadBook;
  syncStatus: SyncStatus;
  newHighlights: number;
  totalHighlights: number;
}

export default function SyncStatusView() {
  const preferences = getPreferenceValues<Preferences>();
  const { wereadCookie, readwiseToken } = preferences;
  const [bookSyncInfo, setBookSyncInfo] = useState<BookSyncInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: books, isLoading: isLoadingBooks } = useWeReadBooks(wereadCookie);

  useEffect(() => {
    if (books && books.length > 0) {
      loadSyncStatus();
    }
  }, [books]);

  const loadSyncStatus = async () => {
    if (!books || !wereadCookie || !readwiseToken) return;

    setIsLoading(true);
    try {
      const syncInfos: BookSyncInfo[] = [];
      const booksWithHighlights = books.filter((book) => book.noteCount > 0);

      if (booksWithHighlights.length === 0) {
        setBookSyncInfo([]);
        return;
      }

      // Use batch sync status for better performance
      const syncService = new SyncService(wereadCookie, readwiseToken);
      const bookIds = booksWithHighlights.map((book) => book.bookId).filter(Boolean);

      console.log(
        "[SyncStatus] Processing books:",
        booksWithHighlights.map((b) => ({
          bookId: b.bookId,
          title: b.title,
          author: b.author,
          noteCount: b.noteCount,
        })),
      );

      const syncStatusMap = await syncService.getBatchSyncStatus(bookIds);

      for (const book of booksWithHighlights) {
        // Validate book data before processing
        if (!book || !book.bookId) {
          console.warn("[SyncStatus] Skipping invalid book:", book);
          continue;
        }

        // Ensure book has valid title and author with proper string conversion
        const validatedBook = {
          ...book,
          title: String(book.title || `Book ${book.bookId}`).trim() || `Book ${book.bookId}`,
          author: String(book.author || "Unknown Author").trim() || "Unknown Author",
        };

        console.log("[SyncStatus] Validated book:", {
          bookId: validatedBook.bookId,
          title: validatedBook.title,
          author: validatedBook.author,
          noteCount: validatedBook.noteCount,
        });

        const syncStatus = syncStatusMap.get(book.bookId) || {
          bookId: book.bookId,
          lastSyncTime: 0,
          syncedBookmarkIds: [],
        };

        const newHighlights = Math.max(0, book.noteCount - syncStatus.syncedBookmarkIds.length);

        syncInfos.push({
          book: validatedBook,
          syncStatus,
          newHighlights,
          totalHighlights: book.noteCount,
        });
      }

      // Sort by new highlights count (descending)
      syncInfos.sort((a, b) => b.newHighlights - a.newHighlights);
      setBookSyncInfo(syncInfos);
    } catch (error) {
      console.error("Failed to load sync status:", error);
      await showFailureToast(error, { title: "Failed to Load Sync Status" });
    } finally {
      setIsLoading(false);
    }
  };

  const performFullSync = async () => {
    if (!wereadCookie || !readwiseToken) {
      await showFailureToast(new Error("Missing Credentials"), {
        title: "Please configure WeRead cookie and Readwise token in Raycast preferences",
      });
      return;
    }

    setIsSyncing(true);
    try {
      const syncService = new SyncService(wereadCookie, readwiseToken);
      await syncService.performFullSync();
      await loadSyncStatus(); // Refresh status after sync
    } catch (error) {
      console.error("Full sync failed:", error);
      await showFailureToast(error, { title: "Full Sync Failed" });
    } finally {
      setIsSyncing(false);
    }
  };

  const performIncrementalSync = async () => {
    if (!wereadCookie || !readwiseToken) {
      await showFailureToast(new Error("Missing Credentials"), {
        title: "Please configure WeRead cookie and Readwise token in Raycast preferences",
      });
      return;
    }

    setIsSyncing(true);
    try {
      const syncService = new SyncService(wereadCookie, readwiseToken);
      await syncService.performIncrementalSync();
      await loadSyncStatus(); // Refresh status after sync
    } catch (error) {
      console.error("Incremental sync failed:", error);
      await showFailureToast(error, { title: "Incremental Sync Failed" });
    } finally {
      setIsSyncing(false);
    }
  };

  const syncSingleBook = async (bookInfo: BookSyncInfo) => {
    if (!wereadCookie || !readwiseToken) {
      await showFailureToast(new Error("Missing Credentials"), {
        title: "Please configure credentials in Raycast preferences",
      });
      return;
    }

    if (bookInfo.newHighlights === 0) {
      await showToast({
        style: Toast.Style.Success,
        title: "Already Synced",
        message: `"${bookInfo.book.title}" has no new highlights to sync`,
      });
      return;
    }

    setIsSyncing(true);
    try {
      const syncService = new SyncService(wereadCookie, readwiseToken);
      await syncService.syncSingleBook(bookInfo.book, true); // true = incremental
      await loadSyncStatus(); // Refresh status after sync
    } catch (error) {
      console.error("Single book sync failed:", error);
      await showFailureToast(error, { title: "Single Book Sync Failed" });
    } finally {
      setIsSyncing(false);
    }
  };

  const resetAllSyncStatuses = async () => {
    if (!wereadCookie || !readwiseToken) {
      await showFailureToast(new Error("Missing Credentials"), {
        title: "Please configure credentials in Raycast preferences",
      });
      return;
    }

    try {
      const syncService = new SyncService(wereadCookie, readwiseToken);
      await syncService.resetAllSyncStatuses();
      await loadSyncStatus(); // Refresh status after reset
    } catch (error) {
      console.error("Failed to reset sync statuses:", error);
      await showFailureToast(error, { title: "Failed to Reset Sync Status" });
    }
  };

  const formatDate = (timestamp: number) => {
    if (timestamp === 0) return "Never";
    return new Date(timestamp).toLocaleString();
  };

  const getSyncStatusIcon = (bookInfo: BookSyncInfo) => {
    if (bookInfo.newHighlights === 0) {
      return { source: Icon.Checkmark, tintColor: Color.Green };
    } else if (bookInfo.syncStatus.lastSyncTime > 0) {
      return { source: Icon.Clock, tintColor: Color.Orange };
    } else {
      return { source: Icon.ExclamationMark, tintColor: Color.Red };
    }
  };

  const totalBooks = bookSyncInfo.length;
  const booksWithNewHighlights = bookSyncInfo.filter((info) => info.newHighlights > 0).length;
  const totalNewHighlights = bookSyncInfo.reduce((sum, info) => sum + info.newHighlights, 0);

  return (
    <List
      isLoading={isLoadingBooks || isLoading || isSyncing}
      navigationTitle="Sync Status"
      searchBarPlaceholder="Search books by sync status..."
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Sync Operations">
            <Action
              title={`Incremental Sync (${totalNewHighlights} New)`}
              onAction={performIncrementalSync}
              icon={Icon.Upload}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
            />
            <Action
              title="Full Sync"
              onAction={performFullSync}
              icon={Icon.Cloud}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Management">
            <Action
              title="Refresh Status"
              onAction={loadSyncStatus}
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action
              title="Reset All Sync Status"
              onAction={resetAllSyncStatuses}
              icon={Icon.Trash}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <List.Section title={`Sync Overview (${totalBooks} books, ${booksWithNewHighlights} have new highlights)`}>
        <List.Item
          title="Overall Sync Status"
          subtitle={`${totalNewHighlights} new highlights ready to sync`}
          accessories={[{ text: totalNewHighlights === 0 ? "All Synced" : `${totalNewHighlights} New` }]}
          icon={
            totalNewHighlights === 0
              ? { source: Icon.Checkmark, tintColor: Color.Green }
              : { source: Icon.Upload, tintColor: Color.Blue }
          }
        />
      </List.Section>

      <List.Section title="Books">
        {bookSyncInfo
          .filter((bookInfo) => {
            // Additional safety check before rendering
            const isValid = bookInfo && bookInfo.book && bookInfo.book.bookId && bookInfo.book.title;
            if (!isValid) {
              console.warn("[SyncStatus] Filtering out invalid book info:", bookInfo);
            }
            return isValid;
          })
          .map((bookInfo) => (
            <List.Item
              key={bookInfo.book.bookId}
              title={String(bookInfo.book.title || "Unknown Title")}
              subtitle={String(bookInfo.book.author || "Unknown Author")}
              accessories={[
                { text: `${bookInfo.newHighlights}/${bookInfo.totalHighlights}` },
                { text: formatDate(bookInfo.syncStatus.lastSyncTime) },
              ]}
              icon={getSyncStatusIcon(bookInfo)}
              detail={
                <List.Item.Detail
                  markdown={`# ${bookInfo.book.title || "Unknown Title"}

**Author:** ${bookInfo.book.author || "Unknown Author"}
**Total Highlights:** ${bookInfo.totalHighlights}
**Synced Highlights:** ${bookInfo.syncStatus.syncedBookmarkIds.length}
**New Highlights:** ${bookInfo.newHighlights}
**Last Sync:** ${formatDate(bookInfo.syncStatus.lastSyncTime)}

${
  bookInfo.newHighlights > 0
    ? `✅ **${bookInfo.newHighlights} new highlights** ready to sync`
    : `🔄 **All highlights synced** - up to date`
}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Book ID" text={bookInfo.book.bookId} />
                      <List.Item.Detail.Metadata.Label
                        title="Total Highlights"
                        text={String(bookInfo.totalHighlights)}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Synced"
                        text={String(bookInfo.syncStatus.syncedBookmarkIds.length)}
                      />
                      <List.Item.Detail.Metadata.Label title="New" text={String(bookInfo.newHighlights)} />
                      <List.Item.Detail.Metadata.Label
                        title="Last Sync"
                        text={formatDate(bookInfo.syncStatus.lastSyncTime)}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Status"
                        text={bookInfo.newHighlights === 0 ? "Up to date" : "Has new highlights"}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title={
                      bookInfo.newHighlights > 0 ? `Sync ${bookInfo.newHighlights} New Highlights` : "Already Synced"
                    }
                    onAction={() => syncSingleBook(bookInfo)}
                    icon={bookInfo.newHighlights > 0 ? Icon.Upload : Icon.Checkmark}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                  />

                  <ActionPanel.Section title="Batch Operations">
                    <Action
                      title={`Incremental Sync (${totalNewHighlights} New)`}
                      onAction={performIncrementalSync}
                      icon={Icon.Upload}
                      shortcut={{ modifiers: ["cmd"], key: "i" }}
                    />
                    <Action
                      title="Full Sync"
                      onAction={performFullSync}
                      icon={Icon.Cloud}
                      shortcut={{ modifiers: ["cmd"], key: "f" }}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Management">
                    <Action
                      title="Refresh Status"
                      onAction={loadSyncStatus}
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}
