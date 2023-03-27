import { Action, ActionPanel, Icon, showHUD } from "@raycast/api";
import { play } from "../api/play";
import { isSpotifyInstalled } from "../helpers/isSpotifyInstalled";
import { SimplifiedPlaylistObject } from "../helpers/spotify.api";
import { TracksList } from "./TracksList";

type PlaylistActionPanelProps = {
  title?: string;
  playlist: SimplifiedPlaylistObject;
};

export function PlaylistActionPanel({ title, playlist }: PlaylistActionPanelProps) {
  return (
    <ActionPanel>
      <Action
        title="Play"
        icon={Icon.Play}
        onAction={async () => {
          await play({ id: playlist.id, type: "playlist" });
          showHUD(`Playing ${title}`);
        }}
      />
      <Action.Push
        icon={Icon.AppWindowList}
        title="Show Songs"
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        target={<TracksList playlist={playlist} />}
      />
      <ActionPanel.Section>
        <Action.CopyToClipboard
          icon={Icon.Link}
          title="Copy URL"
          content={{
            html: `<a href="${playlist?.external_urls?.spotify}" title="${title}">${title}</a>`,
            text: playlist?.external_urls?.spotify,
          }}
        />
        {isSpotifyInstalled ? (
          <Action.Open icon="spotify-icon.png" title="Open on Spotify" target={playlist.uri ?? "spotify"} />
        ) : (
          <Action.OpenInBrowser
            title="Open on Spotify Web"
            url={playlist.external_urls?.spotify ?? "https://play.spotify.com"}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
