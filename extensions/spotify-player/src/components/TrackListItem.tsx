import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import _ from "lodash";
import { play, startPlaySimilar } from "../spotify/client";
import { msToHMS, trackTitle } from "../utils";

export default function TrackListItem(props: {
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
  const title = trackTitle(track);
  return (
    <List.Item
      title={title}
      accessoryTitle={msToHMS(track.duration_ms)}
      icon={icon}
      detail={<List.Item.Detail markdown={getTrackDetailMarkdownContent(track, album)} />}
      actions={
        <ActionPanel title={title}>
          <Action
            title="Play"
            icon={Icon.Play}
            onAction={() => {
              play(track.uri);
            }}
          />
          {spotifyInstalled && track.id && (
            <Action
              title="Play Similar"
              icon={{ source: "radio.png", tintColor: Color.PrimaryText }}
              onAction={() => {
                startPlaySimilar({ seed_tracks: track.id });
              }}
            />
          )}
          <Action.OpenInBrowser
            title={`Show Track (${track.name.trim()})`}
            url={spotifyInstalled ? `spotify:track:${track.id}` : track.external_urls.spotify}
            icon={icon}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
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
