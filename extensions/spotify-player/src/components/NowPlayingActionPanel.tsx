import { Action, ActionPanel, closeMainWindow, Color, Icon, popToRoot, showHUD, Clipboard } from "@raycast/api";
import { addToMySavedTracks } from "../api/addToMySavedTracks";
import { pause } from "../api/pause";
import { play } from "../api/play";
import { removeFromMySavedTracks } from "../api/removeFromMySavedTracks";
import { skipToNext } from "../api/skipToNext";
import { skipToPrevious } from "../api/skipToPrevious";
import { startRadio } from "../api/startRadio";
import { isSpotifyInstalled } from "../helpers/isSpotifyInstalled";

type NowPlayingActionPanelProps = {
  isPaused: boolean;
  trackId: string;
  artistId: string;
  trackName: string;
  artistName: string;
  songAlreadyLiked: boolean | null;
  trackUrl: string;
};

export function NowPlayingActionPanel({
  isPaused,
  trackId,
  artistId,
  trackName,
  artistName,
  songAlreadyLiked,
  trackUrl,
}: NowPlayingActionPanelProps) {
  return (
    <ActionPanel>
      {!isPaused && (
        <Action
          icon={Icon.PauseFilled}
          title="Pause"
          onAction={async () => {
            await pause();
            await closeMainWindow();
            await popToRoot();
          }}
        />
      )}
      {isPaused && (
        <Action
          icon={Icon.PlayFilled}
          title="Play"
          onAction={async () => {
            await play();
            await closeMainWindow();
            await popToRoot();
          }}
        />
      )}

      <Action
        icon={Icon.Forward}
        title={"Next Track"}
        shortcut={{ modifiers: ["cmd"], key: "." }}
        onAction={async () => {
          await skipToNext();
          await closeMainWindow();
          await popToRoot();
        }}
      />
      <Action
        icon={Icon.Rewind}
        title={"Previous Track"}
        shortcut={{ modifiers: ["cmd"], key: "," }}
        onAction={async () => {
          await skipToPrevious();
          await closeMainWindow();
          await popToRoot();
        }}
      />
      <Action
        title="Start Radio"
        icon={{ source: "radio.png", tintColor: Color.PrimaryText }}
        onAction={async () => {
          await startRadio({ trackIds: [trackId], artistIds: [artistId] });
          showHUD(`Playing Radio`);
        }}
      />
      {songAlreadyLiked && (
        <Action
          icon={Icon.HeartDisabled}
          title="Dislike"
          onAction={async () => {
            await removeFromMySavedTracks({ trackIds: [trackId] });
            await closeMainWindow();
            await popToRoot();
            showHUD(`Disliked ${trackName}`);
          }}
        />
      )}
      {!songAlreadyLiked && (
        <Action
          icon={Icon.Heart}
          title="Like"
          onAction={async () => {
            await addToMySavedTracks({ trackIds: [trackId] });
            await closeMainWindow();
            await popToRoot();
            showHUD(`Liked ${trackName}`);
          }}
        />
      )}
      <Action
        title="Copy Song URL"
        icon={Icon.Link}
        onAction={async () => {
          const url = `https://open.spotify.com/track/${trackId}`;
          await Clipboard.copy({
            html: `<a href=${url}>${trackName} by ${artistName}</a>`,
            text: url,
          });
          showHUD(`Copied URL to clipboard`);
        }}
      />
      <Action
        icon="icon.png"
        title="Open on Spotify"
        onAction={() => (isSpotifyInstalled ? open(`spotify:track:${trackId}`) : open(trackUrl))}
      />
    </ActionPanel>
  );
}
