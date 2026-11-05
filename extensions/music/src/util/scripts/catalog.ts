import { escapeAppleScriptString } from "../apple-script";
import type { CatalogAlbumDetail } from "../catalog-api";
import { CatalogSong } from "../models";

/** Only album links with an explicit song ID are safe to play. */
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

export function catalogAlbumId(song: CatalogSong): string {
  return new URL(catalogPlaybackUrl(song)).pathname.split("/").at(-1)!;
}

export interface CatalogPlaybackPlan {
  url: string;
  tracks: CatalogSong[];
}

const identity = (song: CatalogSong) => JSON.stringify([song.title, song.artist, song.album]);

/** Music starts an album at track one. Validate every step before touching playback. */
export function catalogPlaybackPlan(song: CatalogSong, detail: CatalogAlbumDetail | null): CatalogPlaybackPlan {
  const url = catalogPlaybackUrl(song);
  if (!detail || detail.album.id !== catalogAlbumId(song) || detail.tracks.length !== detail.album.trackCount) {
    throw new Error("The complete album tracklist is unavailable. Open this song in Music instead.");
  }
  const index = detail.tracks.findIndex((track) => track.id === song.id);
  if (index < 0 || detail.tracks.filter((track) => track.id === song.id).length !== 1) {
    throw new Error("The requested song could not be identified in its album.");
  }
  if (identity(detail.tracks[index]) !== identity(song)) {
    throw new Error("The album and song metadata do not match.");
  }
  const tracks = detail.tracks.slice(0, index + 1);
  for (const track of tracks) {
    if (!track.playable || !track.title || !track.artist || !track.album) {
      throw new Error("An earlier album track is unavailable. Cannot safely navigate to this song.");
    }
    if (detail.tracks.filter((candidate) => identity(candidate) === identity(track)).length !== 1) {
      throw new Error("This album contains indistinguishable tracks. Open this song in Music instead.");
    }
  }
  return { url, tracks };
}

const literal = (value: string) => `"${escapeAppleScriptString(value)}"`;
const matches = (song: CatalogSong) =>
  `player state is playing and name of current track is ${literal(song.title)} and artist of current track is ${literal(song.artist)} and album of current track is ${literal(song.album)}`;

// Music applies shuffle changes asynchronously, even after its setter returns.
const waitForSettingsScript = `
    on waitForSettings(expectedVolume, expectedShuffle)
      repeat 40 times
        tell application "Music"
          try
            if sound volume is expectedVolume and shuffle enabled is expectedShuffle then return
          end try
        end tell
        delay 0.1
      end repeat
      error "Music did not confirm its volume and shuffle settings."
    end waitForSettings
`;

/** No Accessibility, UI selection, keyboard events or activation of Music. */
export function catalogPlaybackScript(plan: CatalogPlaybackPlan): string {
  const steps = plan.tracks
    .map(
      (track, index) => `
        ${index === 0 ? "" : 'tell application "Music" to next track'}
        my waitForTrack(${literal(track.title)}, ${literal(track.artist)}, ${literal(track.album)}, deadline)
      `,
    )
    .join("\n");
  return `
    ${waitForSettingsScript}
    on waitForTrack(expectedTitle, expectedArtist, expectedAlbum, deadline)
      repeat
        if (current date) > deadline then error "Music did not confirm the expected album track before the deadline."
        tell application "Music"
          try
            if player state is playing and name of current track is expectedTitle and artist of current track is expectedArtist and album of current track is expectedAlbum then return
          end try
        end tell
        delay 0.1
      end repeat
    end waitForTrack

    set deadline to (current date) + 45
    tell application "Music"
      set sound volume to 0
      set shuffle enabled to false
    end tell
    my waitForSettings(0, false)
    tell application "Music" to stop
    do shell script "/usr/bin/open -g " & quoted form of ${literal(plan.url)}
    -- Give Music time to receive the album navigation before rebuilding its queue.
    delay 2
    tell application "Music" to play
    ${steps}
    return "verified"
  `;
}

export interface CatalogPlaybackState {
  volume: number;
  shuffle: boolean;
}

export const catalogStateScript = `
  tell application "Music"
    return (sound volume as text) & "|" & (shuffle enabled as text)
  end tell
`;

export function parseCatalogState(raw: string): CatalogPlaybackState {
  const match = /^(\d{1,3})\|(true|false)$/.exec(raw.trim());
  if (!match || Number(match[1]) > 100) throw new Error("Could not save Music's volume and shuffle settings.");
  return { volume: Number(match[1]), shuffle: match[2] === "true" };
}

/** Runs in a separate subprocess even when the playback subprocess times out. */
export function catalogRestoreScript(state: CatalogPlaybackState, song: CatalogSong, confirmed: boolean): string {
  return `
    ${waitForSettingsScript}
    set verified to false
    tell application "Music"
      ${
        confirmed
          ? `try
        set verified to (${matches(song)})
      end try`
          : ""
      }
      if not verified then pause
      set sound volume to ${state.volume}
      set shuffle enabled to ${state.shuffle}
    end tell
    my waitForSettings(${state.volume}, ${state.shuffle})
    if verified then
      set verified to false
      tell application "Music"
        try
          set verified to (${matches(song)})
        end try
        if not verified then pause
      end tell
    end if
    if verified then return "verified"
    return "not-verified"
  `;
}

export function catalogNotificationScript(song: CatalogSong): string {
  return `display notification ${literal(`${song.title} — ${song.artist}`)} with title "Music" subtitle "Playing"`;
}
