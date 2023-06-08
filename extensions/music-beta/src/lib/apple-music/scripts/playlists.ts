import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

import { createQueryString, runScript, tell } from "@/lib/apple-script";
import { ScriptError } from "@/models/types";

import { player } from ".";

const outputQuery = createQueryString({
	id: "pId",
	name: "pName",
	duration: "pDuration",
	count: "pCount",
	time: "pTime",
	kind: "pKind",
});

enum PlaylistKind {
	ALL = "all",
	USER = "user",
	SUBSCRIPTION = "subscription",
}

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
			player.shuffle.set(shuffle),
			TE.chain(() => tell("Music", `play playlist "${name.trim()}"`))
		);

export const playById =
	(shuffle = false) =>
	(id: string) =>
		pipe(
			player.shuffle.set(shuffle),
			TE.chain(() => tell("Music", `play (every playlist whose id is "${id}")`))
		);

export const findPlaylist = (name: string) => tell("Music", `get id of every playlist whose name is "${name}"`);

export const getPlaylists = (kind: PlaylistKind): TE.TaskEither<Error, string> =>
	runScript(`
	set output to ""
        tell application "Music"
			${kind === PlaylistKind.ALL ? loopThroughPlaylists(PlaylistKind.ALL) : loopThroughPlaylists(kind)}
        end tell
	return output
`);
