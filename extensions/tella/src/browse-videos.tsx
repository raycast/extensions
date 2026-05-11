import React from "react";
import {
  List,
  Grid,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Detail,
  confirmAlert,
  Alert,
  useNavigation,
  LocalStorage,
  Form,
  open,
  Clipboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useEffect, useMemo } from "react";
import {
  listVideos,
  getVideo,
  deleteVideo,
  duplicateVideo,
  updateVideo,
  listPlaylists,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  startVideoExport,
  createPlaylist,
  RateLimitError,
  MissingApiKeyError,
} from "./api";
import type {
  Video,
  StartExportRequest,
  UpdateVideoRequest,
  CreatePlaylistRequest,
} from "./types";
import {
  getVideoCache,
  setVideoCache,
  isCacheStale,
  isCacheExpired,
  formatRelativeTime,
} from "./cache";
import {
  ErrorDetail,
  RateLimitErrorDetail,
  MissingApiKeyDetail,
} from "./components";
import {
  formatDate,
  GRID_INITIAL_LOAD,
  FETCH_CONCURRENCY,
  BATCH_DELAY_MS,
} from "./utils";

type SortOption =
  | "date-desc"
  | "date-asc"
  | "views-desc"
  | "views-asc"
  | "name-asc"
  | "name-desc";
type ViewMode = "list" | "grid";

// Helper to batch fetch video details with concurrency limit and rate limiting
async function fetchVideoDetails(
  videoIds: string[],
  concurrency = FETCH_CONCURRENCY,
  delayBetweenBatches = BATCH_DELAY_MS,
): Promise<Record<string, Video>> {
  const results: Record<string, Video> = {};
  for (let i = 0; i < videoIds.length; i += concurrency) {
    const batch = videoIds.slice(i, i + concurrency);

    // Add delay between batches to avoid rate limiting (but not before the first batch)
    if (i > 0 && delayBetweenBatches > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
    }

    const batchResults = await Promise.allSettled(
      batch.map(async (id) => {
        const response = await getVideo(id);
        return { id, video: response.video };
      }),
    );
    batchResults.forEach((result) => {
      if (result.status === "fulfilled") {
        results[result.value.id] = result.value.video;
      }
    });
  }
  return results;
}

export default function BrowseVideos({
  playlistId,
  playlistName,
}: {
  playlistId?: string;
  playlistName?: string;
}) {
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [usePagination, setUsePagination] = useState(false); // Fallback mode

  useEffect(() => {
    LocalStorage.getItem<string>("tella-view-mode").then((value) => {
      if (value === "list" || value === "grid") {
        setViewMode(value);
      }
    });
    LocalStorage.getItem<SortOption>("tella-sort-by").then((value) => {
      if (
        value === "date-desc" ||
        value === "date-asc" ||
        value === "views-desc" ||
        value === "views-asc" ||
        value === "name-asc" ||
        value === "name-desc"
      ) {
        setSortBy(value);
      }
    });
  }, []);

  // Fetch all videos from API
  const refreshAllVideos = async (playlistId?: string): Promise<Video[]> => {
    const allVideos: Video[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const response = await listVideos({ playlistId, cursor, limit: 50 });
      allVideos.push(...response.videos);
      cursor = response.pagination.nextCursor;
      hasMore = response.pagination.hasMore;
    }

    await setVideoCache(allVideos, playlistId);
    setLastSynced(new Date().toISOString());
    return allVideos;
  };

  // Reset paginated videos when playlistId changes
  useEffect(() => {
    setPaginatedVideos([]);
  }, [playlistId]);

  // Load videos on mount or playlistId change
  useEffect(() => {
    const loadVideos = async () => {
      try {
        const cache = await getVideoCache(playlistId);

        if (cache) {
          // Always show cached data immediately, even if expired
          setVideos(cache.videos);
          setLastSynced(cache.fetchedAt);
          setIsLoading(false);

          if (isCacheExpired(cache)) {
            // Cache expired - refresh in background
            setIsSyncing(true);
            try {
              const refreshedVideos = await refreshAllVideos(playlistId);
              setVideos(refreshedVideos);
            } catch {
              // Silently fail - keep showing cached data
            } finally {
              setIsSyncing(false);
            }
          } else if (isCacheStale(cache)) {
            // Cache stale - refresh in background
            setIsSyncing(true);
            try {
              const refreshedVideos = await refreshAllVideos(playlistId);
              setVideos(refreshedVideos);
            } catch {
              // Silently fail - keep showing cached data
            } finally {
              setIsSyncing(false);
            }
          }
        } else {
          // No cache - must fetch
          setIsLoading(true);
          try {
            const allVideos = await refreshAllVideos(playlistId);
            setVideos(allVideos);
          } catch {
            // Fall back to pagination mode
            setUsePagination(true);
            setIsLoading(false);
          } finally {
            setIsLoading(false);
          }
        }
      } catch {
        // Cache failed, fall back to pagination
        setUsePagination(true);
        setIsLoading(false);
      }
    };

    loadVideos();
  }, [playlistId]);

  const toggleViewMode = async () => {
    const newMode = viewMode === "list" ? "grid" : "list";
    setViewMode(newMode);
    await LocalStorage.setItem("tella-view-mode", newMode);
  };

  // Manual refresh - force full re-fetch
  const handleRefresh = async () => {
    if (usePagination) {
      // In fallback mode, just revalidate pagination
      setPaginatedVideos([]);
      revalidate();
      return;
    }

    setIsLoading(true);
    try {
      const refreshedVideos = await refreshAllVideos(playlistId);
      setVideos(refreshedVideos);
      showToast({
        style: Toast.Style.Success,
        title: "Videos refreshed",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to refresh videos",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback pagination mode (if caching fails)
  const [paginatedVideos, setPaginatedVideos] = useState<Video[]>([]);
  const {
    isLoading: isLoadingPagination,
    error,
    pagination,
    revalidate,
  } = useCachedPromise(
    (playlistId) => async (options) => {
      const response = await listVideos({
        playlistId,
        cursor: options.cursor,
        limit: 30,
      });

      // Accumulate paginated videos
      const newVideos = response.videos;
      setPaginatedVideos((prev) => {
        if (!options.cursor) {
          return newVideos;
        }
        const existingIds = new Set(prev.map((v) => v.id));
        const uniqueNewVideos = newVideos.filter((v) => !existingIds.has(v.id));
        return [...prev, ...uniqueNewVideos];
      });

      return {
        data: newVideos,
        hasMore: response.pagination.hasMore,
        cursor: response.pagination.nextCursor,
      };
    },
    [playlistId],
    {
      execute: usePagination, // Only execute if fallback mode
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load videos",
          message: error.message,
        });
      },
      keepPreviousData: true,
    },
  );

  // Use cached videos or paginated data
  const data = usePagination ? paginatedVideos : videos;

  const filteredVideos = data?.filter((video) => {
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    return (
      video.name.toLowerCase().includes(search) ||
      video.description.toLowerCase().includes(search)
    );
  });

  const sortedVideos = useMemo(() => {
    if (!filteredVideos) return [];
    return filteredVideos.slice().sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        case "date-asc":
          return (
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          );
        case "views-desc":
          return b.views - a.views;
        case "views-asc":
          return a.views - b.views;
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });
  }, [filteredVideos, sortBy]);

  // For grid view, only fetch thumbnails for videos currently visible (first page)
  // This reduces memory usage and API calls
  const visibleVideoIds = useMemo(() => {
    if (viewMode !== "grid" || !sortedVideos || sortedVideos.length === 0) {
      return [];
    }
    // Only fetch thumbnails for initial visible videos
    // Raycast will handle pagination display, but we only load thumbnails for visible items
    return sortedVideos.slice(0, GRID_INITIAL_LOAD).map((v) => v.id);
  }, [sortedVideos, viewMode]);

  const visibleVideoIdsKey = visibleVideoIds.join(",");
  const {
    data: videoDetailsRecord,
    isLoading: isLoadingDetails,
    error: detailsError,
  } = useCachedPromise(
    async (mode: ViewMode, idsKey: string) => {
      // Only fetch when in grid view and we have video IDs
      // idsKey is used as a cache key to trigger refetch when visible video IDs change
      if (mode !== "grid" || !idsKey || idsKey === "") {
        return {} as Record<string, Video>;
      }
      return fetchVideoDetails(visibleVideoIds, FETCH_CONCURRENCY);
    },
    [viewMode, visibleVideoIdsKey],
    {
      keepPreviousData: true, // Keep thumbnails when scrolling
    },
  );

  // Merge list data with full details for grid view
  const videosWithDetails = useMemo(() => {
    if (viewMode === "list") {
      return sortedVideos;
    }
    // In grid view, merge with fetched details if available
    if (!videoDetailsRecord || typeof videoDetailsRecord !== "object") {
      return sortedVideos;
    }
    return sortedVideos.map((video) => {
      const fullDetails = videoDetailsRecord[video.id];
      // Prefer full details (which include thumbnails) over list data
      return fullDetails || video;
    });
  }, [sortedVideos, videoDetailsRecord, viewMode]);

  // Handle errors - check for specific error types first
  if (error || detailsError) {
    const errorToShow = error || detailsError;

    // Handle missing API key with onboarding
    if (errorToShow instanceof MissingApiKeyError) {
      return <MissingApiKeyDetail />;
    }

    // Handle rate limit errors with a better UI
    if (errorToShow instanceof RateLimitError) {
      return (
        <RateLimitErrorDetail error={errorToShow} onRetry={handleRefresh} />
      );
    }

    // Handle other errors with debug info
    const debugInfo = {
      error: errorToShow?.message || String(errorToShow),
      stack: errorToShow instanceof Error ? errorToShow.stack : undefined,
      timestamp: new Date().toISOString(),
      command: "Browse Videos",
      playlistId: playlistId || null,
      viewMode,
      errorType: error ? "list" : "details",
    };
    const debugText = JSON.stringify(debugInfo, null, 2);

    return (
      <Detail
        markdown={`# Error\n\n${errorToShow?.message || String(errorToShow)}\n\n## Debug Info\n\n\`\`\`json\n${debugText}\n\`\`\`\n\nPress **Enter** to copy debug info.`}
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
              onAction={handleRefresh}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  const handleSortChange = async (newValue: string) => {
    const sortOption = newValue as SortOption;
    setSortBy(sortOption);
    await LocalStorage.setItem("tella-sort-by", sortOption);
  };

  // Build navigation title with freshness indicator
  const navigationTitle = playlistName
    ? lastSynced
      ? `${playlistName} • Updated ${formatRelativeTime(lastSynced)}`
      : playlistName
    : lastSynced
      ? `Browse Videos • Updated ${formatRelativeTime(lastSynced)}`
      : "Browse Videos";

  const sortDropdown = (
    <List.Dropdown tooltip="Sort by" value={sortBy} onChange={handleSortChange}>
      <List.Dropdown.Item title="Date (Newest)" value="date-desc" />
      <List.Dropdown.Item title="Date (Oldest)" value="date-asc" />
      <List.Dropdown.Item title="Views (Most)" value="views-desc" />
      <List.Dropdown.Item title="Views (Least)" value="views-asc" />
      <List.Dropdown.Item title="Name (A-Z)" value="name-asc" />
      <List.Dropdown.Item title="Name (Z-A)" value="name-desc" />
    </List.Dropdown>
  );

  if (viewMode === "grid") {
    return (
      <Grid
        isLoading={isLoading || isLoadingPagination || isLoadingDetails}
        navigationTitle={navigationTitle}
        searchBarPlaceholder="Search videos..."
        onSearchTextChange={setSearchText}
        searchBarAccessory={sortDropdown}
        columns={4}
        aspectRatio="16/9"
        fit={Grid.Fit.Fill}
        actions={
          <ActionPanel>
            <Action
              title="Switch to List View"
              icon={Icon.List}
              onAction={toggleViewMode}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={handleRefresh}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel>
        }
      >
        {isSyncing && (
          <Grid.Section title="Syncing...">
            <Grid.Item
              title="Syncing videos..."
              content={Icon.ArrowClockwise}
            />
          </Grid.Section>
        )}
        {videosWithDetails && videosWithDetails.length > 0 ? (
          <Grid.Section>
            {videosWithDetails.map((video) => (
              <VideoGridItem
                key={video.id}
                video={video}
                onRefresh={handleRefresh}
                toggleViewMode={toggleViewMode}
                playlistId={playlistId}
                playlistName={playlistName}
              />
            ))}
          </Grid.Section>
        ) : data && data.length > 0 ? (
          <Grid.EmptyView
            icon={Icon.MagnifyingGlass}
            title="No matches"
            description="Try a different search term"
          />
        ) : (
          <Grid.EmptyView
            icon={Icon.Video}
            title="No Videos"
            description="No videos found"
          />
        )}
      </Grid>
    );
  }

  return (
    <List
      isLoading={isLoading || isLoadingPagination}
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Search videos..."
      onSearchTextChange={setSearchText}
      filtering={false}
      searchBarAccessory={sortDropdown}
      pagination={usePagination ? pagination : undefined}
      actions={
        <ActionPanel>
          <Action
            title="Switch to Grid View"
            icon={Icon.AppWindowGrid2x2}
            onAction={toggleViewMode}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={handleRefresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      {isSyncing && (
        <List.Section title="Syncing...">
          <List.Item
            title="Syncing videos..."
            icon={Icon.ArrowClockwise}
            accessories={[{ icon: Icon.ArrowClockwise }]}
          />
        </List.Section>
      )}
      {sortedVideos?.map((video) => (
        <VideoItem
          key={video.id}
          video={video}
          onRefresh={handleRefresh}
          toggleViewMode={toggleViewMode}
        />
      ))}
      {sortedVideos?.length === 0 && data && data.length > 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No matches"
          description="Try a different search term"
        />
      )}
      {sortedVideos?.length === 0 && (!data || data.length === 0) && (
        <List.EmptyView
          icon={Icon.Video}
          title="No Videos"
          description="No videos found"
        />
      )}
    </List>
  );
}

function VideoActions({
  video,
  onRefresh,
  toggleViewMode,
  playlistId,
  playlistName,
}: {
  video: Video;
  onRefresh: () => void;
  toggleViewMode: () => void;
  playlistId?: string;
  playlistName?: string;
}) {
  const { push } = useNavigation();

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser
          url={video.links.viewPage}
          title="Open in Browser"
        />
        <Action.CopyToClipboard
          content={video.links.viewPage}
          title="Copy Video Link"
        />
        <Action.CopyToClipboard
          content={video.links.embedPage}
          title="Copy Embed Link"
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Push
          title="Edit Settings"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
          target={<VideoSettingsForm video={video} onSave={onRefresh} />}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Push
          title="View Transcript"
          icon={Icon.Document}
          target={<TranscriptView videoId={video.id} videoName={video.name} />}
        />
        <CopyTranscriptAction videoId={video.id} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <AddToPlaylistAction
          videoId={video.id}
          videoName={video.name}
          videoPlaylistIds={video.playlistIds}
          onRefresh={onRefresh}
        />
        {playlistId && (
          <Action
            title="Remove from Playlist"
            icon={Icon.MinusCircle}
            style={Action.Style.Destructive}
            onAction={async () => {
              if (
                await confirmAlert({
                  title: "Remove from Playlist",
                  message: `Remove "${video.name}" from this playlist? The video will not be deleted.`,
                  primaryAction: {
                    title: "Remove",
                    style: Alert.ActionStyle.Destructive,
                  },
                })
              ) {
                try {
                  await removeVideoFromPlaylist(playlistId, video.id);
                  showToast({
                    style: Toast.Style.Success,
                    title: "Removed from playlist",
                  });
                  onRefresh();
                } catch (err) {
                  push(
                    <ErrorDetail
                      error={err instanceof Error ? err : String(err)}
                      context={{
                        action: "Remove from Playlist",
                        videoId: video.id,
                        videoName: video.name,
                        playlistId,
                        playlistName,
                      }}
                    />,
                  );
                }
              }
            }}
          />
        )}
        <Action
          title="Duplicate and Open Video"
          icon={Icon.Duplicate}
          onAction={async () => {
            try {
              const response = await duplicateVideo(video.id);
              const duplicatedVideo = response.video;
              showToast({
                style: Toast.Style.Success,
                title: "Video duplicated",
                message: "Opening duplicated video...",
              });
              await open(duplicatedVideo.links.viewPage);
              onRefresh();
            } catch (err) {
              push(
                <ErrorDetail
                  error={err instanceof Error ? err : String(err)}
                  context={{
                    action: "Duplicate and open video",
                    videoId: video.id,
                    videoName: video.name,
                  }}
                />,
              );
            }
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Push
          title="Start Export"
          icon={Icon.Download}
          target={
            <ExportForm
              videoId={video.id}
              videoName={video.name}
              onRefresh={onRefresh}
            />
          }
        />
        <Action.Push
          title="View Exports"
          icon={Icon.List}
          target={
            <ExportStatusView
              videoId={video.id}
              videoName={video.name}
              exports={video.exports}
            />
          }
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Delete Video"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={async () => {
            if (
              await confirmAlert({
                title: "Delete Video",
                message: `Are you sure you want to delete "${video.name}"? This action cannot be undone.`,
                primaryAction: {
                  title: "Delete",
                  style: Alert.ActionStyle.Destructive,
                },
              })
            ) {
              try {
                await deleteVideo(video.id);
                showToast({
                  style: Toast.Style.Success,
                  title: "Video deleted",
                });
                onRefresh();
              } catch (err) {
                push(
                  <ErrorDetail
                    error={err instanceof Error ? err : String(err)}
                    context={{
                      action: "Delete Video",
                      videoId: video.id,
                      videoName: video.name,
                    }}
                  />,
                );
              }
            }
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Switch to Grid View"
          icon={Icon.AppWindowGrid2x2}
          onAction={toggleViewMode}
          shortcut={{ modifiers: ["cmd"], key: "g" }}
        />
        <Action
          title="Switch to List View"
          icon={Icon.List}
          onAction={toggleViewMode}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
        />
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={onRefresh}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function VideoSettingsForm({
  video,
  onSave,
}: {
  video: Video;
  onSave: () => void;
}) {
  const { pop } = useNavigation();

  // Always fetch full video details to ensure we have complete settings
  // List endpoint doesn't include all settings fields, so we need the full video object
  const {
    data: fullVideo,
    isLoading,
    error: fetchError,
  } = useCachedPromise(
    async (videoId: string) => {
      // Fetch full details (will be cached by useCachedPromise)
      const response = await getVideo(videoId);
      return response.video;
    },
    [video.id],
  );

  // Use fullVideo when available, fallback to video for initial render
  const videoToUse = fullVideo || video;

  // Helper to get initial values from video settings
  const getInitialValues = (videoData: Video | undefined) => {
    const settings = videoData?.settings;
    return {
      name: videoData?.name || video.name,
      description: videoData?.description || video.description,
      defaultPlaybackRate: settings?.defaultPlaybackRate?.toString() || "1",
      captionsDefaultEnabled: settings?.captionsDefaultEnabled ?? false,
      transcriptsEnabled: settings?.transcriptsEnabled ?? false,
      publishDateEnabled: settings?.publishDateEnabled ?? false,
      viewCountEnabled: settings?.viewCountEnabled ?? false,
      commentsEnabled: settings?.commentsEnabled ?? false,
      commentEmailsEnabled: settings?.commentEmailsEnabled ?? false,
      downloadsEnabled: settings?.downloadsEnabled ?? false,
      rawDownloadsEnabled: settings?.rawDownloadsEnabled ?? false,
      linkScope: settings?.linkScope || "public",
      password: "",
      searchEngineIndexingEnabled:
        settings?.searchEngineIndexingEnabled ?? false,
      customThumbnailURL: settings?.customThumbnailURL || "",
    };
  };

  const initialValues = getInitialValues(videoToUse);

  const [name, setName] = useState(initialValues.name);
  const [description, setDescription] = useState(initialValues.description);
  const [defaultPlaybackRate, setDefaultPlaybackRate] = useState<string>(
    initialValues.defaultPlaybackRate,
  );
  const [captionsDefaultEnabled, setCaptionsDefaultEnabled] = useState(
    initialValues.captionsDefaultEnabled,
  );
  const [transcriptsEnabled, setTranscriptsEnabled] = useState(
    initialValues.transcriptsEnabled,
  );
  const [publishDateEnabled, setPublishDateEnabled] = useState(
    initialValues.publishDateEnabled,
  );
  const [viewCountEnabled, setViewCountEnabled] = useState(
    initialValues.viewCountEnabled,
  );
  const [commentsEnabled, setCommentsEnabled] = useState(
    initialValues.commentsEnabled,
  );
  const [commentEmailsEnabled, setCommentEmailsEnabled] = useState(
    initialValues.commentEmailsEnabled,
  );
  const [downloadsEnabled, setDownloadsEnabled] = useState(
    initialValues.downloadsEnabled,
  );
  const [rawDownloadsEnabled, setRawDownloadsEnabled] = useState(
    initialValues.rawDownloadsEnabled,
  );
  const [linkScope, setLinkScope] = useState<
    "public" | "private" | "password" | "embedonly"
  >(initialValues.linkScope);
  const [password, setPassword] = useState(initialValues.password);
  const [searchEngineIndexingEnabled, setSearchEngineIndexingEnabled] =
    useState(initialValues.searchEngineIndexingEnabled);
  const [customThumbnailURL, setCustomThumbnailURL] = useState(
    initialValues.customThumbnailURL,
  );

  // Update form values when video data becomes available or changes
  useEffect(() => {
    if (videoToUse) {
      const values = getInitialValues(videoToUse);
      setName(values.name);
      setDescription(values.description);
      setDefaultPlaybackRate(values.defaultPlaybackRate);
      setCaptionsDefaultEnabled(values.captionsDefaultEnabled);
      setTranscriptsEnabled(values.transcriptsEnabled);
      setPublishDateEnabled(values.publishDateEnabled);
      setViewCountEnabled(values.viewCountEnabled);
      setCommentsEnabled(values.commentsEnabled);
      setCommentEmailsEnabled(values.commentEmailsEnabled);
      setDownloadsEnabled(values.downloadsEnabled);
      setRawDownloadsEnabled(values.rawDownloadsEnabled);
      setLinkScope(values.linkScope);
      setSearchEngineIndexingEnabled(values.searchEngineIndexingEnabled);
      setCustomThumbnailURL(values.customThumbnailURL);
      // Don't reset password field if user has typed something
      if (!password) {
        setPassword(values.password);
      }
    }
  }, [videoToUse]);

  const handleSubmit = async (values: {
    name: string;
    description: string;
    defaultPlaybackRate: string;
    captionsDefaultEnabled: boolean;
    transcriptsEnabled: boolean;
    publishDateEnabled: boolean;
    viewCountEnabled: boolean;
    commentsEnabled: boolean;
    commentEmailsEnabled: boolean;
    downloadsEnabled: boolean;
    rawDownloadsEnabled: boolean;
    linkScope: "public" | "private" | "password" | "embedonly";
    password: string;
    searchEngineIndexingEnabled: boolean;
    customThumbnailURL: string;
  }) => {
    try {
      const updateData: UpdateVideoRequest = {
        name: values.name,
        description: values.description,
        defaultPlaybackRate: parseFloat(values.defaultPlaybackRate),
        captionsDefaultEnabled: values.captionsDefaultEnabled,
        transcriptsEnabled: values.transcriptsEnabled,
        publishDateEnabled: values.publishDateEnabled,
        viewCountEnabled: values.viewCountEnabled,
        commentsEnabled: values.commentsEnabled,
        commentEmailsEnabled: values.commentEmailsEnabled,
        downloadsEnabled: values.downloadsEnabled,
        rawDownloadsEnabled: values.rawDownloadsEnabled,
        linkScope: values.linkScope,
        searchEngineIndexingEnabled: values.searchEngineIndexingEnabled,
        customThumbnailURL: values.customThumbnailURL || undefined,
      };

      // Only include password if linkScope is password
      if (values.linkScope === "password") {
        if (!values.password || values.password.trim().length === 0) {
          showToast({
            style: Toast.Style.Failure,
            title: "Password required",
            message: "Password is required when link scope is 'password'",
          });
          return;
        }
        updateData.password = values.password;
      }

      await updateVideo(video.id, updateData);

      showToast({
        style: Toast.Style.Success,
        title: "Settings updated",
        message: `Updated settings for "${values.name}"`,
      });

      pop();
      onSave();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update settings",
        message: errorMessage,
      });
    }
  };

  // Show loading state while fetching full video details
  if (isLoading) {
    return (
      <Detail
        markdown={`# Loading Settings

Fetching video details...`}
        actions={
          <ActionPanel>
            <Action title="Cancel" icon={Icon.XMarkCircle} onAction={pop} />
          </ActionPanel>
        }
      />
    );
  }

  // Show error if fetch failed
  if (fetchError || !fullVideo) {
    const errorMessage =
      fetchError instanceof Error ? fetchError.message : "Failed to load video";
    return (
      <ErrorDetail
        error={errorMessage}
        context={{
          command: "Browse Videos",
          action: "Edit Settings",
          videoId: video.id,
        }}
      />
    );
  }

  return (
    <Form
      navigationTitle="Edit Video Settings"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Settings"
            onSubmit={handleSubmit}
            icon={Icon.CheckCircle}
          />
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={pop} />
          <Action.OpenInBrowser
            title="Open in Tella"
            url={videoToUse.links.viewPage}
            icon={Icon.Globe}
          />
        </ActionPanel>
      }
    >
      {/* Content */}
      <Form.TextField
        id="name"
        title="Name"
        value={name}
        onChange={setName}
        placeholder="Video name"
      />
      <Form.TextArea
        id="description"
        title="Description"
        value={description}
        onChange={setDescription}
        placeholder="Video description"
      />

      {/* Sharing */}
      <Form.Separator />
      <Form.Dropdown
        id="linkScope"
        title="Visibility"
        value={linkScope}
        onChange={(newValue) =>
          setLinkScope(
            newValue as "public" | "private" | "password" | "embedonly",
          )
        }
      >
        <Form.Dropdown.Item value="public" title="Public" />
        <Form.Dropdown.Item value="private" title="Private" />
        <Form.Dropdown.Item value="password" title="Password Protected" />
        <Form.Dropdown.Item value="embedonly" title="Embed Only" />
      </Form.Dropdown>
      {linkScope === "password" && (
        <Form.TextField
          id="password"
          title="Password"
          value={password}
          onChange={setPassword}
          placeholder="Enter password"
        />
      )}

      {/* Display */}
      <Form.Separator />
      <Form.Dropdown
        id="defaultPlaybackRate"
        title="Playback Speed"
        value={defaultPlaybackRate}
        onChange={setDefaultPlaybackRate}
      >
        <Form.Dropdown.Item value="0.5" title="0.5x" />
        <Form.Dropdown.Item value="0.75" title="0.75x" />
        <Form.Dropdown.Item value="1" title="1x (Normal)" />
        <Form.Dropdown.Item value="1.25" title="1.25x" />
        <Form.Dropdown.Item value="1.5" title="1.5x" />
        <Form.Dropdown.Item value="1.75" title="1.75x" />
        <Form.Dropdown.Item value="2" title="2x" />
      </Form.Dropdown>
      <Form.Checkbox
        id="captionsDefaultEnabled"
        label="Show captions by default"
        value={captionsDefaultEnabled}
        onChange={setCaptionsDefaultEnabled}
      />
      <Form.Checkbox
        id="transcriptsEnabled"
        label="Show transcript to viewers"
        value={transcriptsEnabled}
        onChange={setTranscriptsEnabled}
      />
      <Form.Checkbox
        id="publishDateEnabled"
        label="Show publish date"
        value={publishDateEnabled}
        onChange={setPublishDateEnabled}
      />
      <Form.Checkbox
        id="viewCountEnabled"
        label="Show view count"
        value={viewCountEnabled}
        onChange={setViewCountEnabled}
      />

      {/* Advanced */}
      <Form.Separator />
      <Form.Checkbox
        id="commentsEnabled"
        label="Enable comments"
        value={commentsEnabled}
        onChange={setCommentsEnabled}
      />
      <Form.Checkbox
        id="commentEmailsEnabled"
        label="Email notifications for comments"
        value={commentEmailsEnabled}
        onChange={setCommentEmailsEnabled}
      />
      <Form.Checkbox
        id="downloadsEnabled"
        label="Allow downloads"
        value={downloadsEnabled}
        onChange={setDownloadsEnabled}
      />
      <Form.Checkbox
        id="rawDownloadsEnabled"
        label="Allow raw file downloads"
        value={rawDownloadsEnabled}
        onChange={setRawDownloadsEnabled}
      />
      <Form.Checkbox
        id="searchEngineIndexingEnabled"
        label="Allow search engine indexing"
        value={searchEngineIndexingEnabled}
        onChange={setSearchEngineIndexingEnabled}
      />
      <Form.TextField
        id="customThumbnailURL"
        title="Custom Thumbnail"
        value={customThumbnailURL}
        onChange={setCustomThumbnailURL}
        placeholder="https://example.com/thumbnail.jpg"
      />
    </Form>
  );
}

function VideoItem({
  video,
  onRefresh,
  toggleViewMode,
  playlistId,
  playlistName,
}: {
  video: Video;
  onRefresh: () => void;
  toggleViewMode: () => void;
  playlistId?: string;
  playlistName?: string;
}) {
  const thumbnailUrl =
    video.thumbnails?.small?.jpg || video.thumbnails?.medium?.jpg;

  return (
    <List.Item
      title={video.name}
      subtitle={video.description}
      icon={thumbnailUrl ? { source: thumbnailUrl } : Icon.Video}
      accessories={[
        {
          text: formatDate(video.updatedAt),
          icon: Icon.Calendar,
        },
        {
          text: `${video.views.toLocaleString()} views`,
          icon: Icon.Eye,
        },
      ]}
      actions={
        <VideoActions
          video={video}
          onRefresh={onRefresh}
          toggleViewMode={toggleViewMode}
          playlistId={playlistId}
          playlistName={playlistName}
        />
      }
    />
  );
}

function VideoGridItem({
  video,
  onRefresh,
  toggleViewMode,
  playlistId,
  playlistName,
}: {
  video: Video;
  onRefresh: () => void;
  toggleViewMode: () => void;
  playlistId?: string;
  playlistName?: string;
}) {
  // Try multiple thumbnail sizes, preferring medium
  // Filter out empty strings and ensure URL is valid
  const thumbnailUrl =
    (video.thumbnails?.medium?.jpg && video.thumbnails.medium.jpg.trim()) ||
    (video.thumbnails?.large?.jpg && video.thumbnails.large.jpg.trim()) ||
    (video.thumbnails?.small?.jpg && video.thumbnails.small.jpg.trim()) ||
    (video.thumbnails?.xl?.jpg && video.thumbnails.xl.jpg.trim()) ||
    null;

  return (
    <Grid.Item
      content={thumbnailUrl || Icon.Video}
      title={video.name}
      subtitle={`${video.views.toLocaleString()} views`}
      actions={
        <VideoActions
          video={video}
          onRefresh={onRefresh}
          toggleViewMode={toggleViewMode}
          playlistId={playlistId}
          playlistName={playlistName}
        />
      }
    />
  );
}

function TranscriptView({
  videoId,
  videoName,
}: {
  videoId: string;
  videoName: string;
}) {
  const { data, isLoading, error } = useCachedPromise(
    async (id: string) => {
      const response = await getVideo(id);
      return response.video.transcript;
    },
    [videoId],
    {
      onError: (err: Error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load transcript",
          message: err.message,
        });
      },
    },
  );

  if (error) {
    const debugInfo = {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      command: "View Transcript",
      videoId,
      videoName,
    };
    const debugText = JSON.stringify(debugInfo, null, 2);

    return (
      <Detail
        markdown={`# ${videoName}\n\nError loading transcript: ${error.message}\n\n## Debug Info\n\n\`\`\`json\n${debugText}\n\`\`\`\n\nPress **Enter** to copy debug info.`}
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
            />
          </ActionPanel>
        }
      />
    );
  }

  if (isLoading) {
    return <Detail markdown={`# ${videoName}\n\nLoading transcript...`} />;
  }

  if (!data || data.status !== "ready") {
    return (
      <Detail
        markdown={`# ${videoName}\n\nTranscript is not available. Status: ${data?.status || "unknown"}`}
        actions={
          <ActionPanel>
            {data?.text && (
              <Action.CopyToClipboard
                content={data.text}
                title="Copy Transcript"
              />
            )}
          </ActionPanel>
        }
      />
    );
  }

  const markdown = `# ${videoName}\n\n${data.text}`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={data.text} title="Copy Transcript" />
        </ActionPanel>
      }
    />
  );
}

function CopyTranscriptAction({ videoId }: { videoId: string }) {
  return (
    <Action
      title="Copy Transcript"
      icon={Icon.Clipboard}
      onAction={async () => {
        try {
          const response = await getVideo(videoId);
          const transcript = response.video.transcript;
          if (!transcript || transcript.status !== "ready") {
            showToast({
              style: Toast.Style.Failure,
              title: "Transcript not available",
              message: `Status: ${transcript?.status || "unknown"}`,
            });
            return;
          }
          await Clipboard.copy(transcript.text);
          showToast({
            style: Toast.Style.Success,
            title: "Transcript copied",
          });
        } catch (error) {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to copy transcript",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }}
    />
  );
}

function AddToPlaylistAction({
  videoId,
  videoName,
  videoPlaylistIds,
  onRefresh,
}: {
  videoId: string;
  videoName: string;
  videoPlaylistIds?: string[];
  onRefresh: () => void;
}) {
  const { push } = useNavigation();
  const { data: playlists, revalidate } = useCachedPromise(async () => {
    const response = await listPlaylists({ limit: 100 });
    return response.playlists;
  });

  // Fetch full video details to get playlistIds if not provided
  // (list endpoint doesn't include playlistIds)
  const { data: fullVideo } = useCachedPromise(
    async (id: string, existingPlaylistIds: string[] | undefined) => {
      // Only fetch if playlistIds not already available
      if (existingPlaylistIds !== undefined) {
        return null;
      }
      const response = await getVideo(id);
      return response.video;
    },
    [videoId, videoPlaylistIds],
  );

  // Use provided playlistIds or fetch from full video
  const currentPlaylistIds = videoPlaylistIds ?? fullVideo?.playlistIds;

  // Check which playlists already contain this video
  const isInPlaylist = (playlistId: string): boolean => {
    return currentPlaylistIds?.includes(playlistId) ?? false;
  };

  return (
    <ActionPanel.Submenu title="Add to Playlist" icon={Icon.Plus}>
      <Action
        title="Create New Playlist…"
        icon={Icon.PlusCircle}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        onAction={() =>
          push(
            <CreatePlaylistAndAddVideoForm
              videoId={videoId}
              videoName={videoName}
              onSuccess={() => {
                revalidate();
                onRefresh();
              }}
            />,
          )
        }
      />
      {playlists && playlists.length > 0 && (
        <ActionPanel.Section>
          {playlists.map((playlist) => {
            const alreadyInPlaylist = isInPlaylist(playlist.id);
            return (
              <Action
                key={playlist.id}
                title={alreadyInPlaylist ? `${playlist.name} ✓` : playlist.name}
                icon={playlist.emoji ? { source: playlist.emoji } : Icon.Folder}
                onAction={async () => {
                  if (alreadyInPlaylist) {
                    showToast({
                      style: Toast.Style.Success,
                      title: "Already in playlist",
                      message: `"${videoName}" is already in "${playlist.name}"`,
                    });
                    return;
                  }
                  try {
                    await addVideoToPlaylist(playlist.id, videoId);
                    showToast({
                      style: Toast.Style.Success,
                      title: "Video added to playlist",
                      message: `Added "${videoName}" to "${playlist.name}"`,
                    });
                    onRefresh();
                  } catch (error) {
                    showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to add video to playlist",
                      message:
                        error instanceof Error ? error.message : String(error),
                    });
                  }
                }}
              />
            );
          })}
        </ActionPanel.Section>
      )}
      {playlists && playlists.length === 0 && (
        <Action title="No Playlists Available" icon={Icon.Info} />
      )}
    </ActionPanel.Submenu>
  );
}

function CreatePlaylistAndAddVideoForm({
  videoId,
  videoName,
  onSuccess,
}: {
  videoId: string;
  videoName: string;
  onSuccess: () => void;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("");
  const [visibility, setVisibility] = useState<"personal" | "org">("personal");

  const handleSubmit = async (values: {
    name: string;
    description: string;
    emoji: string;
    visibility: "personal" | "org";
  }) => {
    try {
      // Create the playlist
      const playlistData: CreatePlaylistRequest = {
        name: values.name,
        description: values.description || undefined,
        emoji: values.emoji || undefined,
        visibility: values.visibility || "personal",
      };
      const response = await createPlaylist(playlistData);
      const newPlaylist = response.playlist;

      // Add the video to the newly created playlist
      await addVideoToPlaylist(newPlaylist.id, videoId);

      showToast({
        style: Toast.Style.Success,
        title: "Playlist created and video added",
        message: `Created "${newPlaylist.name}" and added "${videoName}"`,
      });

      pop();
      onSuccess();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create playlist",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <Form
      navigationTitle="Create Playlist and Add Video"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Playlist and Add Video"
            onSubmit={handleSubmit}
            icon={Icon.CheckCircle}
          />
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Video"
        text={`"${videoName}" will be added to this playlist`}
      />
      <Form.TextField
        id="name"
        title="Name"
        placeholder="My Playlist"
        value={name}
        onChange={setName}
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="A collection of videos"
        value={description}
        onChange={setDescription}
      />
      <Form.TextField
        id="emoji"
        title="Emoji"
        placeholder="🎬"
        value={emoji}
        onChange={setEmoji}
      />
      <Form.Dropdown
        id="visibility"
        title="Visibility"
        value={visibility}
        onChange={(newValue) => setVisibility(newValue as "personal" | "org")}
      >
        <Form.Dropdown.Item value="personal" title="Personal" />
        <Form.Dropdown.Item value="org" title="Organization" />
      </Form.Dropdown>
    </Form>
  );
}

function ExportForm({
  videoId,
  videoName,
  onRefresh,
}: {
  videoId: string;
  videoName: string;
  onRefresh: () => void;
}) {
  const { pop } = useNavigation();
  const [granularity, setGranularity] = useState<"story" | "scenes" | "raw">(
    "story",
  );
  const [resolution, setResolution] = useState<"1080p" | "4k">("1080p");
  const [fps, setFps] = useState<"30" | "60">("30");
  const [subtitles, setSubtitles] = useState(false);
  const [speed, setSpeed] = useState<
    "1" | "0.5" | "0.75" | "1.25" | "1.5" | "1.75" | "2"
  >("1");

  const handleSubmit = async () => {
    try {
      const exportRequest: StartExportRequest = {
        granularity,
        resolution,
        fps,
        subtitles,
        speed,
      };
      await startVideoExport(videoId, exportRequest);
      showToast({
        style: Toast.Style.Success,
        title: "Export started",
        message: "Your export is being processed",
      });
      onRefresh();
      pop();
    } catch (error) {
      // Handle 501 Not Implemented gracefully
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      let userMessage = errorMessage;

      if (
        errorMessage.includes("501") ||
        errorMessage.includes("not_implemented") ||
        errorMessage.includes("coming soon")
      ) {
        userMessage =
          "Export functionality is coming soon. This feature is not yet available in the Tella API.";
      }

      showToast({
        style: Toast.Style.Failure,
        title: "Export not available",
        message: userMessage,
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Start Export"
            onSubmit={handleSubmit}
            icon={Icon.Download}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Video" text={videoName} />
      <Form.Dropdown
        id="granularity"
        title="Granularity"
        value={granularity}
        onChange={(newValue) =>
          setGranularity(newValue as "story" | "scenes" | "raw")
        }
      >
        <Form.Dropdown.Item value="story" title="Story (Full Video)" />
        <Form.Dropdown.Item value="scenes" title="Scenes (Individual)" />
        <Form.Dropdown.Item value="raw" title="Raw (Original Uploads)" />
      </Form.Dropdown>
      <Form.Dropdown
        id="resolution"
        title="Resolution"
        value={resolution}
        onChange={(newValue) => setResolution(newValue as "1080p" | "4k")}
      >
        <Form.Dropdown.Item value="1080p" title="1080p" />
        <Form.Dropdown.Item value="4k" title="4K" />
      </Form.Dropdown>
      <Form.Dropdown
        id="fps"
        title="FPS"
        value={fps}
        onChange={(newValue) => setFps(newValue as "30" | "60")}
      >
        <Form.Dropdown.Item value="30" title="30 fps" />
        <Form.Dropdown.Item value="60" title="60 fps (may require paid plan)" />
      </Form.Dropdown>
      <Form.Dropdown
        id="speed"
        title="Playback Speed"
        value={speed}
        onChange={(newValue) =>
          setSpeed(
            newValue as "1" | "0.5" | "0.75" | "1.25" | "1.5" | "1.75" | "2",
          )
        }
      >
        <Form.Dropdown.Item value="0.5" title="0.5x" />
        <Form.Dropdown.Item value="0.75" title="0.75x" />
        <Form.Dropdown.Item value="1" title="1x (Normal)" />
        <Form.Dropdown.Item value="1.25" title="1.25x" />
        <Form.Dropdown.Item value="1.5" title="1.5x" />
        <Form.Dropdown.Item value="1.75" title="1.75x" />
        <Form.Dropdown.Item value="2" title="2x" />
      </Form.Dropdown>
      <Form.Checkbox
        id="subtitles"
        title="Burn Subtitles"
        label="Burn subtitles into video"
        value={subtitles}
        onChange={setSubtitles}
      />
    </Form>
  );
}

function ExportStatusView({
  videoId,
  videoName,
  exports: videoExports,
}: {
  videoId: string;
  videoName: string;
  exports: Video["exports"];
}) {
  const {
    data: video,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (id: string) => {
      const response = await getVideo(id);
      return response.video;
    },
    [videoId],
    {
      onError: (err: Error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load exports",
          message: err.message,
        });
      },
    },
  );

  // Use fresh data if available, otherwise fall back to passed exports
  const exports = video?.exports || videoExports || [];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#10b981"; // green
      case "processing":
        return "#3b82f6"; // blue
      case "failed":
        return "#ef4444"; // red
      default:
        return "#6b7280"; // gray
    }
  };

  if (isLoading) {
    return <Detail markdown={`# ${videoName}\n\nLoading exports...`} />;
  }

  if (!exports || exports.length === 0) {
    return (
      <Detail
        markdown={`# ${videoName}\n\n## Exports\n\nNo exports found. Start a new export from the video actions.`}
        actions={
          <ActionPanel>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={revalidate}
            />
          </ActionPanel>
        }
      />
    );
  }

  const markdown = `# ${videoName}\n\n## Exports\n\n${exports
    .map((exp, index) => {
      const statusColor = getStatusColor(exp.status);
      const statusIcon =
        exp.status === "completed"
          ? "✅"
          : exp.status === "processing"
            ? "⏳"
            : exp.status === "failed"
              ? "❌"
              : "⏸️";
      return `### Export ${index + 1} ${statusIcon}\n\n- **Status**: <span style="color: ${statusColor}">${exp.status}</span>\n- **Progress**: ${exp.progress}%\n- **Updated**: ${formatDate(exp.updatedAt)}\n${exp.downloadUrl ? `- **Download**: Ready` : ""}\n`;
    })
    .join("\n")}`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {exports.map((exp) => {
            if (exp.status === "completed" && exp.downloadUrl) {
              return (
                <Action.OpenInBrowser
                  key={exp.exportId}
                  url={exp.downloadUrl}
                  title={`Download Export ${exp.exportId.slice(0, 8)}`}
                  icon={Icon.Download}
                />
              );
            }
            return null;
          })}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
