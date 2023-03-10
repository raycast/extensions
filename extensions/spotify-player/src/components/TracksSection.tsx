import { List } from "@raycast/api";
import TrackListItem from "./TrackListItem";

export function TracksSection({ tracks, limit }: { tracks: SpotifyApi.TrackObjectFull[] | undefined; limit?: number }) {
  if (!tracks) return null;

  const items = tracks.slice(0, limit || tracks.length);

  return (
    <List.Section title="Songs">
      {items?.map((a) => (
        <TrackListItem key={a.id} track={a} album={a.album} />
      ))}
    </List.Section>
  );
}
