import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { MediaType, Media, RecentMedia } from "../types";

interface SearchResultsProps {
  mediaType: MediaType;
  searchText: string;
  searchResults: Media[];
  recentMedia: RecentMedia[];
  isLoading: boolean;
  isUsingAddon: boolean;
  getWatchedCount: (seriesId: string, season?: number) => number;
  onSearchTextChange: (text: string) => void;
  onMediaTypeChange: (type: MediaType) => void;
  onMediaSelect: (media: Media) => void;
  onRemoveFromRecent: (media: RecentMedia) => void;
  onClearRecent: () => void;
  onClearWatchHistory: () => void;
  onConfigure: () => void;
}

export function SearchResults({
  mediaType,
  searchText,
  searchResults,
  isUsingAddon,
  recentMedia,
  isLoading,
  getWatchedCount,
  onSearchTextChange,
  onMediaTypeChange,
  onMediaSelect,
  onRemoveFromRecent,
  onClearRecent,
  onClearWatchHistory,
  onConfigure,
}: SearchResultsProps) {
  // Filter recent media by current media type
  const filteredRecentMedia = recentMedia
    .filter((media) => (mediaType === "movie" ? media.type === "movie" : media.type === "series"))
    .slice(0, 10);

  const getMediaTypeToggle = () => {
    return mediaType === "movie" ? "Switch to TV Shows" : "Switch to Movies";
  };

  const handleMediaTypeToggle = () => {
    onMediaTypeChange(mediaType === "movie" ? "series" : "movie");
  };

  function MediaActions({ media, isRecent }: { media: Media | RecentMedia; isRecent?: boolean }) {
    return (
      <ActionPanel>
        {isUsingAddon ? <Action title="Show Streams" onAction={() => onMediaSelect(media)} icon={Icon.Link} /> : null}
        <Action.OpenInBrowser title="Open IMDB Page" url={`https://www.imdb.com/title/${media.imdb_id}`} />
        <Action
          title={getMediaTypeToggle()}
          onAction={handleMediaTypeToggle}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          icon={Icon.Switch}
        />
        {isRecent && (
          <>
            <Action
              title="Remove from Recent"
              onAction={() => onRemoveFromRecent(media as RecentMedia)}
              style={Action.Style.Destructive}
              icon={Icon.MinusCircle}
            />
            <Action
              title="Clear All Recent Items"
              onAction={onClearRecent}
              style={Action.Style.Destructive}
              icon={Icon.Trash}
            />
          </>
        )}
        <Action title="Configure" onAction={onConfigure} icon={Icon.Gear} />
      </ActionPanel>
    );
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={onSearchTextChange}
      searchBarPlaceholder={`Search for ${mediaType === "movie" ? "movies" : "TV shows"}...`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Media Type"
          value={mediaType}
          onChange={(newValue) => onMediaTypeChange(newValue as MediaType)}
        >
          <List.Dropdown.Item title="Movies" value="movie" />
          <List.Dropdown.Item title="TV Shows" value="series" />
        </List.Dropdown>
      }
      throttle
      actions={
        <ActionPanel>
          <Action
            title={getMediaTypeToggle()}
            onAction={handleMediaTypeToggle}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            icon={Icon.Switch}
          />
          <Action title="Configure" onAction={onConfigure} icon={Icon.Gear} />
          <Action title="Clear Recent Items" onAction={onClearRecent} style={Action.Style.Destructive} />
          <Action title="Clear Watch History" onAction={onClearWatchHistory} style={Action.Style.Destructive} />
        </ActionPanel>
      }
    >
      {/* Show recent items when not searching */}
      {searchText.length === 0 && filteredRecentMedia.length > 0 && (
        <List.Section title="Recent" subtitle={`${filteredRecentMedia.length} items`}>
          {filteredRecentMedia.map((media) => {
            const watchedCount = media.type === "series" ? getWatchedCount(media.id) : 0;

            return (
              <List.Item
                key={`recent-${media.id}`}
                title={media.name}
                subtitle={`${media.type === "movie" ? "Movie" : "TV Series"} • ${media.releaseInfo} • ${new Date(media.lastAccessedAt).toLocaleDateString()}`}
                icon={media.poster}
                accessories={[
                  { text: "Recent", icon: "🕒" },
                  ...(media.type === "series" && watchedCount > 0
                    ? [{ text: `${watchedCount} watched`, icon: "✅" }]
                    : []),
                ]}
                actions={<MediaActions media={media} isRecent />}
              />
            );
          })}
        </List.Section>
      )}

      {/* Show search results */}
      {searchText.length > 0 && (
        <List.Section title="Results" subtitle={searchResults.length ? `${searchResults.length} found` : "0 found"}>
          {searchResults.map((media) => {
            const watchedCount = media.type === "series" ? getWatchedCount(media.id) : 0;

            return (
              <List.Item
                key={media.id}
                title={media.name}
                subtitle={`${media.type === "movie" ? "Movie" : "TV Series"} • ${media.releaseInfo}`}
                icon={media.poster}
                accessories={[
                  ...(media.type === "series" && watchedCount > 0
                    ? [{ text: `${watchedCount} watched`, icon: "✅" }]
                    : []),
                ]}
                actions={<MediaActions media={media} />}
              />
            );
          })}
        </List.Section>
      )}

      {/* Show empty state when no search and no recent items */}
      {searchText.length === 0 && filteredRecentMedia.length === 0 && (
        <List.EmptyView
          title="No Recent Items"
          description={`Start searching for ${mediaType === "movie" ? "movies" : "TV shows"} to see them here`}
          icon="🎬"
        />
      )}

      {/* Show empty state for search with no results */}
      {searchText.length > 0 && searchResults.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Results Found"
          description={`No ${mediaType === "movie" ? "movies" : "TV shows"} found for "${searchText}"`}
          icon="🔍"
        />
      )}
    </List>
  );
}
