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

/** Fixed, read-only script: catalog metadata is passed separately through argv. */
export const catalogVerifyScript = `
  on run argv
    if (count of argv) is not 3 then error "Expected title, artist and album."
    set expectedTitle to item 1 of argv
    set expectedArtist to item 2 of argv
    set expectedAlbum to item 3 of argv
    set firstPosition to missing value
    repeat 120 times
      tell application "Music"
        try
          if player state is playing and name of current track is expectedTitle and artist of current track is expectedArtist and album of current track is expectedAlbum then
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
    error "Music did not confirm the requested song with advancing playback. Check Music before retrying."
  end run
`;
