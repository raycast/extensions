import { Action, ActionPanel, Image, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { PlayAction } from "./client/actions";
import { authorize, spotifyApi } from "./client/client";
import { Response } from "./client/interfaces";

export default function SpotifyList() {
  const [searchText, setSearchText] = useState<string>();
  const response = useAlbumSearch(searchText);

  if (response.error) {
    showToast(Toast.Style.Failure, "Search has failed", response.error);
  }

  return (
    <List
      searchBarPlaceholder="Search albums..."
      onSearchTextChange={setSearchText}
      isLoading={response.isLoading}
      throttle
    >
      {response.result?.albums.items.map((a) => (
        <AlbumItem key={a.id} album={a} />
      ))}
    </List>
  );
}

function AlbumItem(props: { album: SpotifyApi.AlbumObjectSimplified }) {
  const album = props.album;
  const icon: Image.ImageLike = {
    source: album.images[album.images.length - 1].url,
    mask: Image.Mask.Circle,
  };

  const title = album.name;
  const subtitle = `${album.artists.map((a) => a.name).join(", ")}`;
  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      accessories={[
        { text: album.release_date.substring(0, 4), tooltip: "release year" },
        { text: `${album.total_tracks.toString()} songs`, tooltip: "number of tracks" },
      ]}
      icon={icon}
      actions={
        <ActionPanel title={title}>
          <PlayAction itemURI={album.uri} />
          <Action.OpenInBrowser
            title={`Show Album (${album.name.trim()})`}
            url={album.external_urls.spotify}
            icon={icon}
            shortcut={{ modifiers: ["cmd"], key: "a" }}
          />
          <Action.OpenInBrowser title="Show Artist" url={album.artists[0].external_urls.spotify} />
          <Action.CopyToClipboard
            title="Copy URL"
            content={album.external_urls.spotify}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}

function useAlbumSearch(query: string | undefined): Response<SpotifyApi.AlbumSearchResponse> {
  const [response, setResponse] = useState<Response<SpotifyApi.AlbumSearchResponse>>({ isLoading: false });

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
            .searchAlbums(query, { limit: 50 })
            .then((response: { body: any }) => response.body as SpotifyApi.AlbumSearchResponse)
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
