import { getLocalStorageItem, setLocalStorageItem, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { WeReadAPI } from "../api/weread";
import { ReadwiseAPI } from "../api/readwise";
import { WeReadBook, WeReadBookmark, SyncStatus, ReadwiseHighlight } from "../types";

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedBooks: string[];
  errors: string[];
}

export interface BookSyncResult {
  bookId: string;
  bookTitle: string;
  syncedHighlights: number;
  success: boolean;
  error?: string;
}

export class SyncService {
  private wereadApi: WeReadAPI;
  private readwiseApi: ReadwiseAPI;
  private syncStatusCache: Map<string, { status: SyncStatus; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30 * 1000; // 30 seconds cache

  constructor(wereadCookie: string, readwiseToken: string) {
    this.wereadApi = new WeReadAPI(wereadCookie);
    this.readwiseApi = new ReadwiseAPI(readwiseToken);
  }

  /**
   * Perform full sync - sync all highlights from all books, ignoring sync status
   */
  async performFullSync(): Promise<SyncResult> {
    console.log("[SyncService] Starting full sync...");

    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedBooks: [],
      errors: [],
    };

    try {
      // Get all books
      const books = await this.wereadApi.getNotebooks();
      console.log(`[SyncService] Found ${books.length} books to sync`);

      await showToast({
        style: Toast.Style.Animated,
        title: "Full Sync Started",
        message: `Syncing ${books.length} books...`,
      });

      const bookResults: BookSyncResult[] = [];

      for (const book of books) {
        if (book.noteCount === 0) {
          console.log(`[SyncService] Skipping "${book.title}" - no highlights`);
          continue;
        }

        const bookResult = await this.syncSingleBook(book, false); // false = ignore sync status
        bookResults.push(bookResult);

        if (bookResult.success) {
          result.syncedCount += bookResult.syncedHighlights;
        } else {
          result.failedBooks.push(book.title);
          if (bookResult.error) {
            result.errors.push(`${book.title}: ${bookResult.error}`);
          }
        }
      }

      // Update overall result
      result.success = result.failedBooks.length === 0;

      // Show completion toast
      if (result.success) {
        await showToast({
          style: Toast.Style.Success,
          title: "Full Sync Complete",
          message: `Successfully synced ${result.syncedCount} highlights from ${bookResults.length} books`,
        });
      } else {
        await showFailureToast(new Error("Full Sync Completed with Errors"), {
          title: `Synced ${result.syncedCount} highlights, ${result.failedBooks.length} books failed`,
        });
      }

      console.log("[SyncService] Full sync completed:", result);
      return result;
    } catch (error) {
      console.error("[SyncService] Full sync failed:", error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : String(error));

      await showFailureToast(new Error("Full Sync Failed"), { title: "Failed to complete full sync operation" });

      return result;
    }
  }

  /**
   * Perform incremental sync - sync only new highlights since last sync
   */
  async performIncrementalSync(): Promise<SyncResult> {
    console.log("[SyncService] Starting incremental sync...");

    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedBooks: [],
      errors: [],
    };

    try {
      // Get all books
      const books = await this.wereadApi.getNotebooks();
      console.log(`[SyncService] Checking ${books.length} books for new highlights`);

      await showToast({
        style: Toast.Style.Animated,
        title: "Incremental Sync Started",
        message: "Checking for new highlights...",
      });

      // Pre-filter books that might have new highlights
      const booksToCheck: WeReadBook[] = [];
      for (const book of books) {
        if (book.noteCount === 0) continue;

        // Quick check: compare book note count with sync status
        const syncStatus = await this.getSyncStatus(book.bookId);
        const potentialNewHighlights = book.noteCount - syncStatus.syncedBookmarkIds.length;

        if (potentialNewHighlights > 0) {
          booksToCheck.push(book);
        }
      }

      console.log(`[SyncService] Found ${booksToCheck.length} books that might have new highlights`);

      if (booksToCheck.length === 0) {
        await showToast({
          style: Toast.Style.Success,
          title: "No New Highlights",
          message: "All highlights are already synced to Readwise",
        });
        return result;
      }

      const bookResults: BookSyncResult[] = [];

      for (const book of booksToCheck) {
        const bookResult = await this.syncSingleBook(book, true); // true = respect sync status
        bookResults.push(bookResult);

        if (bookResult.success) {
          result.syncedCount += bookResult.syncedHighlights;
        } else {
          result.failedBooks.push(book.title);
          if (bookResult.error) {
            result.errors.push(`${book.title}: ${bookResult.error}`);
          }
        }
      }

      // Update overall result
      result.success = result.failedBooks.length === 0;

      // Show completion toast
      if (result.syncedCount === 0) {
        await showToast({
          style: Toast.Style.Success,
          title: "No New Highlights",
          message: "All highlights are already synced to Readwise",
        });
      } else if (result.success) {
        await showToast({
          style: Toast.Style.Success,
          title: "Incremental Sync Complete",
          message: `Synced ${result.syncedCount} new highlights`,
        });
      } else {
        await showFailureToast(new Error("Incremental Sync Completed with Errors"), {
          title: `Synced ${result.syncedCount} highlights, ${result.failedBooks.length} books failed`,
        });
      }

      console.log("[SyncService] Incremental sync completed:", result);
      return result;
    } catch (error) {
      console.error("[SyncService] Incremental sync failed:", error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : String(error));

      await showFailureToast(new Error("Incremental Sync Failed"), {
        title: "Failed to complete incremental sync operation",
      });

      return result;
    }
  }

  /**
   * Sync a single book's highlights
   */
  async syncSingleBook(book: WeReadBook, respectSyncStatus: boolean): Promise<BookSyncResult> {
    const result: BookSyncResult = {
      bookId: book.bookId,
      bookTitle: book.title,
      syncedHighlights: 0,
      success: false,
    };

    try {
      console.log(`[SyncService] Syncing book: "${book.title}"`);

      // Get book data
      const bookData = await this.wereadApi.getBookData(book.bookId);

      if (!bookData.bookmarks || bookData.bookmarks.length === 0) {
        console.log(`[SyncService] No bookmarks found for "${book.title}"`);
        result.success = true;
        return result;
      }

      let bookmarksToSync = bookData.bookmarks;

      // If respecting sync status, filter out already synced highlights
      if (respectSyncStatus) {
        const syncStatus = await this.getSyncStatus(book.bookId);
        bookmarksToSync = bookData.bookmarks.filter(
          (bookmark) => !syncStatus.syncedBookmarkIds.includes(bookmark.bookmarkId),
        );

        if (bookmarksToSync.length === 0) {
          console.log(`[SyncService] No new highlights for "${book.title}"`);
          result.success = true;
          return result;
        }
      }

      // Convert to Readwise format
      const highlights = bookmarksToSync.map((bookmark) => {
        const thought = bookData.thoughts.find((t) => t.chapterUid === bookmark.chapterUid);

        const cleanHighlight: ReadwiseHighlight = {
          text: String(bookmark.markText || ""),
          title: String(book.title || ""),
          author: String(book.author || ""),
          highlighted_at: new Date(bookmark.createTime * 1000).toISOString(),
          location_type: "order",
        };

        if (thought?.content) {
          cleanHighlight.note = String(thought.content);
        }

        if (bookmark.chapterIdx !== undefined && bookmark.chapterIdx !== null) {
          cleanHighlight.location = Number(bookmark.chapterIdx);
        }

        return cleanHighlight;
      });

      // Sync to Readwise
      await this.readwiseApi.createHighlights(highlights);

      // Update sync status
      await this.updateSyncStatus(book.bookId, bookmarksToSync);

      result.syncedHighlights = bookmarksToSync.length;
      result.success = true;

      console.log(`[SyncService] Successfully synced ${bookmarksToSync.length} highlights from "${book.title}"`);
      return result;
    } catch (error) {
      console.error(`[SyncService] Failed to sync book "${book.title}":`, error);
      result.error = error instanceof Error ? error.message : String(error);
      return result;
    }
  }

  /**
   * Get sync status for a book (with caching)
   */
  private async getSyncStatus(bookId: string): Promise<SyncStatus> {
    const now = Date.now();
    const cached = this.syncStatusCache.get(bookId);

    // Return cached result if still valid
    if (cached && now - cached.timestamp < this.CACHE_TTL) {
      return cached.status;
    }

    try {
      const statusJson = await getLocalStorageItem<string>(`syncStatus_${bookId}`);
      let status: SyncStatus;

      if (statusJson) {
        status = JSON.parse(statusJson);
      } else {
        status = {
          bookId: String(bookId),
          lastSyncTime: 0,
          syncedBookmarkIds: [],
        };
      }

      // Cache the result
      this.syncStatusCache.set(bookId, { status, timestamp: now });
      return status;
    } catch (error) {
      console.error(`[SyncService] Failed to get sync status for ${bookId}:`, error);

      const defaultStatus = {
        bookId: String(bookId),
        lastSyncTime: 0,
        syncedBookmarkIds: [],
      };

      // Cache even the default status to avoid repeated failures
      this.syncStatusCache.set(bookId, { status: defaultStatus, timestamp: now });
      return defaultStatus;
    }
  }

  /**
   * Batch get sync status for multiple books (performance optimization)
   */
  async getBatchSyncStatus(bookIds: string[]): Promise<Map<string, SyncStatus>> {
    const statusMap = new Map<string, SyncStatus>();

    // Use Promise.all to fetch all statuses concurrently
    const promises = bookIds.map(async (bookId) => {
      const status = await this.getSyncStatus(bookId);
      return { bookId, status };
    });

    const results = await Promise.all(promises);

    results.forEach(({ bookId, status }) => {
      statusMap.set(bookId, status);
    });

    return statusMap;
  }

  /**
   * Update sync status after successful sync
   */
  private async updateSyncStatus(bookId: string, syncedBookmarks: WeReadBookmark[]): Promise<void> {
    try {
      const currentStatus = await this.getSyncStatus(bookId);
      const newSyncedIds = syncedBookmarks.map((b) => String(b.bookmarkId));

      const newSyncStatus = {
        bookId: String(bookId),
        lastSyncTime: Date.now(),
        syncedBookmarkIds: [...currentStatus.syncedBookmarkIds, ...newSyncedIds],
      };

      await setLocalStorageItem(`syncStatus_${bookId}`, JSON.stringify(newSyncStatus));

      // Clear cache for this book to force refresh
      this.syncStatusCache.delete(bookId);

      console.log(`[SyncService] Updated sync status for book ${bookId}`);
    } catch (error) {
      console.error(`[SyncService] Failed to update sync status for ${bookId}:`, error);
    }
  }

  /**
   * Reset sync status for a book (for testing or re-sync purposes)
   */
  async resetSyncStatus(bookId: string): Promise<void> {
    try {
      const resetStatus = {
        bookId: String(bookId),
        lastSyncTime: 0,
        syncedBookmarkIds: [],
      };

      await setLocalStorageItem(`syncStatus_${bookId}`, JSON.stringify(resetStatus));

      // Clear cache for this book
      this.syncStatusCache.delete(bookId);

      console.log(`[SyncService] Reset sync status for book ${bookId}`);
    } catch (error) {
      console.error(`[SyncService] Failed to reset sync status for ${bookId}:`, error);
    }
  }

  /**
   * Reset all sync statuses (for complete re-sync)
   */
  async resetAllSyncStatuses(): Promise<void> {
    try {
      const books = await this.wereadApi.getNotebooks();
      for (const book of books) {
        await this.resetSyncStatus(book.bookId);
      }

      // Clear entire cache
      this.syncStatusCache.clear();

      console.log("[SyncService] Reset all sync statuses");
    } catch (error) {
      console.error("[SyncService] Failed to reset all sync statuses:", error);
    }
  }
}
