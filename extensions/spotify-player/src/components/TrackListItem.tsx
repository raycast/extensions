import { Image, List } from "@raycast/api";
import { formatMs } from "../helpers/formatMs";
import { SimplifiedAlbumObject, SimplifiedTrackObject } from "../helpers/spotify.api";
import { TrackActionPanel } from "./TrackActionPanel";

type TrackListItemProps = {
  track: SimplifiedTrackObject;
  album?: SimplifiedAlbumObject;
  showAddToSaved?: boolean;
  showGoToAlbum?: boolean;
  playingContext?: string;
  tracksToQueue?: SimplifiedTrackObject[];
};

export default function TrackListItem({
  track,
  album,
  showAddToSaved,
  showGoToAlbum,
  playingContext,
  tracksToQueue,
}: TrackListItemProps) {
  const title = track.name || "";
  const subtitle = track?.artists?.map((a) => a.name).join(", ");

  let icon: Image.ImageLike | undefined = undefined;
  if (album?.images) {
    icon = {
      source: album.images[album.images.length - 1]?.url,
    };
  }

  return (
    <List.Item
      icon={icon}
      title={title}
      subtitle={subtitle}
      accessories={[{ text: track.duration_ms ? formatMs(track.duration_ms) : undefined }]}
      actions={
        <TrackActionPanel
          title={title}
          track={track}
          album={album}
          showAddToSaved={showAddToSaved}
          showGoToAlbum={showGoToAlbum}
          playingContext={playingContext}
          tracksToQueue={tracksToQueue}
        />
      }
    />
  );
}
