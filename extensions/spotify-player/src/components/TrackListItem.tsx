import { Image, List } from "@raycast/api";
import { SimplifiedAlbumObject, SimplifiedTrackObject } from "../helpers/spotify.api";
import { msToHMS } from "../helpers/track";
import { TrackActionPanel } from "./TrackActionPanel";

type TrackListItemProps = {
  track: SimplifiedTrackObject;
  album?: SimplifiedAlbumObject;
  showGoToAlbum?: boolean;
};

export default function TrackListItem({ track, album, showGoToAlbum }: TrackListItemProps) {
  const title = track.name || "";
  const subtitle = track?.artists?.[0].name;

  let icon: Image.ImageLike | undefined = undefined;
  if (album?.images) {
    icon = {
      source: album.images[album.images.length - 1].url,
    };
  }

  return (
    <List.Item
      icon={icon}
      title={title}
      subtitle={subtitle}
      accessories={[{ text: track.duration_ms ? msToHMS(track.duration_ms) : undefined }]}
      actions={<TrackActionPanel title={title} track={track} album={album} showGoToAlbum={showGoToAlbum} />}
    />
  );
}
