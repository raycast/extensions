import { Action, ActionPanel, List, showToast, Toast, getPreferenceValues, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { useWeReadBooks } from "./api/weread";
import { WeReadBook } from "./types";
import BookDetail from "./book-detail";
import { AutoSyncService } from "./services/autoSync";
import { SyncService } from "./services/syncService";
import SyncStatusView from "./sync-status";

export default function WeReadSync() {
  const preferences = getPreferenceValues<Preferences>();
  const { wereadCookie, readwiseToken, autoSyncEnabled } = preferences;
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoSyncStatus, setAutoSyncStatus] = useState<{
    isRunning: boolean;
    lastSync: string;
  }>({ isRunning: false, lastSync: "Never" });

  useEffect(() => {
    async function initializeAutoSync() {
      try {
        // Check auto-sync status
        const autoSyncService = AutoSyncService.getInstance();
        const isRunning = autoSyncService.isAutoSyncRunning();
        const lastSync = await autoSyncService.getLastSyncTime();

        setAutoSyncStatus({ isRunning, lastSync });

        // Check and start auto-sync if enabled, and trigger sync if needed
        if (autoSyncEnabled && !isRunning) {
          await autoSyncService.startAutoSync();
          setAutoSyncStatus({
            isRunning: autoSyncService.isAutoSyncRunning(),
            lastSync: await autoSyncService.getLastSyncTime(),
          });
        } else if (autoSyncEnabled && isRunning) {
          // If auto-sync is already running, check if we need to sync
          await autoSyncService.checkAndSyncIfNeeded();
        }
      } catch (error) {
        console.error("Failed to initialize auto-sync:", error);
        await showFailureToast(error, { title: "Failed to Initialize Auto-Sync" });
      }
    }
    initializeAutoSync();
  }, [autoSyncEnabled]);

  const { data: books, isLoading, error, revalidate } = useWeReadBooks(wereadCookie);

  useEffect(() => {
    if (error) {
      showFailureToast(error, {
        title: error.message.includes("cookie")
          ? "Please configure WeRead cookie in Raycast preferences"
          : "Check your internet connection and try again",
      });
    }
  }, [error]);

  if (!wereadCookie) {
    return (
      <List>
        <List.EmptyView
          title="Authentication Required"
          description="Please configure your WeRead cookie and Readwise token in Raycast preferences (⌘,) to view your books"
        />
      </List>
    );
  }

  const toggleAutoSync = async () => {
    const autoSyncService = AutoSyncService.getInstance();

    if (autoSyncStatus.isRunning) {
      await autoSyncService.stopAutoSync();
    } else {
      await autoSyncService.startAutoSync();
    }

    setAutoSyncStatus({
      isRunning: autoSyncService.isAutoSyncRunning(),
      lastSync: await autoSyncService.getLastSyncTime(),
    });
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
      await revalidate(); // Refresh book list
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
      await revalidate(); // Refresh book list
    } catch (error) {
      console.error("Incremental sync failed:", error);
      await showFailureToast(error, { title: "Incremental Sync Failed" });
    } finally {
      setIsSyncing(false);
    }
  };

  const resetAllSyncStatuses = async () => {
    if (!wereadCookie || !readwiseToken) {
      await showFailureToast(new Error("Missing Credentials"), {
        title: "Please configure WeRead cookie and Readwise token in Raycast preferences",
      });
      return;
    }

    try {
      const syncService = new SyncService(wereadCookie, readwiseToken);
      await syncService.resetAllSyncStatuses();
      await showToast({
        style: Toast.Style.Success,
        title: "Sync Status Reset",
        message: "All sync statuses have been reset. Next sync will be a full sync.",
      });
    } catch (error) {
      console.error("Failed to reset sync statuses:", error);
      await showFailureToast(new Error("Reset Failed"), { title: "Failed to reset sync statuses" });
    }
  };

  return (
    <List
      isLoading={isLoading || isSyncing}
      searchBarPlaceholder="Search your WeRead books..."
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Sync Operations">
            <Action
              title="Incremental Sync"
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

          <ActionPanel.Section title="Auto-sync">
            <Action
              title={autoSyncStatus.isRunning ? "Stop Auto-Sync" : "Start Auto-Sync"}
              onAction={toggleAutoSync}
              icon={autoSyncStatus.isRunning ? Icon.Stop : Icon.Play}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Management">
            <Action.Push
              title="Sync Status"
              target={<SyncStatusView />}
              icon={Icon.BarChart}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
            <Action title="Refresh Books" onAction={revalidate} icon={Icon.ArrowClockwise} />
            <Action
              title="Reset Sync Status"
              onAction={resetAllSyncStatuses}
              icon={Icon.Trash}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {autoSyncStatus.isRunning && (
        <List.Section title="Auto-sync Status">
          <List.Item
            title="Auto-sync Active"
            subtitle={`Last sync: ${autoSyncStatus.lastSync}`}
            icon={{ source: Icon.CheckCircle, tintColor: "#00D084" }}
          />
        </List.Section>
      )}

      {!books || books.length === 0 ? (
        <List.EmptyView
          title={error ? "Failed to Load Books" : "No Books Found"}
          description={
            error
              ? "There was an error loading your books. Please check your WeRead cookie."
              : "No books with highlights found in your WeRead library."
          }
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={revalidate} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      ) : (
        books
          .filter((book: WeReadBook) => {
            const isValid = book && book.bookId && book.title;
            if (!isValid) {
              console.error("Invalid book in render:", book);
            }
            return isValid;
          })
          .map((book: WeReadBook) => (
            <List.Item
              key={book.bookId}
              title={book.title || "Unknown Title"}
              subtitle={book.author || "Unknown Author"}
              accessories={[{ text: `${book.noteCount || 0} notes` }]}
              icon={book.cover || Icon.Book}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Highlights"
                    target={<BookDetail bookId={book.bookId} book={book} />}
                    icon={Icon.Eye}
                  />

                  <ActionPanel.Section title="Sync Operations">
                    <Action
                      title="Incremental Sync"
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

                  <ActionPanel.Section title="Auto-sync">
                    <Action
                      title={autoSyncStatus.isRunning ? "Stop Auto-Sync" : "Start Auto-Sync"}
                      onAction={toggleAutoSync}
                      icon={autoSyncStatus.isRunning ? Icon.Stop : Icon.Play}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Management">
                    <Action.Push
                      title="Sync Status"
                      target={<SyncStatusView />}
                      icon={Icon.BarChart}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                    />
                    <Action
                      title="Refresh Books"
                      onAction={revalidate}
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                    <Action
                      title="Reset Sync Status"
                      onAction={resetAllSyncStatuses}
                      icon={Icon.Trash}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))
      )}
    </List>
  );
}
