import { useEffect, useState } from "react";
import { authorize, spotifyApi } from "./client/client";
import { PlayAction } from "./client/actions";
import {
  showToast,
  ToastStyle,
  List,
  ActionPanel,
  OpenInBrowserAction,
  CopyToClipboardAction,
  ImageLike,
  ImageMask,
} from "@raycast/api";
import { Response } from "./client/interfaces";

export default function SpotifyList() {
  const [searchText, setSearchText] = useState<string>();
  const response = useTrackSearch(searchText);

  if (response.error) {
    showToast(ToastStyle.Failure, "Search has failed", response.error);
  }

  return (
    <List
      searchBarPlaceholder="Search music by keywords..."
      onSearchTextChange={setSearchText}
      isLoading={response.isLoading}
      throttle
    >
      {response.result?.tracks.items
        .sort((t) => t.popularity)
        .map((t: SpotifyApi.TrackObjectFull) => (
          <TrackListItem key={t.id} track={t} />
        ))}
    </List>
  );
}

function TrackListItem(props: { track: SpotifyApi.TrackObjectFull }) {
  const track = props.track;
  const icon: ImageLike = {
    source: track.album.images[track.album.images.length - 1].url,
    mask: ImageMask.Circle,
  };
  const title = `${track.artists[0].name} – ${track.name}`;
  return (
    <List.Item
      title={title}
      accessoryTitle={msToHMS(track.duration_ms)}
      icon={icon}
      actions={
        <ActionPanel title={title}>
          <PlayAction itemURI={track.uri} />
          <OpenInBrowserAction
            title={`Show Album (${track.album.name.trim()})`}
            url={track.album.external_urls.spotify}
            icon={icon}
            shortcut={{ modifiers: ["cmd"], key: "a" }}
          />
          <OpenInBrowserAction title="Show Artist" url={track.artists[0].external_urls.spotify} />
          <CopyToClipboardAction
            title="Copy URL"
            content={track.external_urls.spotify}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}

function useTrackSearch(query: string | undefined): Response<SpotifyApi.TrackSearchResponse> {
  const [response, setResponse] = useState<Response<SpotifyApi.TrackSearchResponse>>({ isLoading: false });

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
            .searchTracks(query, { limit: 50 })
            .then((response: { body: any }) => response.body as SpotifyApi.TrackSearchResponse)
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

function msToHMS(milliseconds: number): string {
  const totalSeconds = parseInt(Math.floor(milliseconds / 1000).toString());
  const totalMinutes = parseInt(Math.floor(totalSeconds / 60).toString());
  const totalHours = parseInt(Math.floor(totalMinutes / 60).toString());
  const days = parseInt(Math.floor(totalHours / 24).toString());

  const seconds = parseInt((totalSeconds % 60).toString());
  const minutes = parseInt((totalMinutes % 60).toString());
  const hours = parseInt((totalHours % 24).toString());

  const humanized = [pad(hours), pad(minutes), pad(seconds)];

  let time = "";
  if (days > 0) {
    time = `${days}:${humanized[0]}:${humanized[1]}:${humanized[2]}`;
  } else if (hours > 0) {
    time = `${hours}:${humanized[1]}:${humanized[2]}`;
  } else if (minutes > 0) {
    time = `${minutes}:${humanized[2]}`;
  } else if (seconds > 0) {
    time = `${humanized[2]}`;
  }
  return time;
}
function pad(value: number): string {
  return value < 10 ? "0" + value : String(value);
}
