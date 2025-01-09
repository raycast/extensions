import { Image, MenuBarExtra, open, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import useSpotifyNowPlaying from "./useSpotifyNowPlaying";

export default function Command() {
  const { track, isLoading } = useSpotifyNowPlaying();

  const spotifyIcon = { source: { dark: "spotify-dark.svg", light: "spotify-light.svg" } };

  const changeSong = (action: "next" | "previous") => {
    exec(`osascript -e 'tell application "Spotify" to ${action} track'`, (error) => {
      if (error) {
        showToast(Toast.Style.Failure, `Failed to skip to ${action} track.`);
      }
    });
  };

  return (
    <MenuBarExtra
      icon={track?.artworkUrl ? { source: track.artworkUrl, mask: Image.Mask.RoundedRectangle } : spotifyIcon}
      title={track ? `${track.name} - ${track.artist}` : undefined}
      isLoading={isLoading}
      tooltip={track ? `${track.name} by ${track.artist}` : "No song is currently playing on Spotify."}
    >
      {track ? (
        <>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title="Next Track"
              icon={{ source: { dark: "skip-next-dark.svg", light: "skip-next-light.svg" } }}
              onAction={() => changeSong("next")}
            />
            <MenuBarExtra.Item
              title="Previous Track"
              icon={{ source: { dark: "skip-previous-dark.svg", light: "skip-previous-light.svg" } }}
              onAction={() => changeSong("previous")}
            />
          </MenuBarExtra.Section>
          <MenuBarExtra.Item title="Open Spotify" icon={spotifyIcon} onAction={() => open("spotify://")} />
        </>
      ) : (
        <MenuBarExtra.Item title="No song is currently playing on Spotify." />
      )}
    </MenuBarExtra>
  );
}
