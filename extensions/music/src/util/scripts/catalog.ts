import { escapeAppleScriptString } from "../apple-script";
import { CatalogSong } from "../models";

/** Validate the exact catalog identity; the URL is never opened for playback. */
export function catalogPlaybackUrl(song: CatalogSong): string {
  if (!song.playable || !song.url || !song.title || !song.artist || !song.album) {
    throw new Error("This song has no playable catalog link or complete metadata.");
  }
  const url = new URL(song.url);
  if (
    !["https:", "music:"].includes(url.protocol) ||
    url.hostname !== "music.apple.com" ||
    url.username ||
    url.password ||
    url.port ||
    !/^\/[a-z]{2}\/album\/(?:[^/]+\/)?\d+$/.test(url.pathname) ||
    !/^\d+$/.test(song.id) ||
    url.searchParams.getAll("i").length !== 1 ||
    url.searchParams.get("i") !== song.id
  ) {
    throw new Error("Expected an Apple Music album link identifying this exact song.");
  }
  return `music://music.apple.com${url.pathname}?i=${song.id}`;
}

const literal = (value: string) => `"${escapeAppleScriptString(value)}"`;
const matches = (song: CatalogSong) =>
  `player state is playing and name of current track is ${literal(song.title)} and artist of current track is ${literal(song.artist)} and album of current track is ${literal(song.album)}`;

/** Read-only: require the requested metadata and an advancing playback position. */
export function catalogVerifyScript(song: CatalogSong): string {
  return `
    set firstPosition to missing value
    repeat 120 times
      tell application "Music"
        try
          if ${matches(song)} then
            set currentPosition to player position
            if firstPosition is not missing value then
              if currentPosition > firstPosition + 0.05 then return "verified"
            else
              set firstPosition to currentPosition
            end if
          else
            set firstPosition to missing value
          end if
        on error
          set firstPosition to missing value
        end try
      end tell
      delay 0.1
    end repeat
    error "Music did not confirm the requested song with advancing playback."
  `;
}

export const catalogPauseScript = 'tell application "Music" to pause';
