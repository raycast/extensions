import { Action, Icon, Keyboard, getPreferenceValues } from "@raycast/api";
import type { RecognizedTrack } from "./types";

type ServiceKey = Preferences["primaryService"];

const SERVICE_ORDER: ServiceKey[] = ["spotify", "youtubemusic", "applemusic", "shazam"];

/**
 * Open-in-service actions shared by the recognize view and the history list.
 * Direct links from Shazam's response are preferred; when a service link is
 * missing (the payload's provider list varies per song) a search link is built
 * instead, so every service is always available. The user's Primary Music
 * Service preference is listed first, making it the Enter/default action.
 */
export function OpenActions({ track }: { track: RecognizedTrack }) {
  const query = encodeURIComponent(`${track.title} ${track.artist}`);

  const actions: Record<ServiceKey, React.ReactNode> = {
    spotify: (
      <Action.Open
        key="spotify"
        title={track.spotifyUri ? "Open in Spotify" : "Search on Spotify"}
        target={track.spotifyUri ?? `spotify:search:${query}`}
        icon={Icon.Music}
      />
    ),
    youtubemusic: (
      <Action.OpenInBrowser
        key="youtubemusic"
        title={track.youtubeMusicUrl ? "Open in YouTube Music" : "Search on YouTube Music"}
        url={track.youtubeMusicUrl ?? `https://music.youtube.com/search?q=${query}`}
        icon={Icon.Play}
      />
    ),
    applemusic: (
      <Action.OpenInBrowser
        key="applemusic"
        title="Search on Apple Music"
        url={track.appleMusicUrl ?? `https://music.apple.com/search?term=${query}`}
        icon={Icon.MagnifyingGlass}
      />
    ),
    shazam: track.shazamUrl ? (
      <Action.OpenInBrowser key="shazam" title="Open Shazam Page" url={track.shazamUrl} icon={Icon.Globe} />
    ) : null,
  };

  const { primaryService } = getPreferenceValues<Preferences>();
  const order = [primaryService, ...SERVICE_ORDER.filter((key) => key !== primaryService)];

  return <>{order.map((key) => actions[key])}</>;
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
