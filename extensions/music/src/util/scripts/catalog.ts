import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";

import { escapeAppleScriptString, runScript } from "../apple-script";
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

/** Music's AppleScript play verb cannot address non-library catalog tracks.
 * Use the accessible album table, never the global Play button (which can
 * resume an unrelated song). Unknown layouts fail closed, without adding.
 */
export function catalogPlaybackScript(song: CatalogSong): string {
  const url = escapeAppleScriptString(catalogPlaybackUrl(song));
  const title = escapeAppleScriptString(song.title);
  const artist = escapeAppleScriptString(song.artist);
  const album = escapeAppleScriptString(song.album);
  return `
    tell application "System Events"
      if not UI elements enabled then error "Enable Raycast in System Settings > Privacy & Security > Accessibility to play catalog songs."
    end tell
    tell application "Music"
      activate
      open location "${url}"
    end tell

    set targetFound to false
    repeat 40 times
      tell application "System Events" to tell process "Music"
        if not frontmost then error "Music lost focus. Retry catalog playback without switching apps."
        try
          set detailArea to scroll area 2 of splitter group 1 of window 1
          set albumHeading to value of (first static text of detailArea whose value is "${album}")
          set artistHeading to value of (first static text of detailArea whose value is "${artist}")
          set targetTable to table 1 of detailArea
          set foundRows to {}
          repeat with r in rows of targetTable
            set rowMatches to false
            repeat with c in UI elements of r
              repeat with t in static texts of c
                if value of t is "${title}" then set rowMatches to true
              end repeat
            end repeat
            if rowMatches then set end of foundRows to contents of r
          end repeat
          if (count of foundRows) is 1 then set targetFound to true
        on error
          set targetFound to false
        end try
        if targetFound then
          set selected of item 1 of foundRows to true
          set focused of targetTable to true
          if not frontmost then error "Music lost focus before playback."
          key code 36
        end if
      end tell
      if targetFound then exit repeat
      delay 0.25
    end repeat
    if not targetFound then error "Could not identify a unique catalog song in Music. Open it in Music to play manually; this layout may not be supported."

    repeat 40 times
      tell application "Music"
        try
          if player state is playing and name of current track is "${title}" and artist of current track is "${artist}" and album of current track is "${album}" then return "verified"
        end try
      end tell
      delay 0.25
    end repeat
    error "Music did not confirm playback of the requested song."
  `;
}

export const playCatalogSong = (song: CatalogSong): TE.TaskEither<Error, void> =>
  pipe(
    TE.tryCatch(async () => catalogPlaybackScript(song), E.toError),
    TE.chainW((script) => runScript(script, 30_000)),
    TE.chain((result) =>
      result.trim() === "verified"
        ? TE.right(undefined)
        : TE.left(new Error("Music did not confirm playback of the requested song.")),
    ),
  );
