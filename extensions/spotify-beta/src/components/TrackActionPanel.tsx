import { Action, ActionPanel, Icon, showHUD, showToast } from "@raycast/api";
import { addToQueue } from "../api/addTrackToQueue";
import { play } from "../api/play";
import { startRadio } from "../api/startRadio";
import { SimplifiedAlbumObject, SimplifiedTrackObject } from "../helpers/spotify.api";
import { isSpotifyInstalled } from "../helpers/isSpotifyInstalled";
import { TracksList } from "./TracksList";

type TrackActionPanelProps = {
  title: string;
  track: SimplifiedTrackObject;
  album?: SimplifiedAlbumObject;
  showGoToAlbum?: boolean;
};

export function TrackActionPanel({ title, track, album, showGoToAlbum }: TrackActionPanelProps) {
  return (
    <ActionPanel>
      <Action
        icon={Icon.Play}
        title="Play"
        onAction={async () => {
          await play({ id: track.id, type: "track" });
          showHUD(`Playing ${title}`);
        }}
      />
      {album && showGoToAlbum && (
        <Action.Push
          icon={Icon.AppWindowList}
          title="Go to Album"
          target={<TracksList album={album} showGoToAlbum={false} />}
        />
      )}
      <Action
        icon={Icon.Music}
        title="Start Radio"
        onAction={async () => {
          await startRadio({ trackIds: [track.id as string] });
          showHUD(`Playing ${title} Radio`);
        }}
      />
      <Action
        icon={Icon.Plus}
        title="Add To Queue"
        onAction={async () => {
          await addToQueue({ trackUri: track.uri as string });
          showToast({ title: "Added to queue", message: title });
        }}
      />
      <ActionPanel.Section>
        <Action.CopyToClipboard
          icon={Icon.Link}
          title="Copy URL"
          content={{
            html: `<a href="${track?.external_urls?.spotify}" title="${title}">${title}</a>`,
            text: track?.external_urls?.spotify,
          }}
        />
        {isSpotifyInstalled ? (
          <Action.Open icon="spotify-icon.png" title="Open on Spotify" target={track.uri || "spotify"} />
        ) : (
          <Action.OpenInBrowser
            title="Open on Spotify Web"
            url={track?.external_urls?.spotify || "https://play.spotify.com"}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
