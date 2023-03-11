import { Image, List } from "@raycast/api";
import { msToHMS } from "../helpers/track";
import { TrackActionPanel } from "./TrackActionPanel";

type TrackListItemProps = {
  track: SpotifyApi.TrackObjectSimplified;
  album: SpotifyApi.AlbumObjectSimplified;
};

export default function TrackListItem({ track, album }: TrackListItemProps) {
  const title = track.name;
  const subtitle = track.artists[0].name;

  const icon: Image.ImageLike = {
    source: album.images[album.images.length - 1].url,
  };

  return (
    <List.Item
      icon={icon}
      title={title}
      subtitle={subtitle}
      accessories={[{ text: msToHMS(track.duration_ms) }]}
      actions={<TrackActionPanel title={title} track={track} />}
    />
  );
}
