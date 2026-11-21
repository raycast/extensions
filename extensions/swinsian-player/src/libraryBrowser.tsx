import { Action, ActionPanel, Icon, List, showHUD, getPreferenceValues, Keyboard } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import {
  LibraryBrowseMode,
  LibraryAlbum,
  LibraryFacet,
  SearchTrack,
  addAlbumToQueue,
  addTrackToQueue,
  clearLibraryBrowserCache,
  formatRating,
  getArtistAlbumTracks,
  getArtistAlbums,
  getLibraryFacets,
  getLibraryTracksByFacet,
  playTrackByPath,
  revealInFinder,
  searchLibrary,
} from "./helpers/swinsian";
import { CopyList } from "./components/Toolkit";
import { ToolboxPopupDiscovery, ToolboxPopupLastfm } from "./components/ToolboxActions";
import Playlists from "./playlists";

type BrowseMode = LibraryBrowseMode | "tracks";

const MODE_LABELS: Record<BrowseMode, string> = {
  artist: "Artists",
  albumArtist: "Album Artists",
  album: "Albums",
  genre: "Genres",
  year: "Years",
  tracks: "Tracks",
};

export default function LibraryBrowser() {
  const { libraryRoot } = getPreferenceValues<{ libraryRoot?: string }>();
  const [mode, setMode] = useCachedState<BrowseMode>("swinsian-library-browser-mode", "artist");
  const [query, setQuery] = useCachedState<string>("swinsian-library-browser-query", "");

  const { data, isLoading, revalidate } = useCachedPromise(
    async (browseMode: BrowseMode, searchText: string) => {
      if (browseMode === "tracks") {
        return {
          facets: [] as LibraryFacet[],
          tracks: searchText.trim() ? await searchLibrary(searchText.trim(), 100) : [],
        };
      }

      const facets = await getLibraryFacets(browseMode, searchText, 5000);
      return {
        facets,
        tracks: [] as SearchTrack[],
      };
    },
    [mode, query],
    { keepPreviousData: true },
  );

  const facets = data?.facets ?? [];
  const tracks = data?.tracks ?? [];
  const filteredFacets = mode === "tracks" ? [] : facets;

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      throttle
      navigationTitle={libraryRoot ? `Browse Library — ${libraryRoot}` : "Browse Library — Swinsian"}
      searchBarPlaceholder={
        mode === "tracks" ? "Search tracks, artists, albums..." : `Filter ${MODE_LABELS[mode].toLowerCase()}...`
      }
      searchBarAccessory={
        <List.Dropdown tooltip="Browse by" value={mode} onChange={(value) => setMode(value as BrowseMode)}>
          <List.Dropdown.Item title="Artists" value="artist" icon={Icon.Person} />
          <List.Dropdown.Item title="Album Artists" value="albumArtist" icon={Icon.TwoPeople} />
          <List.Dropdown.Item title="Albums" value="album" icon={Icon.Cd} />
          <List.Dropdown.Item title="Genres" value="genre" icon={Icon.Tag} />
          <List.Dropdown.Item title="Years" value="year" icon={Icon.Calendar} />
          <List.Dropdown.Item title="Tracks" value="tracks" icon={Icon.Music} />
        </List.Dropdown>
      }
    >
      <List.Section
        title={MODE_LABELS[mode]}
        subtitle={String(mode === "tracks" ? tracks.length : filteredFacets.length)}
      >
        {mode === "tracks"
          ? tracks.map((track) => <TrackItem key={track.id || track.path} track={track} />)
          : filteredFacets.map((facet) => (
              <FacetItem key={`${facet.value}-${facet.artist ?? ""}`} mode={mode} facet={facet} />
            ))}
      </List.Section>

      {!isLoading && mode !== "tracks" && filteredFacets.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Results"
          description={`No ${MODE_LABELS[mode].toLowerCase()} matched your filter.`}
        />
      )}

      {!isLoading && mode === "tracks" && tracks.length === 0 && (
        <List.EmptyView icon={Icon.Music} title="Search Tracks" description="Type to search Swinsian's library." />
      )}

      <List.Section title="Tools">
        {libraryRoot && (
          <List.Item
            icon={Icon.Folder}
            title="Library Folder"
            subtitle={libraryRoot}
            actions={
              <ActionPanel>
                <Action.ShowInFinder path={libraryRoot} />
                <Action.CopyToClipboard title="Copy Library Folder" content={libraryRoot} />
              </ActionPanel>
            }
          />
        )}
        <List.Item
          icon={Icon.RotateClockwise}
          title="Refresh Library Browser Cache"
          actions={
            <ActionPanel>
              <Action
                title="Refresh Library Browser Cache"
                icon={Icon.RotateClockwise}
                onAction={async () => {
                  clearLibraryBrowserCache();
                  await revalidate();
                  await showHUD("Library browser cache refreshed");
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function FacetItem({ mode, facet }: { mode: LibraryBrowseMode; facet: LibraryFacet }) {
  const isArtistFacet = mode === "artist" || mode === "albumArtist";
  const icon =
    mode === "artist"
      ? Icon.Person
      : mode === "albumArtist"
        ? Icon.TwoPeople
        : mode === "album"
          ? Icon.Cd
          : mode === "genre"
            ? Icon.Tag
            : Icon.Calendar;

  return (
    <List.Item
      icon={icon}
      title={facet.title}
      subtitle={facet.subtitle}
      accessories={[
        {
          text: `${facet.count} ${isArtistFacet ? "album" : "track"}${facet.count === 1 ? "" : "s"}`,
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Browse">
            <Action.Push
              title={
                mode === "artist" || mode === "albumArtist"
                  ? `Browse Albums by ${facet.title}`
                  : `Browse ${facet.title}`
              }
              icon={mode === "artist" || mode === "albumArtist" ? Icon.Cd : Icon.List}
              target={
                mode === "artist" || mode === "albumArtist" ? (
                  <ArtistAlbums mode={mode} facet={facet} />
                ) : (
                  <FacetTracks mode={mode} facet={facet} />
                )
              }
            />
          </ActionPanel.Section>
          {(mode === "artist" || mode === "albumArtist") && (
            <ActionPanel.Section title="Artist Actions">
              <SubjectActions
                contextType="artist"
                subject={{
                  name: "",
                  artist: facet.value,
                  albumArtist: facet.value,
                  album: "",
                  genre: "",
                  year: 0,
                  path: "",
                }}
              />
            </ActionPanel.Section>
          )}
          {mode === "album" && (
            <ActionPanel.Section title="Album Actions">
              <SubjectActions
                contextType="album"
                subject={{
                  name: "",
                  artist: facet.artist ?? facet.subtitle?.split(" • ")[0] ?? "",
                  albumArtist: facet.artist ?? facet.subtitle?.split(" • ")[0] ?? "",
                  album: facet.value,
                  genre: "",
                  year: facet.year ?? (Number(facet.subtitle?.split(" • ")[1]) || 0),
                  path: "",
                }}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Name" content={facet.title} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function ArtistAlbums({ mode, facet }: { mode: "artist" | "albumArtist"; facet: LibraryFacet }) {
  const [query, setQuery] = useCachedState<string>(`swinsian-library-browser-${mode}-${facet.value}-albums-query`, "");
  const { data: albums = [], isLoading } = useCachedPromise(getArtistAlbums, [mode, facet.value, query, 1000], {
    keepPreviousData: true,
  });

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      throttle
      navigationTitle={`${facet.title} Albums — Swinsian`}
      searchBarPlaceholder={`Filter albums by ${facet.title}...`}
    >
      <List.Section title={facet.title} subtitle={`${albums.length} album${albums.length === 1 ? "" : "s"}`}>
        {albums.map((album) => (
          <AlbumItem key={`${album.album}-${album.year}`} mode={mode} album={album} />
        ))}
      </List.Section>
      {!isLoading && albums.length === 0 && (
        <List.EmptyView icon={Icon.Cd} title="No Albums" description={`No albums found for ${facet.title}.`} />
      )}
    </List>
  );
}

function AlbumItem({ mode, album }: { mode: "artist" | "albumArtist"; album: LibraryAlbum }) {
  const subject = {
    name: "",
    artist: album.artist,
    albumArtist: album.artist,
    album: album.album,
    genre: "",
    year: album.year,
    path: "",
  };
  return (
    <List.Item
      icon={Icon.Cd}
      title={album.album}
      subtitle={album.artist}
      accessories={[
        ...(album.year > 0 ? [{ text: String(album.year) }] : []),
        { text: `${album.count} track${album.count === 1 ? "" : "s"}` },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Browse">
            <Action.Push
              title={`Browse ${album.album}`}
              icon={Icon.Music}
              target={<ArtistAlbumTracks mode={mode} album={album} />}
            />
            <Action
              title="Add Album to Queue"
              icon={Icon.Plus}
              onAction={async () => {
                const addedCount = await addAlbumToQueue(mode, album.artist, album.album);
                await showHUD(`Added ${addedCount} tracks from "${album.album}" to queue`);
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Album Actions">
            <SubjectActions contextType="album" subject={subject} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Artist – Album" content={`${album.artist} – ${album.album}`} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ArtistAlbumTracks({ mode, album }: { mode: "artist" | "albumArtist"; album: LibraryAlbum }) {
  const [query, setQuery] = useCachedState<string>(
    `swinsian-library-browser-${mode}-${album.artist}-${album.album}-tracks-query`,
    "",
  );
  const { data: tracks = [], isLoading } = useCachedPromise(
    getArtistAlbumTracks,
    [mode, album.artist, album.album, query, 500],
    { keepPreviousData: true },
  );

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      throttle
      navigationTitle={`${album.album} — ${album.artist}`}
      searchBarPlaceholder={`Filter tracks in ${album.album}...`}
    >
      <List.Section title={album.album} subtitle={`${tracks.length} track${tracks.length === 1 ? "" : "s"}`}>
        {tracks.map((track) => (
          <TrackItem key={track.id || track.path} track={track} albumArtist={album.artist} year={album.year} />
        ))}
      </List.Section>
      {!isLoading && tracks.length === 0 && <List.EmptyView icon={Icon.Music} title="No Tracks" />}
    </List>
  );
}

export function FacetTracks({ mode, facet }: { mode: LibraryBrowseMode; facet: LibraryFacet }) {
  const [query, setQuery] = useCachedState<string>(`swinsian-library-browser-${mode}-${facet.value}-query`, "");
  const { data: tracks = [], isLoading } = useCachedPromise(
    getLibraryTracksByFacet,
    [mode, facet.value, query, 150, facet.artist],
    { keepPreviousData: true },
  );

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      throttle
      navigationTitle={`${facet.title} — Swinsian`}
      searchBarPlaceholder={`Filter tracks in ${facet.title}...`}
    >
      <List.Section title={facet.title} subtitle={String(tracks.length)}>
        {tracks.map((track) => (
          <TrackItem key={track.id || track.path} track={track} />
        ))}
      </List.Section>
      {!isLoading && tracks.length === 0 && <List.EmptyView icon={Icon.Music} title="No Tracks" />}
    </List>
  );
}

function SubjectActions({
  contextType,
  subject,
}: {
  contextType: "artist" | "album";
  subject: {
    name: string;
    artist: string;
    albumArtist: string;
    album: string;
    genre: string;
    year: number;
    path: string;
  };
}) {
  const toolboxPrefs = getPreferenceValues<{
    toolboxHiddenCategories?: string;
    toolboxHiddenServices?: string;
    toolboxCustomServices?: string;
    toolboxLastfmUsername?: string;
  }>();
  return (
    <>
      <ToolboxPopupDiscovery
        track={subject}
        contextTypes={[contextType]}
        hiddenCategories={toolboxPrefs.toolboxHiddenCategories}
        hiddenServices={toolboxPrefs.toolboxHiddenServices}
        customServices={toolboxPrefs.toolboxCustomServices}
        lastfmUsername={toolboxPrefs.toolboxLastfmUsername}
      />
      {contextType === "artist" && (
        <ToolboxPopupLastfm
          track={subject}
          contextTypes={["artist"]}
          hiddenCategories={toolboxPrefs.toolboxHiddenCategories}
          hiddenServices={toolboxPrefs.toolboxHiddenServices}
          customServices={toolboxPrefs.toolboxCustomServices}
          lastfmUsername={toolboxPrefs.toolboxLastfmUsername}
        />
      )}
    </>
  );
}

function TrackItem({ track, albumArtist, year = 0 }: { track: SearchTrack; albumArtist?: string; year?: number }) {
  const toolboxPrefs = getPreferenceValues<{
    toolboxHiddenCategories?: string;
    toolboxHiddenServices?: string;
    toolboxCustomServices?: string;
    toolboxLastfmUsername?: string;
  }>();
  const standardTrack = {
    id: track.id,
    name: track.name,
    artist: track.artist,
    album: track.album,
    albumArtist: albumArtist || track.artist,
    path: track.path,
    genre: "",
    year,
  };

  return (
    <List.Item
      icon={Icon.Music}
      title={track.name || "Untitled Track"}
      subtitle={track.artist || "Unknown Artist"}
      accessories={[
        { text: track.album || "Unknown Album" },
        { text: track.time },
        ...(track.rating > 0 ? [{ text: formatRating(track.rating), tooltip: "Rating" }] : []),
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
            <Action.Push
              title="Copy Paths"
              icon={Icon.Folder}
              target={<CopyList track={standardTrack} type="paths" />}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="File">
            <Action title="Reveal in Finder" icon={Icon.Finder} onAction={() => revealInFinder(track.path)} />
            <Action.OpenWith path={track.path} />
            <Action.CopyToClipboard
              title="Copy Artist - Title"
              content={`${track.artist} - ${track.name}`}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy File Path"
              content={track.path}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.Push title="Add to Playlist" icon={Icon.List} target={<Playlists trackToAdd={standardTrack} />} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
