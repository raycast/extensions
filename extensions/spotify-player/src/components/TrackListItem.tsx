import { Action, ActionPanel, Color, Icon, Image, List, showToast } from "@raycast/api";
import { addTrackToQueue, play, startPlaySimilar } from "../spotify/client";
import { msToHMS } from "../utils";
import { useSpotify } from "../utils/context";

export default function TrackListItem({
  track,
  album,
}: {
  track: SpotifyApi.TrackObjectSimplified;
  album?: SpotifyApi.AlbumObjectSimplified;
}) {
  const { installed } = useSpotify();

  const title = track.name;
  const subtitle = track.artists[0].name;

  let icon: Image.ImageLike | undefined = undefined;
  if (album && album.images) {
    icon = {
      source: album.images[album.images.length - 1].url,
    };
  }

  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      accessories={[{ text: msToHMS(track.duration_ms) }]}
      icon={icon}
      actions={
        <ActionPanel title={title}>
          <Action title="Play" icon={Icon.Play} onAction={() => play(track.uri)} />
          {installed && track.id && (
            <Action
              title="Play Similar"
              icon={{ source: "radio.png", tintColor: Color.PrimaryText }}
              onAction={() => startPlaySimilar([track.id])}
            />
          )}
          {installed && track.uri && (
            <Action
              title="Add To Queue"
              icon={Icon.Plus}
              onAction={() => {
                addTrackToQueue(track.uri).then((response) => {
                  if (!response.error) {
                    showToast({ title: "Added song to queue", message: title });
                  }
                });
              }}
              shortcut={{ modifiers: ["cmd"], key: "q" }}
            />
          )}
          <Action.OpenInBrowser
            title="Open Track on Spotify"
            url={installed ? `spotify:track:${track.id}` : track.external_urls.spotify}
            icon={icon}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
          />
          {album && (
            <Action.OpenInBrowser
              title="Open Album on Spotify"
              url={installed ? `spotify:album:${album.id}` : album.external_urls.spotify}
              icon={icon}
              shortcut={{ modifiers: ["cmd"], key: "a" }}
            />
          )}
          <Action.OpenInBrowser
            title="Open Artist on Spotify"
            url={installed ? `spotify:artist:${track.artists[0].id}` : track.artists[0].external_urls.spotify}
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
