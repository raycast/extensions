import { Action, ActionPanel, Icon, List, Keyboard } from "@raycast/api";
import { playPlaylist, queuePlaylist } from "../lib/commands";
import type { LibraryPlaylist } from "../lib/mapping";
import { formatTrackCount } from "../lib/downloadLink";
import { playlistItemId } from "../lib/prefetch";
import type { ReactNode } from "react";
import { PlaylistTracks } from "./PlaylistTracks";

export function PlaylistListItem({ playlist, extraActions }: { playlist: LibraryPlaylist; extraActions?: ReactNode }) {
  return (
    <List.Item
      id={playlistItemId(playlist)}
      title={playlist.title}
      subtitle={playlist.username}
      icon={playlist.artworkUrl ?? Icon.List}
      accessories={[{ text: formatTrackCount(playlist.trackCount, playlist.trackCount) }]}
      actions={
        <ActionPanel>
          <Action.Push title="Show Tracks" icon={Icon.List} target={<PlaylistTracks playlist={playlist} />} />
          <Action title="Add to Queue" icon={Icon.Plus} onAction={() => queuePlaylist(playlist)} />
          <Action title="Play Now" icon={Icon.Play} onAction={() => playPlaylist(playlist)} />
          <Action.OpenInBrowser
            title="Open in SoundCloud"
            url={playlist.permalinkUrl}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          <Action.CopyToClipboard
            title="Copy URL"
            content={playlist.permalinkUrl}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          {extraActions && <ActionPanel.Section>{extraActions}</ActionPanel.Section>}
        </ActionPanel>
      }
    />
  );
}
