import { Action, ActionPanel, Color, Icon, showHUD, showToast } from "@raycast/api";
import { addToQueue } from "../api/addTrackToQueue";
import { play } from "../api/play";
import { startRadio } from "../api/startRadio";
import { isSpotifyInstalled } from "../helpers/isSpotifyInstalled";

type TrackActionPanelProps = {
  title: string;
  track: SpotifyApi.TrackObjectSimplified;
};

export function TrackActionPanel({ title, track }: TrackActionPanelProps) {
  return (
    <ActionPanel title={title}>
      <Action
        icon={Icon.Play}
        title="Play"
        onAction={async () => {
          await play({ id: track.id, type: 'track' });
          showHUD(`Playing ${title}`);
        }}
      />
      <Action
        icon={{ source: "radio.png", tintColor: Color.PrimaryText }}
        title="Start Radio"
        onAction={async () => {
          await startRadio({ trackIds: [track.id] });
          showHUD(`Playing ${title} Radio`);
        }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      />
      <Action
        icon={Icon.Plus}
        title="Add To Queue"
        onAction={async () => {
          await addToQueue({ trackUri: track.uri });
          showToast({ title: "Added to queue", message: title });
        }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "+" }}
      />
      <Action.CopyToClipboard
        icon={Icon.Link}
        title="Copy URL"
        content={{
          html: `<a href="${track.external_urls.spotify}" title="${title}">${title}</a>`,
          text: track.external_urls.spotify,
        }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
      />
      <Action.OpenInBrowser
        icon="icon.png"
        title="Open on Spotify"
        url={isSpotifyInstalled ? `spotify:track:${track.id}` : track.external_urls.spotify}
      />
    </ActionPanel>
  );
}
