import { Image, List } from "@raycast/api";
import { MinimalTrack } from "../api/getMySavedTracks";
import { TrackActionPanel } from "./TrackActionPanel";
import { formatMs } from "../helpers/formatMs";

interface TrackListItemProps {
  track: MinimalTrack;
  showGoToAlbum?: boolean;
  onRefresh?: () => void;
}

export default function TrackListItem({ track, showGoToAlbum, onRefresh }: TrackListItemProps) {
  const artists = track.artists.map((a) => a.name).join(", ");
  const icon: Image.ImageLike | undefined = track.album.images[0]?.url
    ? {
        source: track.album.images[0].url,
      }
    : undefined;

  return (
    <List.Item
      title={track.name}
      subtitle={artists}
      icon={icon}
      accessories={[{ text: formatMs(track.duration_ms) }]}
      actions={
        <TrackActionPanel
          title={track.name}
          track={track}
          album={track.album}
          showGoToAlbum={showGoToAlbum}
          onRefresh={onRefresh}
        />
      }
    />
  );
}
