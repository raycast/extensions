import { List } from "@raycast/api";
import type { ReactNode } from "react";
import type { Results } from "../lib/searchTypes";
import { MixListItem } from "./MixListItem";
import { PlaylistListItem } from "./PlaylistListItem";
import { TrackListItem } from "./TrackListItem";

interface ResultsSectionProps {
  title?: string;
  results: Results | undefined;
  playAsList: boolean;
  extraActions: ReactNode;
  footer?: ReactNode;
}

export function ResultsSection({ title, results, playAsList, extraActions, footer }: ResultsSectionProps) {
  if (!results) return null;
  if (results.kind === "tracks") {
    return (
      <List.Section title={title}>
        {results.tracks.map((track, index) => (
          <TrackListItem
            key={`${track.trackId}-${index}`}
            track={track}
            extraActions={extraActions}
            playContext={
              playAsList ? { tracks: results.tracks, startIndex: index } : { tracks: [track], startIndex: 0 }
            }
          />
        ))}
        {footer}
      </List.Section>
    );
  }
  if (results.kind === "mixes") {
    return (
      <List.Section title={title}>
        {results.mixes.map((mix) => (
          <MixListItem key={mix.id} mix={mix} extraActions={extraActions} />
        ))}
        {footer}
      </List.Section>
    );
  }
  return (
    <List.Section title={title}>
      {results.playlists.map((playlist) => (
        <PlaylistListItem key={playlist.id} playlist={playlist} extraActions={extraActions} />
      ))}
      {footer}
    </List.Section>
  );
}
