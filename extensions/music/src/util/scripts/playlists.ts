import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

import { tell, runScript, createQueryString, escapeAppleScriptString } from "../apple-script";
import { PlaylistKind, ScriptError } from "../models";

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
