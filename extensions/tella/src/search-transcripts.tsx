import React, { useState, useEffect, useMemo } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Detail,
  Clipboard,
  open,
} from "@raycast/api";
import {
  listVideos,
  getVideo,
  RateLimitError,
  MissingApiKeyError,
} from "./api";
import type { Video, Transcript } from "./types";
import {
  getVideoCache,
  setVideoCache,
  isCacheStale,
  isCacheExpired,
  getTranscriptCache,
  addTranscriptsToCache,
  clearTranscriptCache,
  getTranscriptCacheStats,
  type CachedTranscript,
} from "./cache";
import {
  formatDate,
  FETCH_CONCURRENCY,
  BATCH_DELAY_MS,
  formatTranscriptWithTimestamps,
  formatTranscriptAsSRT,
  estimateBatchTime,
} from "./utils";
import { RateLimitErrorDetail, MissingApiKeyDetail } from "./components";

interface VideoWithTranscript {
  video: Video;
  transcript: Transcript | null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightMatches(text: string, query: string): string {
  if (!query) return text.slice(0, 500) + "...";

  // Get context around the first match
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) return text.slice(0, 500) + "...";

  // Extract window around match (200 chars before, 300 after)
  const start = Math.max(0, index - 200);
  const end = Math.min(text.length, index + query.length + 300);
  let excerpt = text.slice(start, end);

  if (start > 0) excerpt = "..." + excerpt;
  if (end < text.length) excerpt = excerpt + "...";

  // Highlight matches with inline code (renders with distinct background in Raycast markdown)
  return excerpt.replace(new RegExp(`(${escapeRegex(query)})`, "gi"), "`$1`");
}

// Helper to batch fetch transcripts with concurrency limit and rate limiting
async function fetchTranscripts(
  videos: Video[],
  options: {
    concurrency?: number;
    delayBetweenBatches?: number;
    onProgress?: (current: number, total: number) => void;
    onBatchComplete?: (
      newTranscripts: Record<string, CachedTranscript>,
    ) => void;
  } = {},
): Promise<{
  results: VideoWithTranscript[];
  newTranscripts: Record<string, CachedTranscript>;
}> {
  const {
    concurrency = FETCH_CONCURRENCY,
    delayBetweenBatches = BATCH_DELAY_MS,
    onProgress,
    onBatchComplete,
  } = options;

  const results: VideoWithTranscript[] = [];
  const newTranscripts: Record<string, CachedTranscript> = {};

  for (let i = 0; i < videos.length; i += concurrency) {
    const batch = videos.slice(i, i + concurrency);

    // Add delay between batches to avoid rate limiting (but not before the first batch)
    if (i > 0 && delayBetweenBatches > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
    }

    const batchResults = await Promise.allSettled(
      batch.map(async (video) => {
        try {
          const response = await getVideo(video.id);
          const transcript = response.video.transcript || null;

          // Store in cache format if transcript is ready
          if (transcript && transcript.status === "ready") {
            newTranscripts[video.id] = {
              status: transcript.status,
              text: transcript.text,
              videoName: video.name,
              sentences: transcript.sentences,
            };
          }

          return {
            video,
            transcript,
          };
        } catch {
          // Silently skip failed fetches
          return {
            video,
            transcript: null,
          };
        }
      }),
    );

    const batchNewTranscripts: Record<string, CachedTranscript> = {};
    batchResults.forEach((result) => {
      if (result.status === "fulfilled") {
        results.push(result.value);
        // Track new transcripts from this batch
        const videoId = result.value.video.id;
        if (newTranscripts[videoId]) {
          batchNewTranscripts[videoId] = newTranscripts[videoId];
        }
      }
    });

    // Save after each batch so progress isn't lost if interrupted
    if (onBatchComplete && Object.keys(batchNewTranscripts).length > 0) {
      onBatchComplete(batchNewTranscripts);
    }

    if (onProgress) {
      onProgress(Math.min(i + concurrency, videos.length), videos.length);
    }
  }
  return { results, newTranscripts };
}

export default function SearchTranscripts() {
  const [searchText, setSearchText] = useState("");
  const [videosWithTranscripts, setVideosWithTranscripts] = useState<
    VideoWithTranscript[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false); // Background sync indicator
  const [loadingStatus, setLoadingStatus] = useState("Loading...");
  const [loadingProgress, setLoadingProgress] = useState({
    current: 0,
    total: 0,
  });
  const [error, setError] = useState<Error | null>(null);
  const [showFirstRunSetup, setShowFirstRunSetup] = useState(false);
  const [pendingVideos, setPendingVideos] = useState<Video[]>([]);

  // Convert cached transcript to full Transcript object
  const cachedToTranscript = (cached: CachedTranscript): Transcript => ({
    status: cached.status,
    language: "en",
    text: cached.text,
    sentences: cached.sentences || [],
  });

  // Fetch all videos from API
  const fetchAllVideos = async (): Promise<Video[]> => {
    const allVideos: Video[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const response = await listVideos({ cursor, limit: 50 });
      allVideos.push(...response.videos);
      cursor = response.pagination.nextCursor;
      hasMore = response.pagination.hasMore;
    }

    await setVideoCache(allVideos);
    return allVideos;
  };

  // Load cached data immediately, check if sync is needed
  const initializeTranscripts = async (forceVideoRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // Load video cache
      let videos: Video[] = [];
      const videoCache = await getVideoCache();

      if (forceVideoRefresh) {
        // Force refresh - fetch fresh videos from API
        setLoadingStatus("Fetching videos from Tella...");
        videos = await fetchAllVideos();
      } else if (videoCache && videoCache.videos.length > 0) {
        // Use cached videos immediately
        videos = videoCache.videos;

        // Check if we need to refresh videos in background
        if (isCacheExpired(videoCache) || isCacheStale(videoCache)) {
          // Refresh video list in background (don't block UI)
          fetchAllVideos()
            .then((freshVideos) => {
              // After refresh, check for new videos that need transcript sync
              const transcriptCache = getTranscriptCache();
              transcriptCache.then((cache) => {
                const cachedTranscriptIds = new Set(
                  Object.keys(cache?.transcripts || {}),
                );
                const newVideos = freshVideos.filter(
                  (v) => !cachedTranscriptIds.has(v.id),
                );

                if (newVideos.length > 0) {
                  // Update state with fresh videos and pending count
                  setVideosWithTranscripts((prev) => {
                    const existingIds = new Set(prev.map((p) => p.video.id));
                    const newItems = newVideos
                      .filter((v) => !existingIds.has(v.id))
                      .map((video) => ({ video, transcript: null }));
                    return [...prev, ...newItems];
                  });
                  setPendingVideos(newVideos);

                  showToast({
                    style: Toast.Style.Success,
                    title: "New videos available",
                    message: `${newVideos.length} new videos. Use ⌘R to sync transcripts.`,
                  });
                }
              });
            })
            .catch(() => {
              // Silently fail background refresh
            });
        }
      } else {
        // No video cache - fetch videos (this is relatively fast)
        setLoadingStatus("Fetching videos from Tella...");
        videos = await fetchAllVideos();
      }

      if (videos.length === 0) {
        setIsLoading(false);
        return;
      }

      // Load transcript cache
      const transcriptCache = await getTranscriptCache();
      const videoIds = new Set(videos.map((v) => v.id));

      // Build results from cache (show immediately)
      const cachedTranscripts = transcriptCache?.transcripts || {};
      const results: VideoWithTranscript[] = videos.map((video) => {
        const cached = cachedTranscripts[video.id];
        if (cached && cached.status === "ready" && videoIds.has(video.id)) {
          return {
            video,
            transcript: cachedToTranscript(cached),
          };
        }
        return {
          video,
          transcript: null,
        };
      });

      // Count cached vs new
      const cachedIds = new Set(
        Object.keys(cachedTranscripts).filter((id) => videoIds.has(id)),
      );
      const videosToFetch = videos.filter((v) => !cachedIds.has(v.id));

      setVideosWithTranscripts(results);
      setIsLoading(false);

      // If there are new videos to sync
      if (videosToFetch.length > 0) {
        setPendingVideos(videosToFetch);

        if (cachedIds.size === 0) {
          // First run - no cache at all, show setup screen for user awareness
          setShowFirstRunSetup(true);
        } else {
          // Has some cached transcripts - auto-sync new ones in background
          syncNewTranscripts(videosToFetch, results);
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setIsLoading(false);
    }
  };

  // Sync new transcripts (can be called from first-run setup or background)
  const syncNewTranscripts = async (
    videosToSync: Video[],
    existingResults?: VideoWithTranscript[],
  ) => {
    try {
      setShowFirstRunSetup(false);
      setIsSyncing(true);
      setLoadingProgress({ current: 0, total: videosToSync.length });

      const currentResults = existingResults || videosWithTranscripts;

      showToast({
        style: Toast.Style.Animated,
        title: "Syncing transcripts...",
        message: `0/${videosToSync.length} - This may take ${estimateBatchTime(videosToSync.length)}`,
      });

      const { results: fetchedResults } = await fetchTranscripts(videosToSync, {
        onProgress: (current, total) => {
          setLoadingProgress({ current, total });
        },
        onBatchComplete: async (batchTranscripts) => {
          // Save after each batch so progress isn't lost
          if (Object.keys(batchTranscripts).length > 0) {
            await addTranscriptsToCache(batchTranscripts);

            // Update UI in real-time as transcripts sync
            setVideosWithTranscripts((prev) =>
              prev.map((item) => {
                const cached = batchTranscripts[item.video.id];
                if (cached && cached.status === "ready") {
                  return {
                    video: item.video,
                    transcript: cachedToTranscript(cached),
                  };
                }
                return item;
              }),
            );

            // Update pending count in real-time
            setPendingVideos((prev) =>
              prev.filter((v) => !batchTranscripts[v.id]),
            );
          }
        },
      });

      // Final merge to ensure all results are captured
      const fetchedMap = new Map(fetchedResults.map((r) => [r.video.id, r]));
      const mergedResults = currentResults.map((r) => {
        const fetched = fetchedMap.get(r.video.id);
        return fetched || r;
      });

      setVideosWithTranscripts(mergedResults);
      setPendingVideos([]);

      // Check cache size and warn if getting large
      const cacheStats = await getTranscriptCacheStats();
      if (cacheStats?.isNearLimit) {
        showToast({
          style: Toast.Style.Failure,
          title: "Cache nearly full",
          message: `${cacheStats.sizeFormatted} used. Consider clearing old transcripts.`,
        });
      } else if (cacheStats?.isLarge) {
        showToast({
          style: Toast.Style.Success,
          title: "Sync complete",
          message: `${fetchedResults.length} synced (cache: ${cacheStats.sizeFormatted})`,
        });
      } else {
        showToast({
          style: Toast.Style.Success,
          title: "Sync complete",
          message: `${fetchedResults.length} transcripts synced`,
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      showToast({
        style: Toast.Style.Failure,
        title: "Sync failed",
        message: error.message,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Force refresh - clear cache and reload everything
  const forceRefresh = async () => {
    await clearTranscriptCache();
    setVideosWithTranscripts([]);
    setPendingVideos([]);
    setShowFirstRunSetup(false);
    await initializeTranscripts();
  };

  useEffect(() => {
    initializeTranscripts();
  }, []);

  // Filter videos: show all when browsing, filter when searching
  // Filter videos: show all when browsing, filter by transcript match when searching
  const filteredVideos = useMemo(() => {
    // No search - show ALL videos (including those without transcripts yet)
    if (!searchText) {
      return videosWithTranscripts;
    }

    // Search - filter by transcript match (only videos with ready transcripts can match)
    const query = searchText.toLowerCase();
    return videosWithTranscripts.filter((item) => {
      if (!item.transcript || item.transcript.status !== "ready") return false;
      return item.transcript.text.toLowerCase().includes(query);
    });
  }, [videosWithTranscripts, searchText]);

  // Handle errors
  if (error) {
    // Handle missing API key with onboarding
    if (error instanceof MissingApiKeyError) {
      return <MissingApiKeyDetail />;
    }

    // Handle rate limit errors with a better UI
    if (error instanceof RateLimitError) {
      return <RateLimitErrorDetail error={error} onRetry={forceRefresh} />;
    }

    // Handle other errors with debug info
    const debugInfo = {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      command: "Search Transcripts",
    };
    const debugText = JSON.stringify(debugInfo, null, 2);

    return (
      <Detail
        markdown={`# Error\n\n${error.message}\n\n## Debug Info\n\n\`\`\`json\n${debugText}\n\`\`\`\n\nPress **Enter** to copy debug info.`}
        actions={
          <ActionPanel>
            <Action
              title="Copy Debug Info"
              icon={Icon.Clipboard}
              onAction={async () => {
                await Clipboard.copy(debugText);
                showToast({
                  style: Toast.Style.Success,
                  title: "Debug info copied",
                });
              }}
              shortcut={{ modifiers: [], key: "enter" }}
            />
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={forceRefresh}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  // First-run setup screen
  if (showFirstRunSetup && pendingVideos.length > 0) {
    const estimatedTime = estimateBatchTime(pendingVideos.length);

    return (
      <Detail
        markdown={`# Welcome to Transcript Search

This is your first time using transcript search. To enable searching across your videos, we need to download and cache your transcripts locally.

## What will happen?

- **${pendingVideos.length} videos** will be synced
- Estimated time: **${estimatedTime}**
- Transcripts are cached locally for instant search
- Future syncs will only fetch new videos

## Why does this take time?

The Tella API provides transcripts per-video, so we need to fetch each one individually. To avoid rate limiting, we add small delays between requests.

**Ready?** Press **Enter** to start syncing, or press **Escape** to skip for now.`}
        actions={
          <ActionPanel>
            <Action
              title={`Start Sync (${estimatedTime})`}
              icon={Icon.Download}
              onAction={() => syncNewTranscripts(pendingVideos)}
            />
            <Action
              title="Skip for Now"
              icon={Icon.XMarkCircle}
              onAction={() => {
                setShowFirstRunSetup(false);
                showToast({
                  style: Toast.Style.Success,
                  title: "Sync skipped",
                  message: "Use ⌘R to sync transcripts later",
                });
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Initial loading
  if (isLoading) {
    return (
      <Detail
        markdown={`# Loading Transcripts\n\n${loadingStatus}\n\nChecking cache and fetching videos...`}
        actions={
          <ActionPanel>
            <Action
              title="Clear Cache and Refresh"
              icon={Icon.Trash}
              onAction={forceRefresh}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Syncing indicator (shown while background sync is running)
  if (isSyncing && loadingProgress.total > 0) {
    const progressBar = `[${"█".repeat(Math.floor((loadingProgress.current / loadingProgress.total) * 20))}${"░".repeat(20 - Math.floor((loadingProgress.current / loadingProgress.total) * 20))}]`;
    const remaining = loadingProgress.total - loadingProgress.current;
    const estimatedRemaining = estimateBatchTime(remaining);

    return (
      <Detail
        markdown={`# Syncing Transcripts

${progressBar}

**Progress:** ${loadingProgress.current}/${loadingProgress.total} videos

**Remaining:** ~${estimatedRemaining}

---

Transcripts are being cached locally. After this, only new videos will need to be synced.

**Note:** Progress is saved after each batch, so you won't lose progress if you close the extension.`}
        actions={
          <ActionPanel>
            <Action
              title="Open Cache Folder"
              icon={Icon.Folder}
              onAction={async () => {
                await open("~/Library/Application Support/com.raycast.macos/");
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Refresh videos from API and check for new transcripts to sync
  const refreshVideos = async () => {
    try {
      setIsSyncing(true);
      showToast({
        style: Toast.Style.Animated,
        title: "Refreshing videos...",
      });

      // Fetch fresh videos from API
      const freshVideos = await fetchAllVideos();

      // Get transcript cache to see which videos need syncing
      const transcriptCache = await getTranscriptCache();
      const cachedTranscriptIds = new Set(
        Object.keys(transcriptCache?.transcripts || {}),
      );

      // Build results from cache
      const cachedTranscripts = transcriptCache?.transcripts || {};
      const results: VideoWithTranscript[] = freshVideos.map((video) => {
        const cached = cachedTranscripts[video.id];
        if (cached && cached.status === "ready") {
          return {
            video,
            transcript: cachedToTranscript(cached),
          };
        }
        return {
          video,
          transcript: null,
        };
      });

      // Find videos that need transcript sync
      const videosToFetch = freshVideos.filter(
        (v) => !cachedTranscriptIds.has(v.id),
      );

      setVideosWithTranscripts(results);
      setPendingVideos(videosToFetch);

      if (videosToFetch.length > 0) {
        showToast({
          style: Toast.Style.Success,
          title: `${videosToFetch.length} new videos found`,
          message: "Use ⌘R again to sync transcripts",
        });
      } else {
        showToast({
          style: Toast.Style.Success,
          title: "Videos refreshed",
          message: "All transcripts are up to date",
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to refresh",
        message: error.message,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Helper for refresh actions
  const handleRefresh = () => {
    if (pendingVideos.length > 0) {
      syncNewTranscripts(pendingVideos);
    } else {
      // No pending videos - refresh video list from API
      refreshVideos();
    }
  };

  if (videosWithTranscripts.length === 0) {
    return (
      <List
        searchBarPlaceholder="Search transcripts..."
        onSearchTextChange={setSearchText}
        filtering={false}
        actions={
          <ActionPanel>
            {pendingVideos.length > 0 ? (
              <Action
                title={`Sync ${pendingVideos.length} Transcripts`}
                icon={Icon.Download}
                onAction={() => syncNewTranscripts(pendingVideos)}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            ) : (
              <Action
                title="Check for New Videos"
                icon={Icon.ArrowClockwise}
                onAction={handleRefresh}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            )}
            <Action
              title="Clear Cache and Rebuild"
              icon={Icon.Trash}
              onAction={forceRefresh}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            />
            <Action
              title="Open Cache Folder"
              icon={Icon.Folder}
              onAction={async () => {
                await open("~/Library/Application Support/com.raycast.macos/");
              }}
            />
          </ActionPanel>
        }
      >
        <List.EmptyView
          icon={Icon.Document}
          title="No Transcripts Available"
          description={
            pendingVideos.length > 0
              ? `${pendingVideos.length} videos available to sync. Press ⌘R to sync.`
              : "No videos with ready transcripts found"
          }
        />
      </List>
    );
  }

  // Build navigation title with sync status
  const navigationTitle = isSyncing
    ? `Syncing... ${loadingProgress.current}/${loadingProgress.total}`
    : pendingVideos.length > 0
      ? `Transcripts • ${pendingVideos.length} pending`
      : "Transcripts";

  return (
    <List
      searchBarPlaceholder="Search transcripts..."
      onSearchTextChange={setSearchText}
      filtering={false}
      isShowingDetail={true}
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          {pendingVideos.length > 0 ? (
            <Action
              title={`Sync ${pendingVideos.length} New Transcripts`}
              icon={Icon.Download}
              onAction={() => syncNewTranscripts(pendingVideos)}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          ) : (
            <Action
              title="Check for New Videos"
              icon={Icon.ArrowClockwise}
              onAction={handleRefresh}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          )}
          <Action
            title="Clear Cache and Rebuild"
            icon={Icon.Trash}
            onAction={forceRefresh}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          />
          <Action
            title="Open Cache Folder"
            icon={Icon.Folder}
            onAction={async () => {
              await open("~/Library/Application Support/com.raycast.macos/");
            }}
          />
        </ActionPanel>
      }
    >
      {filteredVideos.length === 0 && searchText ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No matches"
          description={`No transcripts found containing "${searchText}"`}
        />
      ) : filteredVideos.length === 0 ? (
        <List.EmptyView
          icon={Icon.Video}
          title="No Videos Found"
          description="No videos found. Press ⌘R to refresh."
        />
      ) : (
        filteredVideos.map((item) => {
          const thumbnailUrl =
            item.video.thumbnails?.small?.jpg ||
            item.video.thumbnails?.medium?.jpg;
          const hasTranscript =
            item.transcript && item.transcript.status === "ready";
          const isPending = pendingVideos.some((v) => v.id === item.video.id);

          return (
            <List.Item
              key={item.video.id}
              title={item.video.name}
              icon={thumbnailUrl ? { source: thumbnailUrl } : Icon.Document}
              accessories={
                hasTranscript
                  ? []
                  : isPending && isSyncing
                    ? [{ text: "Syncing...", icon: Icon.ArrowClockwise }]
                    : isPending
                      ? [{ icon: Icon.Clock, tooltip: "Waiting to sync" }]
                      : []
              }
              detail={
                hasTranscript ? (
                  <List.Item.Detail
                    markdown={(() => {
                      const transcript = item.transcript!;
                      const wordCount = transcript.text
                        .split(/\s+/)
                        .filter((w) => w.length > 0).length;
                      const charCount = transcript.text.length;
                      const matchCount = searchText
                        ? (
                            transcript.text.match(
                              new RegExp(escapeRegex(searchText), "gi"),
                            ) || []
                          ).length
                        : 0;

                      const metadata = [
                        `**Words:** ${wordCount.toLocaleString()}`,
                        `**Characters:** ${charCount.toLocaleString()}`,
                        transcript.language &&
                          `**Language:** ${transcript.language}`,
                        searchText &&
                          matchCount > 0 &&
                          `**Matches:** ${matchCount}`,
                      ]
                        .filter(Boolean)
                        .join(" • ");

                      const transcriptText = searchText
                        ? highlightMatches(transcript.text, searchText)
                        : transcript.text;

                      return `${metadata}\n\n---\n\n${transcriptText}`;
                    })()}
                  />
                ) : (
                  <List.Item.Detail
                    markdown={
                      isSyncing
                        ? `# Syncing Transcript...\n\nThis video's transcript is being synced.\n\n**Progress:** ${loadingProgress.current}/${loadingProgress.total} videos\n\nThe transcript will appear here automatically when ready.`
                        : `# Transcript Not Available\n\nThis video's transcript hasn't been synced yet.`
                    }
                  />
                )
              }
              actions={
                <ActionPanel>
                  {hasTranscript && (
                    <>
                      <Action.CopyToClipboard
                        content={item.transcript!.text}
                        title="Copy Transcript"
                        icon={Icon.Clipboard}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      {item.transcript!.sentences &&
                        item.transcript!.sentences.length > 0 && (
                          <>
                            <Action.CopyToClipboard
                              content={formatTranscriptWithTimestamps(
                                item.transcript!,
                              )}
                              title="Copy Transcript with Timestamps"
                              icon={Icon.Clock}
                              shortcut={{
                                modifiers: ["cmd", "shift"],
                                key: "c",
                              }}
                            />
                            <Action.CopyToClipboard
                              content={formatTranscriptAsSRT(item.transcript!)}
                              title="Copy Transcript as Srt"
                              icon={Icon.Document}
                              shortcut={{
                                modifiers: ["cmd", "shift"],
                                key: "s",
                              }}
                            />
                          </>
                        )}
                      <Action.Push
                        title="View Transcript"
                        icon={Icon.Document}
                        target={
                          <TranscriptDetail
                            video={item.video}
                            transcript={item.transcript!}
                            query={searchText}
                          />
                        }
                      />
                    </>
                  )}
                  <Action.OpenInBrowser
                    url={item.video.links.viewPage}
                    title="Open Video in Browser"
                  />
                  <Action.CopyToClipboard
                    content={item.video.links.viewPage}
                    title="Copy Video Link"
                  />
                  {pendingVideos.length > 0 && !isSyncing ? (
                    <Action
                      title={`Sync ${pendingVideos.length} Transcripts`}
                      icon={Icon.Download}
                      onAction={() => syncNewTranscripts(pendingVideos)}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  ) : (
                    !isSyncing && (
                      <Action
                        title="Check for New Videos"
                        icon={Icon.ArrowClockwise}
                        onAction={handleRefresh}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                    )
                  )}
                  <Action
                    title="Clear Cache and Rebuild"
                    icon={Icon.Trash}
                    onAction={forceRefresh}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  />
                  <Action
                    title="Open Cache Folder"
                    icon={Icon.Folder}
                    onAction={async () => {
                      await open(
                        "~/Library/Application Support/com.raycast.macos/",
                      );
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function TranscriptDetail({
  video,
  transcript,
  query,
}: {
  video: Video;
  transcript: Transcript;
  query: string;
}) {
  // Highlight query matches in transcript
  const highlightedText = query
    ? transcript.text.replace(
        new RegExp(`(${escapeRegex(query)})`, "gi"),
        "**$1**",
      )
    : transcript.text;

  const markdown = `# ${video.name}\n\n${highlightedText}`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Views"
            text={video.views.toLocaleString()}
          />
          <Detail.Metadata.Label
            title="Date"
            text={formatDate(video.createdAt)}
          />
          <Detail.Metadata.Link
            title="Video"
            target={video.links.viewPage}
            text="Open"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            content={transcript.text}
            title="Copy Transcript"
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          {transcript.sentences && transcript.sentences.length > 0 && (
            <>
              <Action.CopyToClipboard
                content={formatTranscriptWithTimestamps(transcript)}
                title="Copy Transcript with Timestamps"
                icon={Icon.Clock}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.CopyToClipboard
                content={formatTranscriptAsSRT(transcript)}
                title="Copy Transcript as Srt"
                icon={Icon.Document}
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              />
            </>
          )}
          <Action.OpenInBrowser
            url={video.links.viewPage}
            title="Open Video in Browser"
          />
          <Action.CopyToClipboard
            content={video.links.viewPage}
            title="Copy Video Link"
          />
        </ActionPanel>
      }
    />
  );
}
