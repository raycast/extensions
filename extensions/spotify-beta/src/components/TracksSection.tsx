import { List } from "@raycast/api";
import { SimplifiedTrackObject } from "../helpers/spotify.api";
import TrackListItem from "./TrackListItem";

type TracksSectionProps = {
  tracks: SimplifiedTrackObject[] | undefined;
  limit?: number;
};

export function TracksSection({ tracks, limit }: TracksSectionProps) {
  if (!tracks) return null;

  const items = tracks.slice(0, limit || tracks.length);

  return (
    <List.Section title="Songs">
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
