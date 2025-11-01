import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { TrackObject, AlbumObject } from "../helpers/spotify.api";
import { play } from "../api/play";

type TrackListItemProps = {
  track: TrackObject;
  album?: AlbumObject;
};

export default function TrackListItem({ track, album }: TrackListItemProps) {
  const trackName = track.name || "Unknown Track";
  const artistNames = track.artists?.map((artist) => artist.name).join(", ") || "Unknown Artist";
  const albumName = album?.name || track.album?.name || "";
  const duration = track.duration_ms
    ? `${Math.floor(track.duration_ms / 60000)}:${String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, "0")}`
    : "";

  const handlePlay = async () => {
    try {
      if (track.uri) {
        await play({ contextUri: track.uri });
      }
    } catch (error) {
      console.error("Failed to play track", error);
    }
  };

  return (
    <List.Item
      title={trackName}
      subtitle={artistNames}
      icon={{ source: album?.images?.[0]?.url || track.album?.images?.[0]?.url || Icon.Music }}
      accessories={[...(albumName ? [{ text: albumName }] : []), ...(duration ? [{ text: duration }] : [])]}
      actions={
        <ActionPanel>
          <Action title="Play" icon={Icon.Play} onAction={handlePlay} />
          {track.external_urls?.spotify && (
            <Action.OpenInBrowser
              title="Open in Spotify"
              url={track.external_urls.spotify}
              shortcut={{ modifiers: ["ctrl"], key: "o" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
