import React, { useState, useEffect, useMemo } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  getVideoCache,
  formatRelativeTime,
  getDurationCache,
  setDurationCache,
} from "./cache";
import { listVideos, listPlaylists, getVideo, MissingApiKeyError } from "./api";
import type { Video } from "./types";
import { FETCH_CONCURRENCY, BATCH_DELAY_MS } from "./utils";
import BrowseVideos from "./browse-videos";
import BrowsePlaylists from "./browse-playlists";
import { MissingApiKeyDetail } from "./components";
import {
  formatDate as formatDateRelative,
  formatNumber,
  formatDuration,
  estimateBatchTime,
} from "./utils";

interface Metrics {
  totalVideos: number;
  totalViews: number;
  totalWatchTime: number; // Total duration in seconds
  topVideos: Video[];
  recentVideos: Video[];
  thisWeek: number;
  thisMonth: number;
}

function calculateMetrics(videos: Video[]): Metrics {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return {
    totalVideos: videos.length,
    totalViews: videos.reduce((sum, v) => sum + v.views, 0),
    totalWatchTime: videos.reduce(
      (sum, v) => sum + (v.durationSeconds || 0),
      0,
    ),
    topVideos: [...videos].sort((a, b) => b.views - a.views).slice(0, 3),
    recentVideos: [...videos]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 3),
    thisWeek: videos.filter(
      (v) => new Date(v.createdAt).getTime() > weekAgo.getTime(),
    ).length,
    thisMonth: videos.filter(
      (v) => new Date(v.createdAt).getTime() > monthAgo.getTime(),
    ).length,
  };
}

// Helper to batch fetch video details with concurrency limit and rate limiting
async function fetchVideoDetails(
  videoIds: string[],
  concurrency = FETCH_CONCURRENCY,
  delayBetweenBatches = BATCH_DELAY_MS,
  onProgress?: (current: number, total: number) => void,
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

    if (onProgress) {
      onProgress(Math.min(i + concurrency, videoIds.length), videoIds.length);
    }
  }
  return results;
}

export default function Overview() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [cachedDurations, setCachedDurations] = useState<Record<
    string,
    number
  > | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncingDurations, setIsSyncingDurations] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState(false);

  // Load cached videos and durations on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load video cache
        const videoCache = await getVideoCache();
        if (videoCache && videoCache.videos.length > 0) {
          setVideos(videoCache.videos);
          setLastSynced(videoCache.fetchedAt);
          setIsLoading(false);
        } else {
          // No cache - fetch all videos
          setIsLoading(true);
          const allVideos: Video[] = [];
          let cursor: string | undefined;
          let hasMore = true;

          while (hasMore) {
            const response = await listVideos({ cursor, limit: 50 });
            allVideos.push(...response.videos);
            cursor = response.pagination.nextCursor;
            hasMore = response.pagination.hasMore;
          }

          setVideos(allVideos);
          setLastSynced(new Date().toISOString());
          setIsLoading(false);
        }

        // Load duration cache (separate from video cache)
        const durationCache = await getDurationCache();
        if (durationCache) {
          setCachedDurations(durationCache.durations);
        }
      } catch (error) {
        if (error instanceof MissingApiKeyError) {
          setApiKeyError(true);
          setIsLoading(false);
          return;
        }
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load videos",
          message: error instanceof Error ? error.message : "Unknown error",
        });
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Fetch playlists count
  const { data: playlistsData } = useCachedPromise(
    async () => {
      try {
        const response = await listPlaylists({ limit: 100 });
        return response.playlists.length;
      } catch {
        return 0;
      }
    },
    [],
    {
      onError: () => {
        // Silently fail - playlists count is nice to have but not critical
      },
    },
  );

  // Calculate total watch time from cached durations
  const totalWatchTime = useMemo(() => {
    if (!cachedDurations) return null;
    return videos.reduce((sum, v) => sum + (cachedDurations[v.id] || 0), 0);
  }, [videos, cachedDurations]);

  const metrics = useMemo(() => calculateMetrics(videos), [videos]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const allVideos: Video[] = [];
      let cursor: string | undefined;
      let hasMore = true;

      while (hasMore) {
        const response = await listVideos({ cursor, limit: 50 });
        allVideos.push(...response.videos);
        cursor = response.pagination.nextCursor;
        hasMore = response.pagination.hasMore;
      }

      setVideos(allVideos);
      setLastSynced(new Date().toISOString());
      showToast({
        style: Toast.Style.Success,
        title: "Dashboard refreshed",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to refresh",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncDurations = async () => {
    if (videos.length === 0) return;

    setIsSyncingDurations(true);
    const estimatedTime = estimateBatchTime(videos.length);
    showToast({
      style: Toast.Style.Animated,
      title: "Syncing watch times...",
      message: `${videos.length} videos • ${estimatedTime}`,
    });

    try {
      const videoIds = videos.map((v) => v.id);
      const detailsMap = await fetchVideoDetails(videoIds);

      // Extract durations and cache them
      const durations: Record<string, number> = {};
      Object.entries(detailsMap).forEach(([id, video]) => {
        if (video.durationSeconds !== undefined) {
          durations[id] = video.durationSeconds;
        }
      });

      await setDurationCache(durations);
      setCachedDurations(durations);

      showToast({
        style: Toast.Style.Success,
        title: "Watch times synced",
        message: `${Object.keys(durations).length} video durations cached`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to sync watch times",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSyncingDurations(false);
    }
  };

  if (apiKeyError) {
    return <MissingApiKeyDetail />;
  }

  if (videos.length === 0 && !isLoading) {
    return (
      <List
        isLoading={false}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Open Tella"
              url="https://www.tella.tv"
              icon={Icon.Globe}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={handleRefresh}
            />
          </ActionPanel>
        }
      >
        <List.EmptyView
          icon={Icon.Video}
          title="No Videos"
          description="Create your first video to see stats here!"
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search overview..."
      actions={
        <ActionPanel>
          <Action
            title="Sync Now"
            icon={Icon.ArrowClockwise}
            onAction={handleRefresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action.Push
            title="Videos"
            icon={Icon.Video}
            target={<BrowseVideos />}
          />
          <Action.Push
            title="Playlists"
            icon={Icon.Folder}
            target={<BrowsePlaylists />}
          />
          <Action.OpenInBrowser
            title="Open Tella"
            url="https://www.tella.tv"
            icon={Icon.Globe}
          />
        </ActionPanel>
      }
    >
      {/* Quick Stats Section */}
      <List.Section title="Quick Stats">
        <List.Item
          title="Total Views"
          subtitle={formatNumber(metrics.totalViews)}
          icon={Icon.Eye}
          accessories={[
            {
              text: `${metrics.totalVideos} video${metrics.totalVideos !== 1 ? "s" : ""}`,
            },
          ]}
        />
        <List.Item
          title="Total Watch Time"
          subtitle={
            isSyncingDurations
              ? "Syncing..."
              : totalWatchTime !== null
                ? formatDuration(totalWatchTime)
                : "—"
          }
          icon={Icon.Clock}
          accessories={
            totalWatchTime === null && !isSyncingDurations
              ? [{ text: "Sync to calculate", icon: Icon.ArrowClockwise }]
              : [
                  {
                    text: `${metrics.totalVideos} video${metrics.totalVideos !== 1 ? "s" : ""}`,
                  },
                ]
          }
          actions={
            <ActionPanel>
              <Action
                title="Sync Watch Times"
                icon={Icon.ArrowClockwise}
                onAction={handleSyncDurations}
              />
              <Action
                title="Sync Now"
                icon={Icon.ArrowClockwise}
                onAction={handleRefresh}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Playlists"
          subtitle={playlistsData?.toLocaleString() || "—"}
          icon={Icon.Layers}
        />
        {lastSynced && (
          <List.Item
            title="Last Synced"
            subtitle={formatRelativeTime(lastSynced)}
            icon={Icon.Clock}
            actions={
              <ActionPanel>
                <Action
                  title="Sync Now"
                  icon={Icon.ArrowClockwise}
                  onAction={handleRefresh}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action.Push
                  title="Browse Videos"
                  icon={Icon.Video}
                  target={<BrowseVideos />}
                />
                <Action.Push
                  title="Browse Playlists"
                  icon={Icon.Folder}
                  target={<BrowsePlaylists />}
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      {/* Top Videos Section */}
      {metrics.topVideos.length > 0 && (
        <List.Section title="Top Videos">
          {metrics.topVideos.map((video, index) => {
            const thumbnailUrl =
              video.thumbnails?.small?.jpg || video.thumbnails?.medium?.jpg;
            return (
              <List.Item
                key={video.id}
                title={video.name}
                subtitle={`${video.views.toLocaleString()} views`}
                icon={thumbnailUrl ? { source: thumbnailUrl } : Icon.Video}
                accessories={[
                  {
                    text: `#${index + 1}`,
                    icon: Icon.Star,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      url={video.links.viewPage}
                      title="Open in Browser"
                    />
                    <Action.Push
                      title="Browse All Videos"
                      icon={Icon.Video}
                      target={<BrowseVideos />}
                    />
                    <Action.OpenInBrowser
                      title="Open Tella"
                      url="https://www.tella.tv"
                      icon={Icon.Globe}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {/* Recent Videos Section */}
      {metrics.recentVideos.length > 0 && (
        <List.Section title="Recent Videos">
          {metrics.recentVideos.map((video) => {
            const dateStr = formatDateRelative(video.createdAt);
            const thumbnailUrl =
              video.thumbnails?.small?.jpg || video.thumbnails?.medium?.jpg;
            return (
              <List.Item
                key={video.id}
                title={video.name}
                subtitle={dateStr}
                icon={thumbnailUrl ? { source: thumbnailUrl } : Icon.Video}
                accessories={[
                  {
                    text: `${video.views.toLocaleString()} views`,
                    icon: Icon.Eye,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      url={video.links.viewPage}
                      title="Open in Browser"
                    />
                    <Action.Push
                      title="Browse All Videos"
                      icon={Icon.Video}
                      target={<BrowseVideos />}
                    />
                    <Action.OpenInBrowser
                      title="Open Tella"
                      url="https://www.tella.tv"
                      icon={Icon.Globe}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {/* Content Volume Section */}
      <List.Section title="Content Volume">
        <List.Item
          title="This Week"
          subtitle={`${metrics.thisWeek} video${metrics.thisWeek !== 1 ? "s" : ""}`}
          icon={Icon.Calendar}
        />
        <List.Item
          title="This Month"
          subtitle={`${metrics.thisMonth} video${metrics.thisMonth !== 1 ? "s" : ""}`}
          icon={Icon.Calendar}
        />
        <List.Item
          title="All Time"
          subtitle={`${metrics.totalVideos} video${metrics.totalVideos !== 1 ? "s" : ""}`}
          icon={Icon.Document}
        />
      </List.Section>
    </List>
  );
}
