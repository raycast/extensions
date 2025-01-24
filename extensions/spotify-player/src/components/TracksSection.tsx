import { List } from "@raycast/api";
import { MinimalTrack } from "../api/getMySavedTracks";
import TrackListItem from "./TrackListItem";

type TracksSectionProps = {
  tracks: MinimalTrack[] | undefined;
  limit?: number;
  title?: string;
  onRefresh?: () => void;
};

export function TracksSection({ tracks, limit, title = "Songs", onRefresh }: TracksSectionProps) {
  if (!tracks) return null;

  // If limit is specified, only show that many tracks
  const limitedTracks = limit ? tracks.slice(0, limit) : tracks;

  return (
    <List.Section title={`${title} (${limitedTracks.length} tracks)`}>
      {limitedTracks.map((track) => {
        return <TrackListItem key={track.id} track={track} onRefresh={onRefresh} />;
      })}
    </List.Section>
  );
}
