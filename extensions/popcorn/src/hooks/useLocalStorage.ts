import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { RecentMedia, WatchedEpisode, Media, Episode } from "../types";
import { showFailureToast } from "@raycast/utils";

const STORAGE_KEYS = {
  RECENT_MEDIA: "recent_media",
  SEASON_SELECTIONS: "season_selections",
  EPISODE_SELECTIONS: "episode_selections",
  WATCHED_EPISODES: "watched_episodes",
  LAST_SEARCH_TYPE: "last_search_type",
  TERMS_ACCEPTED: "terms_accepted",
  WATCHED_FILTER: "watched_filter",
};

export function useLocalStorage() {
  const [recentMedia, setRecentMedia] = useState<RecentMedia[]>([]);
  const [watchedEpisodes, setWatchedEpisodes] = useState<WatchedEpisode[]>([]);

  useEffect(() => {
    loadLastSearchType();
    loadRecentMedia();
    loadWatchedEpisodes();
  }, []);

  const loadLastSearchType = async (): Promise<Media["type"]> => {
    try {
      const stored = await LocalStorage.getItem<string>(STORAGE_KEYS.LAST_SEARCH_TYPE);
      return stored === "series" ? "series" : "movie";
    } catch (error) {
      showFailureToast(error, { title: "Failed to load last search type:" });
      return "movie";
    }
  };

  const saveLastSearchType = async (type: Media["type"]) => {
    try {
      await LocalStorage.setItem(STORAGE_KEYS.LAST_SEARCH_TYPE, type);
    } catch (error) {
      showFailureToast(error, { title: "Failed to save last search type:" });
    }
  };

  const checkTermsAccepted = async (): Promise<boolean> => {
    try {
      const accepted = await LocalStorage.getItem<string>(STORAGE_KEYS.TERMS_ACCEPTED);
      return accepted === "true";
    } catch {
      return false;
    }
  };

  const saveTermsAcceptance = async (): Promise<void> => {
    try {
      await LocalStorage.setItem(STORAGE_KEYS.TERMS_ACCEPTED, "true");
    } catch (error) {
      showFailureToast(error, { title: "Failed to save terms acceptance:" });
      throw error;
    }
  };

  const resetTermsAcceptance = async (): Promise<void> => {
    try {
      await LocalStorage.removeItem(STORAGE_KEYS.TERMS_ACCEPTED);
    } catch (error) {
      showFailureToast(error, { title: "Failed to reset terms acceptance:" });
    }
  };

  const loadRecentMedia = async () => {
    try {
      const stored = await LocalStorage.getItem<string>(STORAGE_KEYS.RECENT_MEDIA);
      if (stored) {
        const parsed: RecentMedia[] = JSON.parse(stored);
        setRecentMedia(
          parsed.sort((a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime()),
        );
      }
    } catch (error) {
      showFailureToast(error, { title: "Failed to load recent media:" });
    }
  };

  const loadWatchedEpisodes = async () => {
    try {
      const stored = await LocalStorage.getItem<string>(STORAGE_KEYS.WATCHED_EPISODES);
      if (stored) {
        const parsed: WatchedEpisode[] = JSON.parse(stored);
        setWatchedEpisodes(parsed);
      }
    } catch (error) {
      showFailureToast(error, { title: "Failed to load watched episodes:" });
    }
  };

  const saveRecentMedia = async (media: Media) => {
    try {
      const existing = await LocalStorage.getItem<string>(STORAGE_KEYS.RECENT_MEDIA);
      let recentList: RecentMedia[] = existing ? JSON.parse(existing) : [];

      recentList = recentList.filter((item) => item.id !== media.id);

      const recentMedia: RecentMedia = {
        ...media,
        lastAccessedAt: new Date().toISOString(),
      };
      recentList.unshift(recentMedia);
      recentList = recentList.slice(0, 20);

      await LocalStorage.setItem(STORAGE_KEYS.RECENT_MEDIA, JSON.stringify(recentList));
      setRecentMedia(recentList);
    } catch (error) {
      showFailureToast(error, { title: "Failed to save recent media:" });
    }
  };

  const saveSeasonSelection = async (mediaId: string, season: number) => {
    try {
      const existing = await LocalStorage.getItem<string>(STORAGE_KEYS.SEASON_SELECTIONS);
      const selections: Record<string, number> = existing ? JSON.parse(existing) : {};
      selections[mediaId] = season;
      await LocalStorage.setItem(STORAGE_KEYS.SEASON_SELECTIONS, JSON.stringify(selections));
    } catch (error) {
      showFailureToast(error, { title: "Failed to save season selection:" });
    }
  };

  const saveEpisodeSelection = async (mediaId: string, episodeId: string) => {
    try {
      const existing = await LocalStorage.getItem<string>(STORAGE_KEYS.EPISODE_SELECTIONS);
      const selections: Record<string, string> = existing ? JSON.parse(existing) : {};
      selections[mediaId] = episodeId;
      await LocalStorage.setItem(STORAGE_KEYS.EPISODE_SELECTIONS, JSON.stringify(selections));
    } catch (error) {
      showFailureToast(error, { title: "Failed to save episode selection:" });
    }
  };

  const markEpisodeAsWatched = async (episode: Episode, seriesId: string) => {
    try {
      const existing = await LocalStorage.getItem<string>(STORAGE_KEYS.WATCHED_EPISODES);
      let watchedList: WatchedEpisode[] = existing ? JSON.parse(existing) : [];

      watchedList = watchedList.filter((item) => item.episodeId !== episode.id);

      const watchedEpisode: WatchedEpisode = {
        episodeId: episode.id,
        watchedAt: new Date().toISOString(),
        seriesId: seriesId,
        season: episode.season,
        episode: episode.number,
      };
      watchedList.push(watchedEpisode);

      await LocalStorage.setItem(STORAGE_KEYS.WATCHED_EPISODES, JSON.stringify(watchedList));
      setWatchedEpisodes(watchedList);

      showToast({
        style: Toast.Style.Success,
        title: "Marked as watched",
        message: `${episode.name}`,
      });
    } catch (error) {
      showFailureToast(error, { title: "Failed to save watched episode:" });
    }
  };

  const markEpisodeAsUnwatched = async (episode: Episode) => {
    try {
      const existing = await LocalStorage.getItem<string>(STORAGE_KEYS.WATCHED_EPISODES);
      let watchedList: WatchedEpisode[] = existing ? JSON.parse(existing) : [];

      watchedList = watchedList.filter((item) => item.episodeId !== episode.id);

      await LocalStorage.setItem(STORAGE_KEYS.WATCHED_EPISODES, JSON.stringify(watchedList));
      setWatchedEpisodes(watchedList);

      showToast({
        style: Toast.Style.Success,
        title: "Marked as unwatched",
        message: `${episode.name}`,
      });
    } catch (error) {
      showFailureToast(error, { title: "Failed to remove watched episode:" });
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to mark as unwatched",
      });
    }
  };

  const markSeasonAsWatched = async (season: number, episodes: Episode[], seriesId: string) => {
    try {
      const existing = await LocalStorage.getItem<string>(STORAGE_KEYS.WATCHED_EPISODES);
      let watchedList: WatchedEpisode[] = existing ? JSON.parse(existing) : [];

      watchedList = watchedList.filter((item) => !(item.seriesId === seriesId && item.season === season));

      const newWatchedEpisodes: WatchedEpisode[] = episodes.map((episode) => ({
        episodeId: episode.id,
        watchedAt: new Date().toISOString(),
        seriesId: seriesId,
        season: episode.season,
        episode: episode.number,
      }));

      watchedList.push(...newWatchedEpisodes);

      await LocalStorage.setItem(STORAGE_KEYS.WATCHED_EPISODES, JSON.stringify(watchedList));
      setWatchedEpisodes(watchedList);

      showToast({
        style: Toast.Style.Success,
        title: "Season marked as watched",
        message: `Season ${season} (${episodes.length} episodes)`,
      });
    } catch (error) {
      showFailureToast(error, { title: "Failed to mark season as watched:" });
      showFailureToast({
        style: Toast.Style.Failure,
        title: "Failed to mark season as watched",
      });
    }
  };

  const loadWatchedFilter = async (): Promise<"all" | "watched" | "unwatched"> => {
    try {
      const stored = await LocalStorage.getItem<string>(STORAGE_KEYS.WATCHED_FILTER);
      return (stored as "all" | "watched" | "unwatched") || "all";
    } catch (error) {
      showFailureToast(error, { title: "Failed to load watched filter:" });
      return "all";
    }
  };

  const saveWatchedFilter = async (filter: "all" | "watched" | "unwatched") => {
    try {
      await LocalStorage.setItem(STORAGE_KEYS.WATCHED_FILTER, filter);
    } catch (error) {
      showFailureToast(error, { title: "Failed to save watched filter:" });
    }
  };

  const loadSeasonSelection = async (mediaId: string): Promise<number | null> => {
    try {
      const existing = await LocalStorage.getItem<string>(STORAGE_KEYS.SEASON_SELECTIONS);
      const selections: Record<string, number> = existing ? JSON.parse(existing) : {};
      return selections[mediaId] || null;
    } catch (error) {
      showFailureToast(error, { title: "Failed to load season selection:" });
      return null;
    }
  };

  const loadEpisodeSelection = async (mediaId: string): Promise<string | null> => {
    try {
      const existing = await LocalStorage.getItem<string>(STORAGE_KEYS.EPISODE_SELECTIONS);
      const selections: Record<string, string> = existing ? JSON.parse(existing) : {};
      return selections[mediaId] || null;
    } catch (error) {
      showFailureToast(error, { title: "Failed to load episode selection:" });
      return null;
    }
  };

  const isEpisodeWatched = (episodeId: string): boolean => {
    return watchedEpisodes.some((watched) => watched.episodeId === episodeId);
  };

  const getWatchedCount = (seriesId: string, season?: number): number => {
    return watchedEpisodes.filter(
      (watched) => watched.seriesId === seriesId && (season !== undefined ? watched.season === season : true),
    ).length;
  };

  const removeFromRecent = async (mediaId: string) => {
    try {
      const existing = await LocalStorage.getItem<string>(STORAGE_KEYS.RECENT_MEDIA);
      let recentList: RecentMedia[] = existing ? JSON.parse(existing) : [];

      recentList = recentList.filter((item) => item.id !== mediaId);

      await LocalStorage.setItem(STORAGE_KEYS.RECENT_MEDIA, JSON.stringify(recentList));
      setRecentMedia(recentList);
    } catch (error) {
      showFailureToast(error, { title: "Failed to remove from recent:" });
    }
  };

  const clearRecentItems = async () => {
    await LocalStorage.removeItem(STORAGE_KEYS.RECENT_MEDIA);
    await LocalStorage.removeItem(STORAGE_KEYS.SEASON_SELECTIONS);
    await LocalStorage.removeItem(STORAGE_KEYS.EPISODE_SELECTIONS);
    setRecentMedia([]);
  };

  const clearWatchHistory = async () => {
    await LocalStorage.removeItem(STORAGE_KEYS.WATCHED_EPISODES);
    setWatchedEpisodes([]);
  };

  return {
    loadLastSearchType,
    saveLastSearchType,
    recentMedia,
    watchedEpisodes,
    saveRecentMedia,
    saveSeasonSelection,
    saveEpisodeSelection,
    markEpisodeAsWatched,
    markEpisodeAsUnwatched,
    markSeasonAsWatched,
    loadWatchedFilter,
    saveWatchedFilter,
    loadSeasonSelection,
    loadEpisodeSelection,
    isEpisodeWatched,
    getWatchedCount,
    removeFromRecent,
    clearRecentItems,
    clearWatchHistory,
    checkTermsAccepted,
    saveTermsAcceptance,
    resetTermsAcceptance,
  };
}
