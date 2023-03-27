import { Action, ActionPanel, Icon, showHUD, showToast } from "@raycast/api";
import { addToQueue } from "../api/addTrackToQueue";
import { play } from "../api/play";
import { SimplifiedEpisodeObject } from "../helpers/spotify.api";
import { isSpotifyInstalled } from "../helpers/isSpotifyInstalled";

type EpisodeActionPanelProps = {
  title: string;
  episode: SimplifiedEpisodeObject;
};

export function EpisodeActionPanel({ title, episode }: EpisodeActionPanelProps) {
  return (
    <ActionPanel>
      <Action
        icon={Icon.Play}
        title="Play"
        onAction={async () => {
          await play({ id: episode.id, type: "episode" });
          showHUD(`Playing ${title}`);
        }}
      />
      <Action
        icon={Icon.Plus}
        title="Add To Queue"
        onAction={async () => {
          await addToQueue({ trackUri: episode.uri as string });
          showToast({ title: "Added to queue", message: title });
        }}
      />
      <ActionPanel.Section>
        <Action.CopyToClipboard
          icon={Icon.Link}
          title="Copy URL"
          content={{
            html: `<a href="${episode?.external_urls?.spotify}" title="${title}">${title}</a>`,
            text: episode?.external_urls?.spotify,
          }}
        />
        {isSpotifyInstalled ? (
          <Action.Open icon="spotify-icon.png" title="Open on Spotify" target={episode.uri || "spotify"} />
        ) : (
          <Action.OpenInBrowser
            title="Open on Spotify Web"
            url={episode?.external_urls?.spotify || "https://play.spotify.com"}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
