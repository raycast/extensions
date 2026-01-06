import {
  ActionPanel,
  Action,
  List,
  useNavigation,
  Clipboard,
  showToast,
  Toast,
  open,
  Icon,
  getPreferenceValues,
  confirmAlert,
  Alert,
  Color,
  closeMainWindow,
  openCommandPreferences,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useState, useMemo, useRef } from "react";
import {
  fetchSnippets,
  fetchDatabases,
  updateSnippetUsage,
  fetchSnippetContent,
  snippetIndexToSnippet,
  searchNotionSnippets,
  deleteSnippet,
} from "./api/notion";
import {
  Snippet,
  SnippetIndex,
  Preferences,
  DatabaseMetadata,
} from "./types/index";
import {
  parsePlaceholders,
  processOfficialPlaceholders,
} from "./utils/placeholder";
import SnippetForm from "./components/SnippetForm";
import FillerForm from "./components/FillerForm";
import fs from "fs";
import os from "os";
import path from "path";
import { exec } from "child_process";

// Helper to highlight content
const highlightContent = (
  content: string,
  query: string,
  previewUrl?: string,
) => {
  if (!content) return "";

  // 1. Highlight placeholders first
  let processed = content.replace(/(\{?\{{1,2}.*?\}{1,2}\}?)/g, "**`$1`**");

  // 2. Highlight search query if present
  const trimmedQuery = query ? query.trim() : "";
  if (trimmedQuery.length > 0) {
    // Escape special regex chars in query
    const safeQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Revert to Bold to ensure font size consistency (Code block causes size mismatch)
    const match = new RegExp(`(${safeQuery})`, "gi");
    processed = processed.replace(match, "**$1**");
  }

  // 3. Add preview image if exists
  if (previewUrl) {
    // Use standard Markdown for images to ensure reliable rendering in Raycast
    processed = `![Preview](${previewUrl})\n\n` + processed;
  }

  return processed;
};

export default function Command() {
  console.log("Rendering Notion Snippets Command...");

  // State - use lightweight indexes instead of full snippets
  const preferences = getPreferenceValues<Preferences>();
  const [showMetadata, setShowMetadata] = useCachedState<boolean>(
    "show-metadata",
    preferences.showMetadata,
  );
  const [recentSnippets, setRecentSnippets] = useCachedState<SnippetIndex[]>(
    "notion-snippet-recent-v2",
    [],
  );
  const [searchResults, setSearchResults] = useState<SnippetIndex[]>([]);
  const [excludedResultCount, setExcludedResultCount] = useState(0);
  const [isGlobalSearching, setIsGlobalSearching] = useState(false);
  const [databases, setDatabases] = useCachedState<DatabaseMetadata[]>(
    "notion-databases",
    [],
  );

  // LRU Cache for full content - reduced to 20 items to prevent memory issues
  const contentCacheRef = useRef<
    Map<string, { content: string; lastAccess: number }>
  >(new Map());
  const MAX_CONTENT_CACHE_SIZE = 20;

  // Loading states for individual snippets
  const loadingContentRef = useRef<Set<string>>(new Set());
  const [selectedDbId, setSelectedDbId] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(recentSnippets.length === 0);
  const [dbStatus, setDbStatus] = useState<string>("Initializing...");
  const [loadedContents, setLoadedContents] = useState<Map<string, string>>(
    new Map(),
  );
  const isSyncingRef = useRef(false);
  const lastSyncTimeRef = useRef(0);

  const batchUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingBatchRef = useRef<SnippetIndex[]>([]);
  const retryAttemptRef = useRef(0);
  const lastSavedCountRef = useRef(0);

  // Function to load full content on demand
  const loadSnippetContent = async (index: SnippetIndex): Promise<string> => {
    // Check cache first
    const cached = contentCacheRef.current.get(index.id);
    if (cached) {
      cached.lastAccess = Date.now();
      return cached.content;
    }

    // Check if already loading
    if (loadingContentRef.current.has(index.id)) {
      // Wait a bit and retry
      await new Promise((resolve) => setTimeout(resolve, 100));
      const retryCached = contentCacheRef.current.get(index.id);
      if (retryCached) return retryCached.content;
    }

    // If content is short, use preview
    if (
      index.contentLength &&
      index.contentLength <= 500 &&
      index.contentPreview
    ) {
      return index.contentPreview;
    }

    // Load from API
    loadingContentRef.current.add(index.id);
    try {
      const content = await fetchSnippetContent(index.id);

      // Update cache with LRU eviction - very aggressive cleanup
      if (contentCacheRef.current.size >= MAX_CONTENT_CACHE_SIZE) {
        // Remove least recently used - remove 70% to be very aggressive
        const entries = Array.from(contentCacheRef.current.entries());
        entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);
        const toRemove = entries.slice(
          0,
          Math.floor(MAX_CONTENT_CACHE_SIZE * 0.7),
        ); // Remove 70%
        toRemove.forEach(([id]) => contentCacheRef.current.delete(id));
      }

      contentCacheRef.current.set(index.id, {
        content,
        lastAccess: Date.now(),
      });
      const newLoadedContents = new Map<string, string>();
      contentCacheRef.current.forEach((val, key) => {
        newLoadedContents.set(key, val.content);
      });
      setLoadedContents(newLoadedContents);
      return content;
    } finally {
      loadingContentRef.current.delete(index.id);
    }
  };

  /**
   * ... (skipping unchanged lines for brevity in tool call, will target specific lines)
   */

  // Hooks
  const { push } = useNavigation();

  useEffect(() => {
    let isMounted = true;
    async function load() {
      const now = Date.now();
      // Lock safety: if the lock is older than 30 seconds, assume it's stale (e.g. after crash/hot-reload)
      if (isSyncingRef.current && now - lastSyncTimeRef.current < 30000) {
        console.log("Index: Sync lock active and fresh, skipping auto-load");
        return;
      }

      try {
        isSyncingRef.current = true;
        lastSyncTimeRef.current = now;

        // Parallel metadata and snippets fetch
        fetchDatabases().then((dbs) => {
          if (isMounted) {
            setDatabases(dbs || []);
            // If we find databases, we can at least show the empty list
            if (dbs && dbs.length > 0) setIsLoading(false);
          }
        });

        // We don't await fetchSnippets here to allow the UI to remain interactive
        // and show batches as they arrive.
        const allData = await fetchSnippets(
          (count) => {
            if (isMounted) {
              setDbStatus(`Syncing... checked ${count} items so far.`);
              setIsLoading(false); // Definitely stop loading once we have progress
              lastSavedCountRef.current = count;
            }
          },
          (batch) => {
            // Immediate processing with minimal batching to prevent memory buildup
            if (isMounted && batch.length > 0) {
              // Limit pending batch size to prevent accumulation
              if (pendingBatchRef.current.length > 50) {
                // Process existing batches first
                const batchesToProcess = pendingBatchRef.current.splice(0, 50);
                setRecentSnippets((prev) => {
                  const map = new Map(prev.map((s) => [s.id, s]));
                  batchesToProcess.forEach((s) => map.set(s.id, s));
                  return Array.from(map.values());
                });
              }

              pendingBatchRef.current.push(...batch);

              // Clear existing timeout
              if (batchUpdateTimeoutRef.current) {
                clearTimeout(batchUpdateTimeoutRef.current);
              }

              // Very frequent updates: every 100ms or when batch reaches 10 items
              batchUpdateTimeoutRef.current = setTimeout(() => {
                if (isMounted && pendingBatchRef.current.length > 0) {
                  const batchesToProcess = pendingBatchRef.current.splice(
                    0,
                    10,
                  );
                  setRecentSnippets((prev) => {
                    const map = new Map(prev.map((s) => [s.id, s]));
                    let hasChanges = false;
                    batchesToProcess.forEach((s) => {
                      const existing = map.get(s.id);
                      if (!existing || existing.name !== s.name) {
                        map.set(s.id, s);
                        hasChanges = true;
                      }
                    });
                    return hasChanges ? Array.from(map.values()) : prev;
                  });

                  // Aggressive cleanup: clear content cache more frequently
                  if (contentCacheRef.current.size > 20) {
                    const entries = Array.from(
                      contentCacheRef.current.entries(),
                    );
                    entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);
                    const toRemove = entries.slice(0, 10);
                    toRemove.forEach(([id]) =>
                      contentCacheRef.current.delete(id),
                    );
                  }
                }
              }, 100);
            }
          },
          async (error) => {
            // Error handler for memory errors - returns true to retry
            const errorMessage = error?.message || String(error);
            const isMemoryError =
              errorMessage.includes("memory") || errorMessage.includes("heap");

            if (isMemoryError && retryAttemptRef.current < 3) {
              retryAttemptRef.current++;

              if (isMounted) {
                setDbStatus(
                  `Memory error detected. Cleaning up and retrying... (Attempt ${retryAttemptRef.current}/3)`,
                );

                // Aggressive cleanup
                contentCacheRef.current.clear();
                pendingBatchRef.current = [];

                // Force GC by clearing state temporarily
                await new Promise((resolve) => setTimeout(resolve, 500));

                // Show toast
                showToast({
                  style: Toast.Style.Animated,
                  title: `Memory cleanup (Attempt ${retryAttemptRef.current}/3)`,
                  message: `Recovered ${lastSavedCountRef.current} items. Retrying...`,
                });
              }

              return true; // Retry
            }

            return false; // Don't retry
          },
        );

        if (isMounted) {
          // Process any pending batches first
          if (pendingBatchRef.current.length > 0) {
            if (batchUpdateTimeoutRef.current) {
              clearTimeout(batchUpdateTimeoutRef.current);
              batchUpdateTimeoutRef.current = null;
            }
            const pending = pendingBatchRef.current.splice(0);
            allData.push(...pending);
          }
          // Dedup & save to recentSnippets
          const uniqueData = Array.from(
            new Map(allData.map((s) => [s.id, s])).values(),
          );

          setRecentSnippets((prev) => {
            const map = new Map(prev.map((s) => [s.id, s]));
            uniqueData.forEach((s) => map.set(s.id, s));
            return Array.from(map.values());
          });
          setDbStatus(
            uniqueData.length > 0
              ? `Loaded ${uniqueData.length} recent snippets`
              : "No snippets found.",
          );
        }
      } catch (error) {
        if (isMounted) {
          const errorMessage = String(error);
          const isMemoryError =
            errorMessage.includes("memory") || errorMessage.includes("heap");

          console.error("Index: Sync failed", error);

          if (isMemoryError && retryAttemptRef.current < 3) {
            // Auto-retry on memory error
            retryAttemptRef.current++;
            setDbStatus(
              `Memory error. Auto-retrying... (Attempt ${retryAttemptRef.current}/3)`,
            );

            // Clean up aggressively
            contentCacheRef.current.clear();
            pendingBatchRef.current = [];

            // Wait and retry
            setTimeout(() => {
              if (isMounted) {
                load();
              }
            }, 2000);
            return; // Don't set loading to false yet
          } else {
            setDbStatus(`Sync Error: ${errorMessage}`);
            showToast({
              style: Toast.Style.Failure,
              title: "Sync Failed",
              message: isMemoryError
                ? "Memory limit reached. Try reducing batch size or clearing cache."
                : errorMessage,
            });
          }
        }
      } finally {
        if (!isMounted || retryAttemptRef.current >= 3) {
          isSyncingRef.current = false;
          retryAttemptRef.current = 0; // Reset retry count
          if (isMounted) setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      isMounted = false;
      isSyncingRef.current = false; // Release lock on unmount (fixes Strict Mode double-invoke)
      // Clean up timeout and pending batches to prevent memory leaks
      if (batchUpdateTimeoutRef.current) {
        clearTimeout(batchUpdateTimeoutRef.current);
        batchUpdateTimeoutRef.current = null;
      }
      pendingBatchRef.current = [];
    };
  }, []); // Run ONLY on mount. Manual re-sync handles the rest.

  const refreshSnippets = async () => {
    if (isSyncingRef.current) {
      showToast({
        style: Toast.Style.Failure,
        title: "Sync already in progress",
      });
      return;
    }

    console.log("refreshSnippets: Manually triggered");
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Syncing with Notion...",
      message: "Fetching metadata...",
    });

    isSyncingRef.current = true;
    setIsLoading(true);
    try {
      // 1. Fetch Databases first
      const dbs = await fetchDatabases();
      setDatabases(dbs || []);

      // 2. Fetch Snippets with progress and incremental loading
      retryAttemptRef.current = 0; // Reset retry count
      const data = await fetchSnippets(
        (count) => {
          toast.message = `Fetched ${count} snippets...`;
          lastSavedCountRef.current = count;
        },
        (batch) => {
          // Use smaller batches and more frequent updates
          pendingBatchRef.current.push(...batch);

          if (batchUpdateTimeoutRef.current) {
            clearTimeout(batchUpdateTimeoutRef.current);
          }

          // Limit pending batch size
          if (pendingBatchRef.current.length > 50) {
            const batchesToProcess = pendingBatchRef.current.splice(0, 50);
            setRecentSnippets((prev) => {
              const map = new Map(prev.map((s) => [s.id, s]));
              batchesToProcess.forEach((s) => map.set(s.id, s));
              return Array.from(map.values());
            });
          }

          batchUpdateTimeoutRef.current = setTimeout(() => {
            if (pendingBatchRef.current.length > 0) {
              const batchesToProcess = pendingBatchRef.current.splice(0, 10);
              setRecentSnippets((prev) => {
                const map = new Map(prev.map((s) => [s.id, s]));
                let hasChanges = false;
                batchesToProcess.forEach((s) => {
                  const existing = map.get(s.id);
                  if (!existing || existing.name !== s.name) {
                    map.set(s.id, s);
                    hasChanges = true;
                  }
                });
                return hasChanges ? Array.from(map.values()) : prev;
              });

              // Aggressive cleanup
              if (contentCacheRef.current.size > 20) {
                const entries = Array.from(contentCacheRef.current.entries());
                entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);
                const toRemove = entries.slice(0, 10);
                toRemove.forEach(([id]) => contentCacheRef.current.delete(id));
              }
            }
          }, 100);
        },
        async (error) => {
          // Error handler for memory errors
          const errorMessage = error?.message || String(error);
          const isMemoryError =
            errorMessage.includes("memory") || errorMessage.includes("heap");

          if (isMemoryError && retryAttemptRef.current < 3) {
            retryAttemptRef.current++;

            toast.style = Toast.Style.Animated;
            toast.title = `Memory Cleanup (${retryAttemptRef.current}/3)`;
            toast.message = `Recovered ${lastSavedCountRef.current} items. Retrying...`;

            // Aggressive cleanup
            contentCacheRef.current.clear();
            pendingBatchRef.current = [];

            await new Promise((resolve) => setTimeout(resolve, 500));

            return true; // Retry
          }

          return false; // Don't retry
        },
      );

      // Process any pending batches before final merge
      if (pendingBatchRef.current.length > 0) {
        if (batchUpdateTimeoutRef.current) {
          clearTimeout(batchUpdateTimeoutRef.current);
          batchUpdateTimeoutRef.current = null;
        }
        const pending = pendingBatchRef.current.splice(0);
        data.push(...pending);
      }

      // NO LIMITS - store all indexes
      // Final merge
      // Deduplicate result to ensure status matches UI
      const uniqueData = Array.from(
        new Map(data.map((s) => [s.id, s])).values(),
      );

      // Final merge (support incremental updates)
      setRecentSnippets((prev) => {
        const map = new Map(prev.map((s) => [s.id, s]));
        uniqueData.forEach((s) => map.set(s.id, s));
        return Array.from(map.values());
      });

      const status =
        uniqueData.length > 0
          ? `Found ${uniqueData.length} snippets in ${dbs.length} databases`
          : "No snippets found.";

      setDbStatus(status);
      toast.style = Toast.Style.Success;
      toast.title = "Sync Complete";
      toast.message = status;
    } catch (error) {
      const errorMessage = String(error);
      const isMemoryError =
        errorMessage.includes("memory") || errorMessage.includes("heap");

      console.error("refreshSnippets: Failed", error);

      if (isMemoryError && retryAttemptRef.current < 3) {
        // Auto-retry on memory error
        retryAttemptRef.current++;
        toast.style = Toast.Style.Animated;
        toast.title = `Auto-retrying (${retryAttemptRef.current}/3)`;
        toast.message = "Cleaning up memory and retrying...";

        // Clean up aggressively
        contentCacheRef.current.clear();
        pendingBatchRef.current = [];

        // Wait and retry
        setTimeout(() => {
          refreshSnippets();
        }, 2000);
        return; // Don't set loading to false yet
      } else {
        setDbStatus(`Error: ${errorMessage}`);
        toast.style = Toast.Style.Failure;
        toast.title = "Sync Failed";
        toast.message = isMemoryError
          ? "Memory limit reached after 3 retries. Try clearing cache or reducing data."
          : errorMessage;
      }
    } finally {
      if (retryAttemptRef.current >= 3) {
        retryAttemptRef.current = 0; // Reset retry count
      }
      isSyncingRef.current = false;
      setIsLoading(false);
    }
  };

  const forceReSync = async () => {
    const confirm = await confirmAlert({
      title: "Force Full Re-sync?",
      message:
        "This will clear your local cache and perform a complete 100% fresh pull from Notion.",
      primaryAction: {
        title: "Start Fresh Sync",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirm) return;

    // Show immediate feedback
    await showToast({
      style: Toast.Style.Animated,
      title: "Clearing Cache & Restarting...",
    });

    setRecentSnippets([]);
    setDatabases([]);
    contentCacheRef.current.clear();
    setIsLoading(true);

    // We call refreshSnippets which will handle the rest of the Toast updates
    setTimeout(() => {
      refreshSnippets();
    }, 100);
  };

  const increaseUsage = (snippetId: string) => {
    // 1. Optimistic Update (Immediate UI feedback)
    let snippetFound = false;
    let updatedIndexes = recentSnippets.map((s) => {
      if (s.id === snippetId) {
        snippetFound = true;
        return {
          ...s,
          usageCount: (s.usageCount || 0) + 1,
          lastUsed: new Date().toISOString(),
        };
      }
      return s;
    });

    // If not found in local, it must be from global search. Add it!
    if (!snippetFound) {
      const globalSnippet = globalMatches.find((g) => g.id === snippetId);
      if (globalSnippet) {
        const newSnippet = {
          ...globalSnippet,
          usageCount: (globalSnippet.usageCount || 0) + 1,
          lastUsed: new Date().toISOString(),
        };
        updatedIndexes = [newSnippet, ...updatedIndexes]; // Add to top
      }
    }

    // Sort logic will automatically re-order them on next render if we updating state
    setRecentSnippets(updatedIndexes);

    // 2. Fire and Forget API Update (Background)
    const snippet = updatedIndexes.find((s) => s.id === snippetId);
    if (snippet) {
      updateSnippetUsage(snippetId, snippet.usageCount || 0).catch((err) => {
        console.error("Background usage update failed", err);
      });
    }
  };

  const handleSelect = async (index: SnippetIndex) => {
    console.log(`handleSelect: Processing snippet "${index.name}"`);
    if (!index) return;

    // Load full content on demand
    const content = await loadSnippetContent(index);
    if (!content) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load content",
      });
      return;
    }

    const snippet: Snippet = snippetIndexToSnippet(index, content);

    // Expand official Raycast placeholders first
    const clipboardText = (await Clipboard.readText()) || "";
    console.log(`handleSelect: Clipboard read (${clipboardText.length} chars)`);

    // Extract argument if searchText starts with trigger + space
    let argument = "";
    if (snippet.trigger && searchText.startsWith(snippet.trigger + " ")) {
      argument = searchText.substring(snippet.trigger.length + 1);
    }

    const expandedContent = processOfficialPlaceholders(
      snippet.content,
      clipboardText,
      argument,
    );

    const placeholders = parsePlaceholders(expandedContent) || [];
    if (placeholders.length > 0) {
      console.log(
        `handleSelect: Found ${placeholders.length} custom placeholders, pushing FillerForm`,
      );
      push(
        <FillerForm
          snippet={{ ...snippet, content: expandedContent }}
          placeholders={placeholders}
          onPaste={() => {
            increaseUsage(snippet.id);
            closeMainWindow();
          }}
        />,
      );
    } else {
      console.log("handleSelect: No placeholders left, pasting content...");
      increaseUsage(snippet.id);
      await Clipboard.paste(expandedContent);
      await closeMainWindow();
    }
  };

  // Debounced Search Effect
  useEffect(() => {
    // If search text is empty, clear search results
    if (!searchText || searchText.trim().length === 0) {
      setSearchResults([]);
      setIsGlobalSearching(false);
      return;
    }

    const handler = setTimeout(async () => {
      // Only search if user stopped typing for 500ms
      setIsGlobalSearching(true);

      const startTime = Date.now();
      const dbIds = (preferences.databaseIds || "")
        .replace(/[[\]"']/g, "")
        .split(/[,\s]+/);
      const { results, excludedCount } = await searchNotionSnippets(
        searchText,
        dbIds,
      );

      // Ensure UI feedback is visible for at least 800ms
      const elapsed = Date.now() - startTime;
      if (elapsed < 800) {
        await new Promise((resolve) => setTimeout(resolve, 800 - elapsed));
      }

      setSearchResults(results);
      setExcludedResultCount(excludedCount);
      setIsGlobalSearching(false);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchText]);

  const { localMatches, globalMatches } = useMemo(() => {
    // 1. Filter local recent items
    const local = (recentSnippets || [])
      .filter((snippet) => {
        if (selectedDbId !== "all" && snippet.databaseId !== selectedDbId)
          return false;

        if (!searchText) return true; // Show all recent if no search

        const lowerSearch = searchText.toLowerCase();
        const lowerName = (snippet.name || "").toLowerCase();
        const lowerTrigger = (snippet.trigger || "").toLowerCase();
        const lowerDesc = (snippet.description || "").toLowerCase();
        const lowerContent = (snippet.contentPreview || "").toLowerCase();

        if (
          lowerName.includes(lowerSearch) ||
          lowerTrigger.includes(lowerSearch) ||
          lowerDesc.includes(lowerSearch) ||
          lowerContent.includes(lowerSearch)
        )
          return true;

        if (snippet.trigger && lowerSearch.startsWith(lowerTrigger + " "))
          return true;

        return false;
      })
      .sort((a, b) => {
        // ... Sort logic for local (same as before) ...
        if (searchText && a.trigger === searchText) return -1;
        if (searchText && b.trigger === searchText) return 1;
        if (searchText && a.trigger?.toLowerCase() === searchText.toLowerCase())
          return -1;
        if (searchText && b.trigger?.toLowerCase() === searchText.toLowerCase())
          return 1;

        const usageA = a.usageCount || 0;
        const usageB = b.usageCount || 0;
        if (usageA !== usageB) return usageB - usageA;

        const dateA = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
        const dateB = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
        if (dateA !== dateB) return dateB - dateA;

        return a.name.localeCompare(b.name);
      });

    // 2. Process Global Results (Dedup against local)
    let global: SnippetIndex[] = [];
    if (searchResults.length > 0 && searchText) {
      const existingIds = new Set(local.map((s) => s.id));
      // Filter out items already in local results to avoid duplicates
      const newItems = searchResults.filter((s) => !existingIds.has(s.id));

      if (selectedDbId !== "all") {
        global = newItems.filter((s) => s.databaseId === selectedDbId);
      } else {
        global = newItems;
      }
      // Sort global results by last edited (usually returned by API, but ensure consistency)
      // Notion Search API already returns sorted by relevance/last_edited usually.
    }

    return { localMatches: local, globalMatches: global };
  }, [recentSnippets, searchResults, searchText, selectedDbId]);

  // EFFECT: Auto-fetch full content for selected global results (Reveal hidden terms)
  useEffect(() => {
    // If multiple selection or no selection, do nothing to avoid spam
    if (selectedIds.length !== 1) return;

    const selectedId = selectedIds[0];
    const isGlobal = globalMatches.some((m) => m.id === selectedId);

    // Only auto-fetch if it's a global result AND we don't have it yet
    if (isGlobal && !loadedContents.has(selectedId)) {
      const timer = setTimeout(() => {
        const snippet = globalMatches.find((m) => m.id === selectedId);
        if (snippet) {
          loadSnippetContent(snippet); // This updates state automatically
        }
      }, 500); // 500ms delay to avoid storming API while scrolling

      return () => clearTimeout(timer);
    }
  }, [selectedIds, globalMatches, loadedContents]);

  const handleDelete = async (index: SnippetIndex) => {
    if (
      await confirmAlert({
        title: "Delete Snippet?",
        message:
          "This will archive the page in Notion. It can be restored from Notion Trash.",
        primaryAction: {
          title: "Archive",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Archiving..." });
        await deleteSnippet(index.id);

        // Optimistic UI update
        setRecentSnippets((prev) => prev.filter((s) => s.id !== index.id));
        setSearchResults((prev) => prev.filter((s) => s.id !== index.id));

        showToast({ style: Toast.Style.Success, title: "Snippet Archived" });
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete",
          message: String(error),
        });
      }
    }
  };

  const exportSelectedAndReveal = async () => {
    try {
      // If only 1 item is selected (the focused one), we assume the user wants to export ALL VISIBLE snippets.
      // This respects the current filters (Database, Search Text).
      const indexesToExport =
        (selectedIds?.length || 0) > 1
          ? recentSnippets.filter((s) => selectedIds.includes(s.id))
          : [...localMatches, ...globalMatches];

      // Load full content for export
      const itemsToExport = await Promise.all(
        indexesToExport.map(async (index) => {
          const content = await loadSnippetContent(index);
          return snippetIndexToSnippet(index, content);
        }),
      );

      if ((itemsToExport?.length || 0) === 0) {
        throw new Error("No snippets selected to export.");
      }

      if (
        (await confirmAlert({
          title: "Enable Global Triggers",
          message:
            "To use triggers in any application, you must import these snippets into Raycast's native database.\n\n1. We will generate a JSON file.\n2. Open Raycast Settings > Extensions > Snippets.\n3. Select 'Import Snippets' and choose this file.",
          primaryAction: { title: "Export & Reveal JSON" },
          dismissAction: { title: "Cancel" },
        })) === false
      ) {
        return;
      }

      const raycastSnippets = itemsToExport.map((s) => ({
        name: s.name,
        text: s.content,
        keyword: s.trigger || "",
      }));

      const fileName =
        itemsToExport.length === 1
          ? `snippet_${itemsToExport[0].name.substring(0, 10)}.json`
          : `selected_${itemsToExport.length}_snippets.json`;
      const exportPath = path.join(os.homedir(), "Downloads", fileName);
      fs.writeFileSync(exportPath, JSON.stringify(raycastSnippets, null, 2));

      const script = `tell application "Finder" to reveal posix file "${exportPath}"
      tell application "Finder" to activate`;

      exec(`osascript -e '${script}'`);

      await showToast({
        style: Toast.Style.Success,
        title: `Exported ${itemsToExport.length} Snippets`,
        message: "File highlighted in Finder. Drag it to Raycast settings.",
      });

      await open("raycast://extensions/raycast/snippets/manage-snippets");
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Export Failed",
        message: String(error),
      });
    }
  };

  const dbCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    // Count both lists if possible or just the primary one
    // Actually, count typically should reflect what is visible or what is total.
    // Let's reflect the RECENT list for the counts logic to keep it stable,
    // or maybe the SEARCH list if searching.
    const listToCount =
      searchText && searchResults.length > 0
        ? [...recentSnippets, ...searchResults]
        : recentSnippets;

    listToCount.forEach((s) => {
      if (s.databaseId) {
        counts[s.databaseId] = (counts[s.databaseId] || 0) + 1;
      }
    });
    return counts;
  }, [recentSnippets, searchResults, searchText]);

  const placeholder = useMemo(() => {
    if (isLoading && recentSnippets.length === 0)
      return "Connecting to Notion...";
    if (isGlobalSearching) return "Searching Notion Global Index...";
    return "Search snippets...";
  }, [isLoading, recentSnippets.length, isGlobalSearching]);

  return (
    <List
      isLoading={isLoading || isGlobalSearching}
      searchBarPlaceholder={placeholder}
      isShowingDetail={true}
      onSearchTextChange={setSearchText}
      onSelectionChange={(ids) => {
        if (!ids) {
          setSelectedIds([]);
        } else if (Array.isArray(ids)) {
          setSelectedIds(ids);
        } else {
          setSelectedIds([ids as string]);
        }
      }}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Database"
          storeValue={true}
          onChange={(newValue) => setSelectedDbId(newValue)}
        >
          <List.Dropdown.Section title="Databases">
            <List.Dropdown.Item
              title={`All Snippets (${recentSnippets.length})`}
              value="all"
            />
            {databases.map((db) => (
              <List.Dropdown.Item
                key={`${db.id}-${dbCounts[db.id] || 0}`}
                title={`${db.title} (${dbCounts[db.id] || 0})`}
                value={db.id}
                icon={db.icon}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title="Sync Status"
        description={`${dbStatus}\n\nCurrent Configured IDs: ${preferences.databaseIds || ""}`}
        actions={
          <ActionPanel>
            <Action
              title="Open Notion Integration Settings"
              onAction={() => open("https://www.notion.so/my-integrations")}
            />
            <Action
              title="Retry Fetch"
              icon={Icon.Repeat}
              onAction={() => {
                setIsLoading(true);
                Promise.all([fetchSnippets(), fetchDatabases()]).then(
                  ([data, dbs]) => {
                    const safeData = data || [];
                    setRecentSnippets(safeData);
                    setDatabases(dbs);
                    setDbStatus(
                      safeData.length > 0
                        ? `Loaded ${safeData.length} snippets`
                        : "Still no snippets found.",
                    );
                    setIsLoading(false);
                  },
                );
              }}
            />
            <Action
              title="Create New Snippet"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={() => push(<SnippetForm onSuccess={refreshSnippets} />)}
            />
            <Action
              title={showMetadata ? "Hide Metadata" : "Show Metadata"}
              icon={showMetadata ? Icon.EyeDisabled : Icon.Eye}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              onAction={() => setShowMetadata(!showMetadata)}
            />
          </ActionPanel>
        }
      />
      <List.Section title="Local" subtitle={String(localMatches.length)}>
        {localMatches.map((index) => {
          // Load content on demand for preview
          const cachedContent = contentCacheRef.current.get(index.id);
          const displayContent =
            cachedContent?.content || index.contentPreview || "Loading...";

          // Parse placeholders from preview or cached content
          let placeholders: string[] = [];
          if (cachedContent?.content) {
            placeholders = parsePlaceholders(cachedContent.content);
          } else if (index.contentPreview) {
            placeholders = parsePlaceholders(index.contentPreview);
          }

          // Use helper for highlighting
          let highlightedContent = highlightContent(
            displayContent,
            searchText,
            index.preview,
          );

          // Add loading indicator if content is not fully loaded
          if (
            !cachedContent &&
            index.contentLength &&
            index.contentLength > 500
          ) {
            highlightedContent += "\n\n*[Click to load full content]*";
          }

          // Find db info efficiently
          const dbInfo = databases.find((d) => d.id === index.databaseId);

          return (
            <List.Item
              key={index.id}
              id={index.id}
              icon={
                dbInfo?.icon ||
                (index.typeColor
                  ? { source: Icon.Dot, tintColor: index.typeColor as Color }
                  : Icon.Dot)
              }
              title={index.name}
              keywords={[
                ...(index.trigger ? [index.trigger] : []),
                ...(index.description
                  ? index.description.split(" ").slice(0, 5)
                  : []), // Add first few words of description
                ...(index.contentPreview
                  ? [index.contentPreview.substring(0, 50)]
                  : []), // Add start of content for search
              ]}
              accessories={[
                ...(index.type
                  ? [
                      {
                        tag: {
                          value: index.type,
                          color: index.typeColor as Color,
                        },
                        tooltip: index.name,
                      },
                    ]
                  : []),
                ...(index.trigger
                  ? [
                      {
                        tag: { value: index.trigger, color: Color.Blue },
                        tooltip: index.name,
                      },
                    ]
                  : []),
              ]}
              detail={
                <List.Item.Detail
                  markdown={highlightedContent}
                  metadata={
                    showMetadata ? (
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Information" />
                        <List.Item.Detail.Metadata.Label
                          title="Name"
                          text={index.name}
                        />
                        {index.type && (
                          <List.Item.Detail.Metadata.TagList title="Type">
                            <List.Item.Detail.Metadata.TagList.Item
                              text={index.type}
                              color={index.typeColor as Color}
                            />
                          </List.Item.Detail.Metadata.TagList>
                        )}
                        {index.status && (
                          <List.Item.Detail.Metadata.TagList title="Status">
                            <List.Item.Detail.Metadata.TagList.Item
                              text={index.status}
                              color={index.statusColor as Color}
                            />
                          </List.Item.Detail.Metadata.TagList>
                        )}
                        {index.trigger && (
                          <List.Item.Detail.Metadata.Label
                            title="Trigger"
                            text={index.trigger}
                          />
                        )}

                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Usage"
                          text={`${index.usageCount || 0} times`}
                          icon={Icon.BarChart}
                        />
                        {index.lastUsed && (
                          <List.Item.Detail.Metadata.Label
                            title="Last Used"
                            text={new Date(index.lastUsed).toLocaleString()}
                            icon={Icon.Clock}
                          />
                        )}

                        {placeholders.length > 0 && (
                          <>
                            <List.Item.Detail.Metadata.Separator />
                            <List.Item.Detail.Metadata.Label title="Variables" />
                            {placeholders.map((p) => (
                              <List.Item.Detail.Metadata.Label
                                key={p}
                                title={p}
                                icon={{
                                  source: Icon.Pencil,
                                  tintColor: Color.Orange,
                                }}
                              />
                            ))}
                          </>
                        )}

                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Source"
                          text={dbInfo?.title || "Unknown"}
                          icon={dbInfo?.icon}
                        />
                      </List.Item.Detail.Metadata>
                    ) : undefined
                  }
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title="Paste Snippet"
                      icon={Icon.Clipboard}
                      onAction={() => handleSelect(index)}
                    />
                    <Action
                      title={showMetadata ? "Hide Metadata" : "Show Metadata"}
                      icon={showMetadata ? Icon.EyeDisabled : Icon.Eye}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                      onAction={() => setShowMetadata(!showMetadata)}
                    />
                    <Action
                      title="Refresh Snippets"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={refreshSnippets}
                    />
                    <Action
                      title="Open in Notion"
                      icon={Icon.Link}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      onAction={() => {
                        if (index.url) {
                          open(index.url);
                        } else {
                          showToast({
                            style: Toast.Style.Failure,
                            title: "No URL",
                            message: "This snippet doesn't have a Notion URL",
                          });
                        }
                      }}
                    />
                    <Action
                      title="Import to Raycast Snippets"
                      icon={Icon.Snippets}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                      onAction={async () => {
                        await showToast({
                          style: Toast.Style.Animated,
                          title: "Preparing Import...",
                        });
                        const content = await loadSnippetContent(index);
                        if (!content) {
                          await showToast({
                            style: Toast.Style.Failure,
                            title: "Failed to load content",
                          });
                          return;
                        }

                        // Try 'context' with multiple potential keys to hit the correct one
                        const launchContext = {
                          name: index.name,
                          title: index.name,
                          snippet: content,
                          text: content,
                          content: content,
                          keyword: index.trigger || "",
                          type: "snippet",
                        };
                        const url = `raycast://extensions/raycast/snippets/create-snippet?context=${encodeURIComponent(JSON.stringify(launchContext))}`;
                        await open(url);
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Import Window Opened",
                        });
                      }}
                    />
                    <Action
                      title="Edit Snippet"
                      icon={Icon.Pencil}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                      onAction={async () => {
                        const content = await loadSnippetContent(index);
                        const fullSnippet = snippetIndexToSnippet(
                          index,
                          content,
                        );
                        push(
                          <SnippetForm
                            snippet={fullSnippet}
                            onSuccess={refreshSnippets}
                          />,
                        );
                      }}
                    />
                    <Action
                      title="Delete Snippet"
                      icon={Icon.Trash}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      style={Action.Style.Destructive}
                      onAction={() => handleDelete(index)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Sync & Export">
                    <Action
                      title="Force Full Re-sync"
                      icon={Icon.Warning}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                      onAction={forceReSync}
                    />
                    <Action
                      title="Export All Snippets"
                      icon={Icon.Download}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                      onAction={exportSelectedAndReveal}
                    />
                    <Action
                      title="Copy Raw Content"
                      icon={Icon.Clipboard}
                      onAction={async () => {
                        const content = await loadSnippetContent(index);
                        await Clipboard.copy(content);
                        showToast({
                          style: Toast.Style.Success,
                          title: "Content copied",
                        });
                      }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {/* Global Matches Section */}
      {globalMatches.length > 0 && (
        <List.Section title="Global" subtitle={`${globalMatches.length}`}>
          {globalMatches.map((snippet) => {
            // Unified UI Logic: Same as Local Matches
            const dbInfo = databases.find((d) => d.id === snippet.databaseId);

            // Load content on demand or use preview
            const cachedContent = loadedContents.get(snippet.id);
            // Note: loadedContents stores string for global usually?
            // Actually loadedContents is Map<string, string>.
            // Using "snippet.contentPreview" as fallback.
            const displayContent =
              cachedContent || snippet.contentPreview || "*Content hidden*";

            // Parse placeholders
            let placeholders: string[] = [];
            if (cachedContent) {
              placeholders = parsePlaceholders(cachedContent);
            } else if (snippet.contentPreview) {
              placeholders = parsePlaceholders(snippet.contentPreview);
            }

            const highlightedGlobalContent = highlightContent(
              displayContent,
              searchText,
              snippet.preview,
            );

            return (
              <List.Item
                key={`global-${snippet.id}`}
                id={snippet.id}
                // Icon logic: Use cloud to indicate source, but maybe match local style?
                // User request: "Use ... local fields". Let's keep Cloud icon for distinction but add color dots?
                // Actually user said "Cloud operations and display fields should be consistent with local".
                // Local uses Icon.Dot with color.
                // Let's use Cloud icon but add the same accessories/metadata.
                // Unified Icon logic (Match local)
                icon={
                  dbInfo?.icon ||
                  (snippet.typeColor
                    ? {
                        source: Icon.Dot,
                        tintColor: snippet.typeColor as Color,
                      }
                    : Icon.Dot)
                }
                title={snippet.name}
                // Unified Keywords/Accessories
                keywords={[
                  ...(snippet.trigger ? [snippet.trigger] : []),
                  ...(snippet.description
                    ? snippet.description.split(" ").slice(0, 5)
                    : []),
                  ...(snippet.contentPreview
                    ? [snippet.contentPreview.substring(0, 50)]
                    : []),
                ]}
                accessories={[
                  ...(snippet.type
                    ? [
                        {
                          tag: {
                            value: snippet.type,
                            color: snippet.typeColor as Color,
                          },
                          tooltip: snippet.name,
                        },
                      ]
                    : []),
                  ...(snippet.trigger
                    ? [
                        {
                          tag: { value: snippet.trigger, color: Color.Blue },
                          tooltip: snippet.name,
                        },
                      ]
                    : []),
                ]}
                // Unified Detail View
                detail={
                  <List.Item.Detail
                    markdown={highlightedGlobalContent}
                    metadata={
                      showMetadata ? (
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label title="Information" />
                          <List.Item.Detail.Metadata.Label
                            title="Name"
                            text={snippet.name}
                          />
                          {snippet.type && (
                            <List.Item.Detail.Metadata.TagList title="Type">
                              <List.Item.Detail.Metadata.TagList.Item
                                text={snippet.type}
                                color={snippet.typeColor as Color}
                              />
                            </List.Item.Detail.Metadata.TagList>
                          )}
                          {snippet.status && (
                            <List.Item.Detail.Metadata.TagList title="Status">
                              <List.Item.Detail.Metadata.TagList.Item
                                text={snippet.status}
                                color={snippet.statusColor as Color}
                              />
                            </List.Item.Detail.Metadata.TagList>
                          )}
                          {snippet.trigger && (
                            <List.Item.Detail.Metadata.Label
                              title="Trigger"
                              text={snippet.trigger}
                            />
                          )}

                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label
                            title="Usage"
                            text={`${snippet.usageCount || 0} times`}
                            icon={Icon.BarChart}
                          />
                          {snippet.lastUsed && (
                            <List.Item.Detail.Metadata.Label
                              title="Last Used"
                              text={new Date(snippet.lastUsed).toLocaleString()}
                              icon={Icon.Clock}
                            />
                          )}

                          {placeholders.length > 0 && (
                            <>
                              <List.Item.Detail.Metadata.Separator />
                              <List.Item.Detail.Metadata.Label title="Variables" />
                              {placeholders.map((p) => (
                                <List.Item.Detail.Metadata.Label
                                  key={p}
                                  title={p}
                                  icon={{
                                    source: Icon.Pencil,
                                    tintColor: Color.Orange,
                                  }}
                                />
                              ))}
                            </>
                          )}

                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label
                            title="Source"
                            text={dbInfo?.title || "Unknown"}
                            icon={dbInfo?.icon}
                          />
                        </List.Item.Detail.Metadata>
                      ) : undefined
                    }
                  />
                }
                // Unified Actions
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action
                        title="Paste Snippet"
                        icon={Icon.Clipboard}
                        onAction={() => handleSelect(snippet)}
                      />
                      <Action
                        title={showMetadata ? "Hide Metadata" : "Show Metadata"}
                        icon={showMetadata ? Icon.EyeDisabled : Icon.Eye}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                        onAction={() => setShowMetadata(!showMetadata)}
                      />
                      <Action
                        title="Refresh Snippets"
                        icon={Icon.ArrowClockwise}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        onAction={refreshSnippets}
                      />
                      <Action
                        title="Open in Notion"
                        icon={Icon.Link}
                        shortcut={{ modifiers: ["cmd"], key: "n" }}
                        onAction={() => {
                          if (snippet.url) {
                            open(snippet.url);
                          } else {
                            showToast({
                              style: Toast.Style.Failure,
                              title: "No URL",
                              message: "This snippet doesn't have a Notion URL",
                            });
                          }
                        }}
                      />
                      <Action
                        title="Import to Raycast Snippets"
                        icon={Icon.Snippets}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                        onAction={async () => {
                          await showToast({
                            style: Toast.Style.Animated,
                            title: "Preparing Import...",
                          });
                          const content = await loadSnippetContent(snippet);
                          if (!content) {
                            await showToast({
                              style: Toast.Style.Failure,
                              title: "Failed to load content",
                            });
                            return;
                          }

                          // Try 'context' with multiple potential keys
                          const launchContext = {
                            name: snippet.name,
                            title: snippet.name,
                            snippet: content,
                            text: content,
                            content: content,
                            keyword: snippet.trigger || "",
                            type: "snippet",
                          };
                          const url = `raycast://extensions/raycast/snippets/create-snippet?context=${encodeURIComponent(JSON.stringify(launchContext))}`;
                          await open(url);
                          await showToast({
                            style: Toast.Style.Success,
                            title: "Import Window Opened",
                          });
                        }}
                      />
                      <Action
                        title="Edit Snippet"
                        icon={Icon.Pencil}
                        shortcut={{ modifiers: ["cmd"], key: "e" }}
                        onAction={async () => {
                          // Ensure content is loaded before editing
                          // Global snippets might not have content loaded in 'snippet' object yet
                          const content = await loadSnippetContent(snippet);
                          const fullSnippet = snippetIndexToSnippet(
                            snippet,
                            content,
                          );
                          push(
                            <SnippetForm
                              snippet={fullSnippet}
                              onSuccess={refreshSnippets}
                            />,
                          );
                        }}
                      />
                      <Action
                        title="Delete Snippet"
                        icon={Icon.Trash}
                        shortcut={{ modifiers: ["ctrl"], key: "x" }}
                        style={Action.Style.Destructive}
                        onAction={() => handleDelete(snippet)}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Sync & Export">
                      <Action
                        title="Copy to Clipboard"
                        icon={Icon.CopyClipboard}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                        onAction={async () => {
                          updateSnippetUsage(snippet.id);
                          const content = await loadSnippetContent(snippet);
                          await Clipboard.copy(content);
                          showToast({
                            style: Toast.Style.Success,
                            title: "Copied to clipboard",
                          });
                        }}
                      />
                      <Action
                        title="Force Full Re-sync"
                        icon={Icon.Warning}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                        onAction={forceReSync}
                      />
                      <Action
                        title="Copy Raw Content"
                        icon={Icon.Clipboard}
                        onAction={async () => {
                          const content = await loadSnippetContent(snippet);
                          await Clipboard.copy(content);
                          showToast({
                            style: Toast.Style.Success,
                            title: "Content copied",
                          });
                        }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {excludedResultCount > 0 && searchResults.length === 0 && (
        <List.Section title="Hidden Results">
          <List.Item
            icon={Icon.EyeDisabled}
            title={`Found ${excludedResultCount} result${excludedResultCount > 1 ? "s" : ""} in unconfigured databases`}
            subtitle="Add the missing Database ID in Extension Preferences to see them."
            actions={
              <ActionPanel>
                <Action
                  title="Open Preferences"
                  onAction={() => openCommandPreferences()}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
