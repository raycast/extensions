import { List, ActionPanel, Action, Icon, showHUD, Clipboard, getPreferenceValues, Keyboard } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import {
  addTrackToQueue,
  searchLibrary,
  SearchTrack,
  playTrackByPath,
  revealInFinder,
  formatRating,
} from "./helpers/swinsian";
import { CopyList } from "./components/Toolkit";
import { ToolboxPopupDiscovery, ToolboxPopupLastfm } from "./components/ToolboxActions";
import Playlists from "./playlists";

export default function Search() {
  const [query, setQuery] = useCachedState<string>("swinsian-search-query", "");

  const { data: results = [], isLoading } = useCachedPromise(
    async (q: string): Promise<SearchTrack[]> => (q.trim() ? searchLibrary(q.trim()) : []),
    [query],
    { keepPreviousData: false },
  );

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search track titles, artists, or albums…"
      throttle
      navigationTitle="Quick Search — Swinsian"
    >
      {!query.trim() ? (
        <List.EmptyView
          icon={Icon.Music}
          title="Quick Search"
          description="Type to search tracks, artists, or albums"
        />
      ) : results.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No Results" description={`No tracks found for "${query}"`} />
      ) : (
        <List.Section title={`Results (${results.length})`}>
          {results.map((track) => (
            <TrackItem key={track.id || track.path} track={track} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function TrackItem({ track }: { track: SearchTrack }) {
  const toolboxPrefs = getPreferenceValues<{
    toolboxHiddenCategories?: string;
    toolboxHiddenServices?: string;
    toolboxCustomServices?: string;
    toolboxLastfmUsername?: string;
  }>();
  // Convert SearchTrack to standard track object for toolkit
  const standardTrack = {
    id: track.id,
    name: track.name,
    artist: track.artist,
    album: track.album,
    albumArtist: track.artist,
    path: track.path,
    genre: "", // Not returned by searchLibrary currently
    year: 0,
  };

  return (
    <List.Item
      icon={Icon.Music}
      title={track.name}
      subtitle={track.artist}
      accessories={[
        { text: track.album },
        { text: track.time },
        ...(track.rating > 0 ? [{ text: formatRating(track.rating) }] : []),
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Play">
            <Action
              title="Play"
              icon={Icon.Play}
              onAction={async () => {
                await playTrackByPath(track.path, track.id);
                await showHUD(`Playing "${track.name}"`);
              }}
            />
            <Action
              title="Add to Queue"
              icon={Icon.Plus}
              onAction={async () => {
                await addTrackToQueue(track.path, track.id);
                await showHUD(`Added "${track.name}" to queue`);
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Actions">
            <ToolboxPopupDiscovery
              track={standardTrack}
              hiddenCategories={toolboxPrefs.toolboxHiddenCategories}
              hiddenServices={toolboxPrefs.toolboxHiddenServices}
              customServices={toolboxPrefs.toolboxCustomServices}
              lastfmUsername={toolboxPrefs.toolboxLastfmUsername}
            />
            <ToolboxPopupLastfm
              track={standardTrack}
              hiddenCategories={toolboxPrefs.toolboxHiddenCategories}
              hiddenServices={toolboxPrefs.toolboxHiddenServices}
              customServices={toolboxPrefs.toolboxCustomServices}
              lastfmUsername={toolboxPrefs.toolboxLastfmUsername}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Metadata">
            <Action.Push
              title="Copy Metadata"
              icon={Icon.Clipboard}
              target={<CopyList track={standardTrack} type="metadata" />}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Paths">
            <Action.Push
              title="Copy Paths"
              icon={Icon.Folder}
              target={<CopyList track={standardTrack} type="paths" />}
            />
            <Action
              title="Reveal in Finder"
              icon={Icon.Finder}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={() => revealInFinder(track.path)}
            />
            <Action.Push
              title="Add to Playlist"
              icon={Icon.List}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              target={<Playlists trackToAdd={standardTrack} />}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Info">
            <Action
              title="Copy Artist – Title"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onAction={async () => {
                await Clipboard.copy(`${track.artist} – ${track.name}`);
                await showHUD("Copied to clipboard");
              }}
            />
            <Action
              title="Copy File Path"
              icon={Icon.Document}
              shortcut={Keyboard.Shortcut.Common.Copy}
              onAction={async () => {
                await Clipboard.copy(track.path);
                await showHUD("Path copied");
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
