// @ts-nocheck - Raycast API type definitions have compatibility issues with TypeScript strict mode
import { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { searchSpotify } from "./utils/spotify";
import { SpotifyTrack, SpotifyPlaylist, SpotifyArtist } from "./types";

interface Preferences {
  clientId: string;
  clientSecret: string;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatFollowers(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [artists, setArtists] = useState<SpotifyArtist[]>([]);
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const preferences = getPreferenceValues<Preferences>();
    if (!preferences.clientId || !preferences.clientSecret) {
      showToast({
        style: Toast.Style.Failure,
        title: "Configuration Required",
        message:
          "Please set your Spotify Client ID and Client Secret in preferences",
      });
    }
  }, []);

  useEffect(() => {
    if (searchText.length === 0) {
      setArtists([]);
      setTracks([]);
      setPlaylists([]);
      setHasSearched(false);
      return;
    }

    const performSearch = async () => {
      setIsLoading(true);
      setHasSearched(true);
      try {
        const results = await searchSpotify(searchText, 15);
        setArtists(results.artists.items);
        setTracks(results.tracks.items);
        setPlaylists(
          results.playlists.items.filter(
            (p): p is SpotifyPlaylist => p !== null && p !== undefined,
          ),
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error occurred";
        showToast({
          style: Toast.Style.Failure,
          title: "Search Failed",
          message: message,
        });
        setArtists([]);
        setTracks([]);
        setPlaylists([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchText]);

  const hasResults =
    artists.length > 0 || tracks.length > 0 || playlists.length > 0;
  const showEmptyState = hasSearched && !isLoading && !hasResults;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for artists, songs, or playlists on Spotify..."
      throttle
    >
      {showEmptyState && (
        // @ts-expect-error - Raycast API type definition issue
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No results found"
          description="Try searching for something else"
        />
      )}

      {artists.length > 0 ? (
        <List.Section title="Artists">
          {artists.map((artist) => (
            <List.Item
              key={artist.id}
              title={artist.name}
              subtitle={artist.genres.slice(0, 3).join(", ") || "Artist"}
              accessoryTitle={`${formatFollowers(artist.followers.total)} followers`}
              icon={artist.images[0]?.url || Icon.Person}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open in Spotify"
                    url={`spotify:artist:${artist.id}`}
                    icon={Icon.Music}
                  />
                  <Action.OpenInBrowser
                    title="Open in Web Player"
                    url={artist.external_urls.spotify}
                    icon={Icon.Globe}
                  />
                  <Action.CopyToClipboard
                    title="Copy Artist URL"
                    content={artist.external_urls.spotify}
                    icon={Icon.Clipboard}
                  />
                  <Action.CopyToClipboard
                    title="Copy Artist Name"
                    content={artist.name}
                    icon={Icon.Clipboard}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}

      {tracks.length > 0 ? (
        <List.Section title="Songs">
          {tracks.map((track) => (
            <List.Item
              key={track.id}
              title={track.name}
              subtitle={track.artists.map((a) => a.name).join(", ")}
              accessoryTitle={formatDuration(track.duration_ms)}
              icon={track.album.images[0]?.url || Icon.Music}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open in Spotify"
                    url={`spotify:track:${track.id}`}
                    icon={Icon.Music}
                  />
                  {track.preview_url && (
                    <Action.OpenInBrowser
                      title="Play Preview"
                      url={track.preview_url}
                      icon={Icon.Play}
                    />
                  )}
                  <Action.OpenInBrowser
                    title="Open in Web Player"
                    url={track.external_urls.spotify}
                    icon={Icon.Globe}
                  />
                  <Action.CopyToClipboard
                    title="Copy Track URL"
                    content={track.external_urls.spotify}
                    icon={Icon.Clipboard}
                  />
                  <Action.CopyToClipboard
                    title="Copy Track Name"
                    content={`${track.name} - ${track.artists.map((a) => a.name).join(", ")}`}
                    icon={Icon.Clipboard}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}

      {playlists.filter((p) => p !== null && p !== undefined).length > 0 ? (
        <List.Section title="Playlists">
          {playlists
            .filter((p) => p !== null && p !== undefined)
            .map((playlist) => (
              <List.Item
                key={playlist.id}
                title={playlist.name || "Untitled Playlist"}
                subtitle={
                  playlist.owner?.display_name ||
                  playlist.owner?.id ||
                  "Spotify"
                }
                accessoryTitle={`${playlist.tracks?.total || 0} tracks`}
                icon={playlist.images?.[0]?.url || Icon.List}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title="Open in Spotify"
                      url={`spotify:playlist:${playlist.id}`}
                      icon={Icon.Music}
                    />
                    <Action.OpenInBrowser
                      title="Open in Web Player"
                      url={playlist.external_urls?.spotify || ""}
                      icon={Icon.Globe}
                    />
                    <Action.CopyToClipboard
                      title="Copy Playlist URL"
                      content={playlist.external_urls?.spotify || ""}
                      icon={Icon.Clipboard}
                    />
                    <Action.CopyToClipboard
                      title="Copy Playlist Name"
                      content={playlist.name || "Untitled Playlist"}
                      icon={Icon.Clipboard}
                    />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ) : null}
    </List>
  );
}
