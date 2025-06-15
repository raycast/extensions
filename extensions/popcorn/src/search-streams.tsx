import {
  Alert,
  Application,
  clearSearchBar,
  confirmAlert,
  getApplications,
  getPreferenceValues,
  openCommandPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { MediaType, Media, Episode, Preferences, RecentMedia } from "./types";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useStremioApi } from "./hooks/useStremioApi";
import { StreamList } from "./components/StreamList";
import { EpisodeList } from "./components/EpisodeList";
import { SearchResults } from "./components/SearchResults";
import { usePromise } from "@raycast/utils";

export default function Command() {
  const [mediaType, setMediaType] = useState<MediaType>("movie");
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();

  // Load preferences
  const preferences = getPreferenceValues<Preferences>();
  const { baseUrl } = preferences;

  const streamingAppsFromPreferences = useMemo(() => {
    return preferences.streamingApps
      ? preferences.streamingApps
          .toLowerCase()
          .split(",")
          .map((app: string) => app.trim())
          .filter((app: string) => app.length > 0)
      : ["iina", "vlc"];
  }, [preferences.streamingApps]);

  const { data: applications } = usePromise(async () => await getApplications());

  const streamingApps = useMemo(() => {
    if (!applications) return [];
    return applications
      .filter((app) => streamingAppsFromPreferences.includes(app.name.toLowerCase()))
      .sort((a, b) => {
        // Sort the applications based on their order in preferences
        const indexA = streamingAppsFromPreferences.indexOf(a.name.toLowerCase());
        const indexB = streamingAppsFromPreferences.indexOf(b.name.toLowerCase());
        return indexA - indexB;
      });
  }, [applications]);

  // Hooks
  const api = useStremioApi(baseUrl);
  const storage = useLocalStorage();

  // API calls
  const { data: searchResults, isLoading: isLoadingSearch } = api.useSearch(mediaType, searchText);
  const { data: trendingMedia, isLoading: isLoadingTrending } = api.useTrending(mediaType);

  const isUsingAddon = !!baseUrl && baseUrl.trim() !== "";

  // Load last search type from storage
  useEffect(() => {
    (async () => {
      const lastType = await storage.loadLastSearchType();
      setMediaType(lastType);
    })();
  }, []);

  const handleMediaTypeChange = async (type: MediaType) => {
    setMediaType(type);
    await storage.saveLastSearchType(type);
  };

  // Handlers
  const handleMediaSelection = async (media: Media) => {
    await clearSearchBar();
    await storage.saveRecentMedia(media);

    if (media.type === "movie") {
      // Push streams view for movies
      push(<StreamsView media={media} api={api} storage={storage} streamingApps={streamingApps} />);
    } else {
      // Push episodes view for series
      push(<EpisodesView media={media} api={api} storage={storage} streamingApps={streamingApps} />);
    }
  };

  const handleRemoveFromRecent = async (media: RecentMedia) => {
    await storage.removeFromRecent(media.id);
    showToast({ style: Toast.Style.Success, title: "Removed from recent" });
  };

  const handleConfigure = () => {
    openCommandPreferences();
  };

  const handleClearRecent = async () => {
    await confirmAlert({
      title: "Clear Recent Items",
      message: "Are you sure you want to clear all recent items?",
      primaryAction: {
        title: "Clear",
        style: Alert.ActionStyle.Destructive,
        onAction: async () => {
          await storage.clearRecentItems();
          showToast({ style: Toast.Style.Success, title: "Recent items cleared" });
        },
      },
      dismissAction: {
        title: "Cancel",
      },
    });
  };

  const handleClearWatchHistory = async () => {
    await confirmAlert({
      title: "Clear Watch History",
      message: "Are you sure you want to clear all watch history?",
      primaryAction: {
        title: "Clear",
        style: Alert.ActionStyle.Destructive,
        onAction: async () => {
          await storage.clearWatchHistory();
          showToast({ style: Toast.Style.Success, title: "Watch history cleared" });
        },
      },
      dismissAction: {
        title: "Cancel",
      },
    });
  };

  // Main search view
  return (
    <SearchResults
      mediaType={mediaType}
      searchText={searchText}
      searchResults={searchResults || []}
      recentMedia={storage.recentMedia}
      trendingMedia={trendingMedia || []}
      isUsingAddon={isUsingAddon}
      isLoading={isLoadingSearch || isLoadingTrending}
      getWatchedCount={storage.getWatchedCount}
      onSearchTextChange={(text) => setSearchText(text)}
      onMediaTypeChange={handleMediaTypeChange}
      onMediaSelect={handleMediaSelection}
      onRemoveFromRecent={handleRemoveFromRecent}
      onClearRecent={handleClearRecent}
      onClearWatchHistory={handleClearWatchHistory}
      onConfigure={handleConfigure}
    />
  );
}

function EpisodesView({
  media,
  api,
  storage,
  streamingApps,
}: {
  media: Media;
  api: ReturnType<typeof useStremioApi>;
  storage: ReturnType<typeof useLocalStorage>;
  streamingApps: Application[];
}) {
  const [selectedSeason, setSelectedSeason] = useState<string>("all");
  const [showWatchedFilter, setShowWatchedFilter] = useState<"all" | "watched" | "unwatched">("all");
  const { push } = useNavigation();

  const { data: seriesDetails, isLoading: isLoadingSeriesDetails } = api.useSeriesDetails(media, null);

  useEffect(() => {
    (async () => {
      const lastSeason = await storage.loadSeasonSelection(media.id);
      if (lastSeason) {
        setSelectedSeason(lastSeason.toString());
      }
    })();
  }, []);

  const handleEpisodeSelection = async (episode: Episode) => {
    await storage.saveEpisodeSelection(media.id, episode.id);
    push(<StreamsView media={media} episode={episode} api={api} storage={storage} streamingApps={streamingApps} />);
  };

  const handleSeasonChange = async (season: string) => {
    setSelectedSeason(season);
    if (season !== "all") {
      await storage.saveSeasonSelection(media.id, parseInt(season));
    }
  };

  return (
    <EpisodeList
      media={media}
      episodes={seriesDetails || []}
      selectedSeason={selectedSeason}
      showWatchedFilter={showWatchedFilter}
      isLoading={isLoadingSeriesDetails}
      isEpisodeWatched={storage.isEpisodeWatched}
      getWatchedCount={storage.getWatchedCount}
      watchedEpisodes={storage.watchedEpisodes}
      markEpisodeAsWatched={storage.markEpisodeAsWatched}
      markEpisodeAsUnwatched={storage.markEpisodeAsUnwatched}
      markSeasonAsWatched={storage.markSeasonAsWatched}
      onEpisodeSelect={handleEpisodeSelection}
      onSeasonChange={handleSeasonChange}
      onWatchedFilterChange={setShowWatchedFilter}
      onConfigure={() => openCommandPreferences()}
    />
  );
}

// Separate component for streams view
function StreamsView({
  media,
  episode,
  api,
  storage,
  streamingApps,
}: {
  media: Media;
  episode?: Episode | null;
  api: ReturnType<typeof useStremioApi>;
  storage: ReturnType<typeof useLocalStorage>;
  streamingApps: Application[];
}) {
  const { data: streamData, isLoading: isLoadingStreams } = api.useStreams(media, episode || null);
  return (
    <StreamList
      streams={streamData}
      media={media}
      episode={episode}
      isLoading={isLoadingStreams}
      isEpisodeWatched={storage.isEpisodeWatched}
      markEpisodeAsWatched={storage.markEpisodeAsWatched}
      streamingAppsArray={streamingApps}
      markEpisodeAsUnwatched={storage.markEpisodeAsUnwatched}
      onConfigure={() => openCommandPreferences()}
    />
  );
}
