import { List } from "@raycast/api";
import { SimplifiedTrackObject } from "../helpers/spotify.api";
import TrackListItem from "./TrackListItem";

type TracksSectionProps = {
  tracks: SimplifiedTrackObject[] | undefined;
  limit?: number;
  title?: string;
};

export function TracksSection({ tracks, limit, title = "Songs" }: TracksSectionProps) {
  if (!tracks) return null;

  const items = tracks.slice(0, limit || tracks.length);

  return (
    <List.Section title={title}>
      {items?.map((track) => (
        <TrackListItem
          key={track.id}
          track={track}
          album={track.album}
          playingContext={track.album?.uri}
          showGoToAlbum
        />
      ))}
    </List.Section>
  );
}
