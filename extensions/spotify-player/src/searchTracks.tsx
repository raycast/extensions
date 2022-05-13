import { Action, ActionPanel, Image, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { PlayAction } from "./client/actions";
import { authorize, spotifyApi } from "./client/client";
import { Response } from "./client/interfaces";

export default function SpotifyList() {
  const [searchText, setSearchText] = useState<string>();
  const response = useTrackSearch(searchText);

  if (response.error) {
    showToast(Toast.Style.Failure, "Search has failed", response.error);
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
  const image = track.album.images[track.album.images.length - 1].url;
  const icon: Image.ImageLike = {
    source: image,
    mask: Image.Mask.Circle,
  };
  const title = track.name;
  const subtitle = `${track.artists.map((a) => a.name).join(", ")}`;
  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      accessories={[{ text: msToHMS(track.duration_ms), tooltip: "duration of song" }]}
      icon={icon}
      actions={
        <ActionPanel title={title}>
          <PlayAction itemURI={track.uri} />
          <Action.OpenInBrowser
            title={`Show Album (${track.album.name.trim()})`}
            url={track.album.external_urls.spotify}
            icon={icon}
            shortcut={{ modifiers: ["cmd"], key: "a" }}
          />
          <Action.OpenInBrowser title="Show Artist" url={track.artists[0].external_urls.spotify} />
          <Action.CopyToClipboard
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
