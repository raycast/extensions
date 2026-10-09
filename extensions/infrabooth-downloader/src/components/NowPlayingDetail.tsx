import { List } from "@raycast/api";
import { escapeMarkdown, formatProgressLine, formatVolume, toLargeArtworkUrl } from "../lib/format";
import type { RemoteState, RemoteTrack } from "@/lib/remote-protocol";

const STATUS_LABELS: Record<RemoteState["state"], string> = {
  stopped: "Stopped",
  loading: "Loading",
  playing: "Playing",
  paused: "Paused",
};

function buildMarkdown(state: RemoteState, track: RemoteTrack): string {
  const artwork = toLargeArtworkUrl(track.artworkUrl);
  const durationMs = state.durationMs > 0 ? state.durationMs : track.durationMs;
  const info = [
    `**${escapeMarkdown(track.title)}**`,
    escapeMarkdown(track.artist),
    `\`${formatProgressLine(state.positionMs, durationMs)}\``,
  ].join("  \n");
  return artwork ? `![Artwork](${artwork}?raycast-width=100&raycast-height=100)\n\n${info}` : info;
}

interface Props {
  state: RemoteState;
  track: RemoteTrack;
}

export function NowPlayingDetail({ state, track }: Props) {
  return (
    <List.Item.Detail
      markdown={buildMarkdown(state, track)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Status" text={STATUS_LABELS[state.state]} />
          <List.Item.Detail.Metadata.Label title="Volume" text={formatVolume(state.volume)} />
          <List.Item.Detail.Metadata.Label title="Shuffle" text={state.shuffle ? "On" : "Off"} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
