import { Action, ActionPanel, Icon, showHUD } from "@raycast/api";
import { play } from "../api/play";
import { isSpotifyInstalled } from "../helpers/isSpotifyInstalled";
import { SimplifiedShowObject } from "../helpers/spotify.api";
import { EpisodesList } from "./EpisodesList";

type ShowActionPanelProps = { show: SimplifiedShowObject };

export function ShowActionPanel({ show }: ShowActionPanelProps) {
  const title = show.name;

  return (
    <ActionPanel>
      <Action
        title="Play"
        icon={Icon.Play}
        onAction={async () => {
          await play({ id: show.id, type: "show" });
          showHUD(`Playing ${title}`);
        }}
      />
      <Action.Push
        icon={Icon.AppWindowList}
        title="Show Episodes"
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        target={<EpisodesList show={show} />}
      />
      <ActionPanel.Section>
        <Action.CopyToClipboard icon={Icon.Link} title="Copy URL" content={show?.external_urls?.spotify || ""} />
        {isSpotifyInstalled ? (
          <Action.Open icon="spotify-icon.png" title="Open on Spotify" target={show.uri} />
        ) : (
          <Action.OpenInBrowser
            title="Open on Spotify Web"
            url={show?.external_urls?.spotify || "https://play.spotify.com"}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
