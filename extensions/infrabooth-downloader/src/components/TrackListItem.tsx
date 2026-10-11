import { Action, ActionPanel, Icon, List, Keyboard } from "@raycast/api";
import { playNow, sendWithToast } from "../lib/commands";
import { formatDuration } from "../lib/format";
import type { RemoteTrack } from "../shared/remote-protocol";
import type { ReactNode } from "react";
import { DownloadTrackAction } from "./DownloadTrackAction";

export interface PlayContext {
  tracks: RemoteTrack[];
  startIndex: number;
}

interface TrackListItemProps {
  track: RemoteTrack;
  playContext: PlayContext;
  extraActions?: ReactNode;
}

export function TrackListItem({ track, playContext, extraActions }: TrackListItemProps) {
  return (
    <List.Item
      title={track.title}
      subtitle={track.artist}
      icon={track.artworkUrl ?? Icon.Music}
      accessories={[{ text: formatDuration(track.durationMs) }]}
      actions={
        <ActionPanel>
          <Action
            title="Add to Queue"
            icon={Icon.Plus}
            onAction={() => sendWithToast({ type: "queueTrack", track }, `Added “${track.title}” to queue`)}
          />
          <Action
            title="Play Now"
            icon={Icon.Play}
            onAction={() => playNow(playContext.tracks, playContext.startIndex)}
          />
          <DownloadTrackAction track={track} />
          <Action.OpenInBrowser
            title="Open in SoundCloud"
            url={track.trackUrl}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          <Action.CopyToClipboard title="Copy URL" content={track.trackUrl} shortcut={Keyboard.Shortcut.Common.Copy} />
          {extraActions && <ActionPanel.Section>{extraActions}</ActionPanel.Section>}
        </ActionPanel>
      }
    />
  );
}
