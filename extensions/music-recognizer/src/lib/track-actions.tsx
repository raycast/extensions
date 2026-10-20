import { Action, Icon, Keyboard, getPreferenceValues } from "@raycast/api";
import type { RecognizedTrack } from "./types";

type ServiceKey = Preferences["primaryService"];

const SERVICE_ORDER: ServiceKey[] = ["spotify", "youtubemusic", "applemusic"];

/**
 * Open-in-service actions shared by the recognize view and the history list.
 * Direct links from the provider's response are preferred; when one is missing
 * (which services are returned varies per song) a search link is built instead,
 * so every service is always available. The user's Primary Music Service
 * preference is listed first, making it the Enter/default action.
 *
 * The service icons are each provider's official mark, used unmodified to
 * link to that service, as their brand guidelines require. The wording is
 * prescribed too: Apple insists on "on Apple Music" (never "in"), and
 * "Play on Spotify" is one of Spotify's approved link labels.
 */
export function OpenActions({ track }: { track: RecognizedTrack }) {
  const query = encodeURIComponent(`${track.title} ${track.artist}`);

  const actions: Record<ServiceKey, React.ReactNode> = {
    spotify: (
      // Web links rather than spotify: URIs - those open nothing at all when
      // the desktop app isn't installed, while open.spotify.com works either way.
      <Action.OpenInBrowser
        key="spotify"
        title={track.spotifyUrl ? "Play on Spotify" : "Search on Spotify"}
        url={track.spotifyUrl ?? `https://open.spotify.com/search/${query}`}
        icon={{ source: "spotify.png" }}
      />
    ),
    youtubemusic: (
      <Action.OpenInBrowser
        key="youtubemusic"
        title={track.youtubeMusicUrl ? "Play on YouTube Music" : "Search on YouTube Music"}
        url={track.youtubeMusicUrl ?? `https://music.youtube.com/search?q=${query}`}
        icon={{ source: "youtube-music.png" }}
      />
    ),
    applemusic: (
      <Action.OpenInBrowser
        key="applemusic"
        title={track.appleMusicUrl ? "Listen on Apple Music" : "Search on Apple Music"}
        url={track.appleMusicUrl ?? `https://music.apple.com/search?term=${query}`}
        // Apple licenses the icon for linking to music content; a search page
        // is not that, so the fallback drops back to a generic icon.
        icon={track.appleMusicUrl ? { source: "apple-music.png" } : Icon.MagnifyingGlass}
      />
    ),
  };

  const { primaryService } = getPreferenceValues<Preferences>();
  const order = [primaryService, ...SERVICE_ORDER.filter((key) => key !== primaryService)];

  return (
    <>
      {order.map((key) => actions[key])}
      {track.songUrl && <Action.OpenInBrowser title="Open Song Page" url={track.songUrl} icon={Icon.Globe} />}
    </>
  );
}

/** Copy actions shared by the recognize view and the history list. */
export function CopyActions({ track }: { track: RecognizedTrack }) {
  return (
    <>
      <Action.CopyToClipboard
        title="Copy Song Info"
        content={`${track.artist} - ${track.title}`}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
      <Action.CopyToClipboard title="Copy Title" content={track.title} />
    </>
  );
}
