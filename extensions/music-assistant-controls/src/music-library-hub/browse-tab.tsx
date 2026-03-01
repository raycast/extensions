import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { MediaItemType } from "../music-assistant/external-code/interfaces";
import MusicAssistantClient from "../music-assistant/music-assistant-client";
import { addItemToQueueNext } from "./actions";
import { getBreadcrumb, getBrowseSubtitle } from "./helpers";
import { BreadcrumbState, BrowseResult, BrowseView } from "./types";

interface BrowseTabProps {
  client: MusicAssistantClient;
  browseState: BreadcrumbState;
  setBrowseState: (state: BreadcrumbState) => void;
}

const PAGE_SIZE = 20;

async function fetchBrowseData(
  client: MusicAssistantClient,
  state: BrowseView,
  artistId: string | undefined,
  albumId: string | undefined,
  playlistId: string | undefined,
  pageNumber: number,
): Promise<BrowseResult> {
  const offset = pageNumber * PAGE_SIZE;

  switch (state) {
    case "artists":
      return { type: "artists", items: await client.getLibraryArtists(undefined, PAGE_SIZE, offset) };
    case "albums":
      return { type: "albums", items: await client.getLibraryAlbums(undefined, PAGE_SIZE, offset) };
    case "playlists":
      return { type: "playlists", items: await client.getLibraryPlaylists(undefined, PAGE_SIZE, offset) };
    case "artist-detail":
      if (!artistId) throw new Error("Artist ID required");
      return { type: "albums", items: await client.getArtistAlbums(artistId, "library") };
    case "album-detail":
      if (!albumId) throw new Error("Album ID required");
      return { type: "tracks", items: await client.getAlbumTracks(albumId, "library") };
    case "playlist-detail":
      if (!playlistId) throw new Error("Playlist ID required");
      return { type: "tracks", items: await client.getPlaylistTracks(playlistId, "library") };
  }
}

export function BrowseTab({ client, browseState, setBrowseState }: BrowseTabProps) {
  const [page, setPage] = useState(0);

  const { isLoading, data, revalidate } = useCachedPromise(
    async (view: BrowseView, artistId?: string, albumId?: string, playlistId?: string, pageNumber?: number) =>
      await fetchBrowseData(client, view, artistId, albumId, playlistId, pageNumber ?? 0),
    [browseState.view, browseState.artist?.item_id, browseState.album?.item_id, browseState.playlist?.item_id, page],
    {
      keepPreviousData: true,
    },
  );

  const addToQueue = async (item: MediaItemType, itemName: string) => {
    await addItemToQueueNext(client, item, itemName, revalidate);
  };

  const navigateBack = () => {
    setPage(0);
    if (browseState.view === "artist-detail") {
      setBrowseState({ view: "artists" });
    } else if (browseState.view === "album-detail") {
      if (browseState.artist) {
        setBrowseState({ view: "artist-detail", artist: browseState.artist });
      } else {
        setBrowseState({ view: "albums" });
      }
    } else if (browseState.view === "playlist-detail") {
      setBrowseState({ view: "playlists" });
    }
  };

  const breadcrumb = getBreadcrumb(browseState);

  return (
    <List.Section title={breadcrumb || "Browse"} subtitle={getBrowseSubtitle(browseState.view, breadcrumb)}>
      {(browseState.view === "artist-detail" ||
        browseState.view === "album-detail" ||
        browseState.view === "playlist-detail") && (
        <List.Item
          title="Back"
          icon={Icon.ArrowLeft}
          actions={
            <ActionPanel>
              <Action title="Go Back" icon={Icon.ArrowLeft} onAction={navigateBack} />
            </ActionPanel>
          }
        />
      )}

      {browseState.view === "artists" && (
        <>
          <List.Item
            title="View Albums"
            icon={Icon.Music}
            actions={
              <ActionPanel>
                <Action
                  title="View Albums"
                  icon={Icon.Music}
                  onAction={() => {
                    setPage(0);
                    setBrowseState({ view: "albums" });
                  }}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="View Playlists"
            icon={Icon.Layers}
            actions={
              <ActionPanel>
                <Action
                  title="View Playlists"
                  icon={Icon.Layers}
                  onAction={() => {
                    setPage(0);
                    setBrowseState({ view: "playlists" });
                  }}
                />
              </ActionPanel>
            }
          />
        </>
      )}

      {browseState.view === "albums" && (
        <>
          <List.Item
            title="View Artists"
            icon={Icon.Person}
            actions={
              <ActionPanel>
                <Action
                  title="View Artists"
                  icon={Icon.Person}
                  onAction={() => {
                    setPage(0);
                    setBrowseState({ view: "artists" });
                  }}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="View Playlists"
            icon={Icon.Layers}
            actions={
              <ActionPanel>
                <Action
                  title="View Playlists"
                  icon={Icon.Layers}
                  onAction={() => {
                    setPage(0);
                    setBrowseState({ view: "playlists" });
                  }}
                />
              </ActionPanel>
            }
          />
        </>
      )}

      {browseState.view === "playlists" && (
        <>
          <List.Item
            title="View Artists"
            icon={Icon.Person}
            actions={
              <ActionPanel>
                <Action
                  title="View Artists"
                  icon={Icon.Person}
                  onAction={() => {
                    setPage(0);
                    setBrowseState({ view: "artists" });
                  }}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="View Albums"
            icon={Icon.Music}
            actions={
              <ActionPanel>
                <Action
                  title="View Albums"
                  icon={Icon.Music}
                  onAction={() => {
                    setPage(0);
                    setBrowseState({ view: "albums" });
                  }}
                />
              </ActionPanel>
            }
          />
        </>
      )}

      {isLoading && <List.Item title="Loading..." icon={Icon.Clock} />}

      {!isLoading && data?.items && data.items.length === 0 && (
        <List.Item title="No items found" icon={Icon.XMarkCircle} />
      )}

      {!isLoading &&
        data?.type === "artists" &&
        data.items.map((artist) => (
          <List.Item
            key={artist.item_id}
            title={artist.name}
            subtitle={artist.metadata?.genres?.join(", ") || ""}
            icon={{ source: Icon.Person, tintColor: Color.Blue }}
            actions={
              <ActionPanel>
                <Action
                  title="View Albums"
                  icon={Icon.ArrowRight}
                  onAction={() => {
                    setPage(0);
                    setBrowseState({ view: "artist-detail", artist });
                  }}
                />
                <Action title="Add to Queue" icon={Icon.Plus} onAction={() => addToQueue(artist, artist.name)} />
              </ActionPanel>
            }
          />
        ))}

      {!isLoading &&
        data?.type === "albums" &&
        data.items.map((album) => (
          <List.Item
            key={album.item_id}
            title={album.name}
            subtitle={album.version || ""}
            icon={{ source: Icon.Music, tintColor: Color.Green }}
            actions={
              <ActionPanel>
                <Action
                  title="View Tracks"
                  icon={Icon.ArrowRight}
                  onAction={() => {
                    setPage(0);
                    setBrowseState({
                      view: "album-detail",
                      album,
                      artist: browseState.artist,
                    });
                  }}
                />
                <Action title="Add to Queue" icon={Icon.Plus} onAction={() => addToQueue(album, album.name)} />
              </ActionPanel>
            }
          />
        ))}

      {!isLoading &&
        data?.type === "playlists" &&
        data.items.map((playlist) => (
          <List.Item
            key={playlist.item_id}
            title={playlist.name}
            subtitle="Playlist"
            icon={{ source: Icon.Layers, tintColor: Color.Purple }}
            actions={
              <ActionPanel>
                <Action
                  title="View Tracks"
                  icon={Icon.ArrowRight}
                  onAction={() => {
                    setPage(0);
                    setBrowseState({ view: "playlist-detail", playlist });
                  }}
                />
                <Action title="Add to Queue" icon={Icon.Plus} onAction={() => addToQueue(playlist, playlist.name)} />
              </ActionPanel>
            }
          />
        ))}

      {!isLoading &&
        data?.type === "tracks" &&
        data.items.map((track) => (
          <List.Item
            key={track.item_id}
            title={track.name}
            subtitle={track.version || ""}
            icon={{ source: Icon.Terminal, tintColor: Color.Orange }}
            actions={
              <ActionPanel>
                <Action title="Add to Queue" icon={Icon.Plus} onAction={() => addToQueue(track, track.name)} />
              </ActionPanel>
            }
          />
        ))}

      {!isLoading && data?.items && data.items.length >= PAGE_SIZE && (
        <List.Item
          title="Load More"
          icon={Icon.ArrowDown}
          actions={
            <ActionPanel>
              <Action title="Load More" icon={Icon.ArrowDown} onAction={() => setPage(page + 1)} />
            </ActionPanel>
          }
        />
      )}
    </List.Section>
  );
}
