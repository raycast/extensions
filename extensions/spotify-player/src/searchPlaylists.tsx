import { Action, ActionPanel, Image, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { PlayAction } from "./client/actions";
import { authorize, spotifyApi } from "./client/client";
import { Response } from "./client/interfaces";

export default function SpotifyList() {
  const [searchText, setSearchText] = useState<string>();
  const response = usePlaylistSearch(searchText);

  if (response.error) {
    showToast(Toast.Style.Failure, "Search has failed", response.error);
  }

  return (
    <List
      searchBarPlaceholder="Search playlists..."
      onSearchTextChange={setSearchText}
      isLoading={response.isLoading}
      throttle
    >
      {response.result?.playlists.items.map((p) => (
        <PlaylistItem key={p.id} playlist={p} />
      ))}
    </List>
  );
}

function PlaylistItem(props: { playlist: SpotifyApi.PlaylistObjectSimplified }) {
  const playlist = props.playlist;
  const icon: Image.ImageLike = {
    source: playlist.images[playlist.images.length - 1].url,
    mask: Image.Mask.Circle,
  };

  const title = playlist.name;
  const subtitle = playlist.owner.display_name;
  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      accessories={[{ text: `${playlist.tracks.total.toString()} songs`, tooltip: "number of tracks" }]}
      icon={icon}
      actions={
        <ActionPanel title={title}>
          <PlayAction itemURI={playlist.uri} />
          <Action.OpenInBrowser
            title={`Show Playlist (${playlist.name.trim()})`}
            url={playlist.external_urls.spotify}
            icon={icon}
            shortcut={{ modifiers: ["cmd"], key: "a" }}
          />
          <Action.OpenInBrowser title="Show Artist" url={playlist.owner.external_urls.spotify} />
          <Action.CopyToClipboard
            title="Copy URL"
            content={playlist.external_urls.spotify}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}

function usePlaylistSearch(query: string | undefined): Response<SpotifyApi.PlaylistSearchResponse> {
  const [response, setResponse] = useState<Response<SpotifyApi.PlaylistSearchResponse>>({ isLoading: false });

  let cancel = false;

  useEffect(() => {
    authorize();

    async function fetchData() {
      if (cancel) {
        return;
      }
      if (!query) {
        setResponse((oldState) => ({ ...oldState, isLoading: false, result: undefined }));
        return;
      }
      setResponse((oldState) => ({ ...oldState, isLoading: true }));

      try {
        const response =
          (await spotifyApi
            .searchPlaylists(query, { limit: 50 })
            .then((response: { body: any }) => response.body as SpotifyApi.PlaylistSearchResponse)
            .catch((error) => {
              setResponse((oldState) => ({ ...oldState, error: error.toString() }));
            })) ?? undefined;

        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, result: response }));
        }
      } catch (e: any) {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, error: e.toString() }));
        }
      } finally {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, isLoading: false }));
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, [query]);

  return response;
}
