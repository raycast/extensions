import { List } from "@raycast/api";
import { SimplifiedTrackObject } from "../helpers/spotify.api";
import TrackListItem from "./TrackListItem";

type TracksSectionProps = {
  tracks: SimplifiedTrackObject[] | undefined;
  limit?: number;
  title?: string;
  queueTracks?: boolean;
};

export function TracksSection({ tracks, limit, title = "Songs", queueTracks }: TracksSectionProps) {
  if (!tracks) return null;

  const items = tracks.slice(0, limit || tracks.length);

  return (
    <List.Section title={title}>
      {items?.map((track) => {
        return (
          <TrackListItem
            key={track.id}
            track={track}
            album={track.album}
            showAddToSaved
            showGoToAlbum
            tracksToQueue={queueTracks ? tracks.filter((t) => t.id !== track.id) : undefined}
          />
        );
      })}
    </List.Section>
  );
}
