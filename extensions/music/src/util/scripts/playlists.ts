import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

import { tell, runScript, createQueryString, escapeAppleScriptString, NOT_IN_LIBRARY_ERROR } from "../apple-script";
import { PlaylistKind, ScriptError } from "../models";
import { parseResult } from "../parser";

import { general } from ".";

const outputQuery = createQueryString({
  id: "pId",
  name: "pName",
  duration: "pDuration",
  count: "pCount",
  time: "pTime",
  kind: "pKind",
});

const playListKindToString = (kind: PlaylistKind) => (kind === PlaylistKind.ALL ? "" : kind);

const loopThroughPlaylists = (kind: PlaylistKind) => `
	repeat with selectedPlaylist in ${playListKindToString(kind)} playlists
		set pId to the id of selectedPlaylist
		set pName to the name of selectedPlaylist
		set pDuration to the duration of selectedPlaylist
		set pCount to count (tracks of selectedPlaylist)
		set pTime to the time of selectedPlaylist
		set pKind to the class of selectedPlaylist
		set output to output & ${outputQuery} & "\n"
    end repeat
`;

export const play =
  (shuffle = false) =>
  (name: string): TE.TaskEither<ScriptError, string> =>
    pipe(
      general.setShuffle(shuffle),
      TE.chain(() => tell("Music", `play playlist "${escapeAppleScriptString(name.trim())}"`)),
    );

export const playById =
  (shuffle = false) =>
  (id: string) =>
    pipe(
      general.setShuffle(shuffle),
      TE.chain(() => tell("Music", `play (every playlist whose id is "${escapeAppleScriptString(id)}")`)),
    );

export const getPlaylistId = (name: string) => tell("Music", `get id of playlist "${escapeAppleScriptString(name)}"`);

export const getPlaylists = (kind: PlaylistKind): TE.TaskEither<Error, string> =>
  runScript(`
	set output to ""
        tell application "Music"
			${kind === PlaylistKind.ALL ? loopThroughPlaylists(PlaylistKind.ALL) : loopThroughPlaylists(kind)}
        end tell
	return output
`);

export interface LocalPlaylist {
  /** Music.app's own (per-launch) playlist id. */
  id: string;
  name: string;
  kind: "subscription playlist" | "user playlist";
}

/** Ids and names of every Apple Music ("subscription") and user playlist in
 * Music.app. Fetched as bulk properties — four Apple events in total — rather
 * than walking playlists one at a time, which costs ~50ms each and would
 * blow the script timeout on a library of a hundred playlists. Folders and
 * the library root are excluded. */
export const getLocalPlaylists = (): TE.TaskEither<ScriptError, readonly LocalPlaylist[]> =>
  pipe(
    runScript(`
	set output to ""
	tell application "Music"
		set subIds to id of subscription playlists
		set subNames to name of subscription playlists
		set userIds to id of user playlists
		set userNames to name of user playlists
	end tell
	repeat with i from 1 to count of subIds
		set output to output & ${createQueryString({ id: "(item i of subIds)", name: "(item i of subNames)" })} & "$BREAKkind=subscription playlist" & linefeed
	end repeat
	repeat with i from 1 to count of userIds
		set output to output & ${createQueryString({ id: "(item i of userIds)", name: "(item i of userNames)" })} & "$BREAKkind=user playlist" & linefeed
	end repeat
	return output
`),
    TE.map(parseResult<LocalPlaylist>()),
  );

/** Play a playlist by Music.app id, raising NOT_IN_LIBRARY_ERROR if it has
 * disappeared since the local index was built. */
export const playLocal =
  (shuffle = false) =>
  (id: string) =>
    pipe(
      general.setShuffle(shuffle),
      TE.chain(() =>
        runScript(`
	tell application "Music"
		set matches to (every playlist whose id is "${escapeAppleScriptString(id)}")
		if (count of matches) = 0 then error "Not found in library" number ${NOT_IN_LIBRARY_ERROR}
		play (item 1 of matches)
	end tell
`),
      ),
    );
