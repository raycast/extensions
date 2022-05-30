import { useEffect, useState } from "react";
import { useTrackSearch } from "./client/client";
import { PlayAction } from "./actions";
import { showToast, List, ActionPanel, Action, Toast, Image } from "@raycast/api";
import _ from "lodash";
import { isSpotifyInstalled } from "./client/utils";

export default function SpotifyList() {
  const [searchText, setSearchText] = useState<string>();
  const response = useTrackSearch(searchText);

  if (response.error) {
    showToast(Toast.Style.Failure, "Search has failed", response.error);
  }
  return (
    <TracksList
      tracks={response.result?.tracks.items}
      isLoading={response.isLoading}
      searchCallback={setSearchText}
      includeDetails
    />
  );
}

export function TracksList(props: {
  tracks: SpotifyApi.TrackObjectFull[] | undefined;
  isLoading?: boolean;
  searchCallback?: (text: string) => void;
  includeDetails?: boolean;
}) {
  const [spotifyInstalled, setSpotifyInstalled] = useState<boolean>(false);
  useEffect(() => {
    async function checkForSpotify() {
      const spotifyIsInstalled = await isSpotifyInstalled();

      setSpotifyInstalled(spotifyIsInstalled);
    }

    checkForSpotify();
  }, []);
  return (
    <List
      navigationTitle="Search Tracks"
      searchBarPlaceholder="Search music by keywords..."
      onSearchTextChange={props.searchCallback}
      isLoading={props.isLoading}
      throttle
      isShowingDetail={props.includeDetails && !_(props.tracks).isEmpty()}
    >
      {props.tracks &&
        props.tracks
          .sort((t) => t.popularity)
          .map((t: SpotifyApi.TrackObjectFull) => (
            <TrackListItem key={t.id} track={t} album={t.album} spotifyInstalled={spotifyInstalled} />
          ))}
    </List>
  );
}

function TrackListItem(props: {
  track: SpotifyApi.TrackObjectSimplified;
  album?: SpotifyApi.AlbumObjectSimplified;
  spotifyInstalled: boolean;
}) {
  const track = props.track;
  const album = props.album;
  const spotifyInstalled = props.spotifyInstalled;
  let icon: Image.ImageLike | undefined = undefined;
  if (album && album.images) {
    icon = {
      source: album.images[album.images.length - 1].url,
      mask: Image.Mask.Circle,
    };
  }
  const title = `${track.artists[0].name} – ${track.name}`;
  return (
    <List.Item
      title={title}
      accessoryTitle={msToHMS(track.duration_ms)}
      icon={icon}
      detail={<List.Item.Detail markdown={getTrackDetailMarkdownContent(track, album)} />}
      actions={
        <ActionPanel title={title}>
          <PlayAction itemURI={track.uri} />
          <Action.OpenInBrowser
            title={`Show Track (${track.name.trim()})`}
            url={spotifyInstalled ? `spotify:track:${track.id}` : track.external_urls.spotify}
            icon={icon}
            shortcut={{ modifiers: ["cmd"], key: "a" }}
          />
          {album && (
            <Action.OpenInBrowser
              title={`Open Album (${album.name.trim()})`}
              url={spotifyInstalled ? `spotify:album:${album.id}` : album.external_urls.spotify}
              icon={icon}
              shortcut={{ modifiers: ["cmd"], key: "a" }}
            />
          )}
          <Action.OpenInBrowser
            title="Show Artist"
            url={spotifyInstalled ? `spotify:artist:${track.artists[0].id}` : track.artists[0].external_urls.spotify}
          />
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

const getTrackDetailMarkdownContent = (
  track: SpotifyApi.TrackObjectSimplified,
  album?: SpotifyApi.AlbumObjectSimplified
) => {
  let content = `# ${track.name}\n## Album\n`;
  if (album) {
    const albumCover = _(album.images).first()?.url;
    if (albumCover) {
      content += `![](${albumCover})\n\n`;
    }
    const releaseYear = new Date(album.release_date).getFullYear();
    content += `\n\n## ${album.name}\n${track.artists[0].name} • ${releaseYear} • ${album.total_tracks} songs`;
  }
  return `${content}`;
};

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
