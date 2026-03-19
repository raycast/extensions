import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

import { runScript, tell } from "../apple-script";
import { ScriptError } from "../models";

import { general } from ".";

export enum PlaylistKind {
  ALL = "all",
  USER = "user",
  SUBSCRIPTION = "subscription",
}

const playlistRef = (kind: PlaylistKind) => (kind === PlaylistKind.ALL ? "" : kind);

const loopThroughPlaylists = (kind: PlaylistKind) => `
	repeat with selectedPlaylist in ${playlistRef(kind)} playlists
		set pId to the id of selectedPlaylist
		set pName to the name of selectedPlaylist
		set pDuration to the duration of selectedPlaylist
		set pCount to count (tracks of selectedPlaylist)
		set pKind to the class of selectedPlaylist
		set output to output & "id=" & pId & "$BREAKname=" & pName & "$BREAKduration=" & pDuration & "$BREAKcount=" & pCount & "$BREAKkind=" & pKind & "\n"
	end repeat
`;

export const play =
  (shuffle = false) =>
  (name: string): TE.TaskEither<ScriptError, string> =>
    pipe(
      general.setShuffle(shuffle),
      TE.chain(() => tell("Music", `play playlist "${name.trim()}"`)),
    );

export const playById =
  (shuffle = false) =>
  (id: string) =>
    pipe(
      general.setShuffle(shuffle),
      TE.chain(() => tell("Music", `play (every playlist whose id is "${id}")`)),
    );

export const getPlaylistId = (name: string) => tell("Music", `get id of playlist "${name}"`);

export const getPlaylists = (kind: PlaylistKind): TE.TaskEither<Error, string> =>
  runScript(`
	set output to ""
	tell application "Music"
		${loopThroughPlaylists(kind)}
	end tell
	return output
`);
