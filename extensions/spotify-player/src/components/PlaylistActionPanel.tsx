import { Action, ActionPanel, Icon, showHUD } from "@raycast/api";
import { play } from "../api/play";
import { isSpotifyInstalled } from "../helpers/isSpotifyInstalled";

type PlaylistActionPanelProps = {
  title: string;
  playlist: SpotifyApi.PlaylistObjectSimplified;
};

export function PlaylistActionPanel({ title, playlist }: PlaylistActionPanelProps) {
  return (
    <ActionPanel title={title}>
      <Action
        title="Play"
        icon={Icon.Play}
        onAction={async () => {
          await play({ contextUri: playlist.uri });
          showHUD(`Playing ${title}`);
        }}
      />
      <Action.CopyToClipboard
        icon={Icon.Link}
        title="Copy URL"
        content={{
          html: `<a href="${playlist.external_urls.spotify}" title="${title}">${title}</a>`,
          text: playlist.external_urls.spotify,
        }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
      />
      <Action.OpenInBrowser
        icon="icon.png"
        title="Open on Spotify"
        url={isSpotifyInstalled ? `spotify:playlist:${playlist.id}` : playlist.external_urls.spotify}
      />
    </ActionPanel>
  );
}
