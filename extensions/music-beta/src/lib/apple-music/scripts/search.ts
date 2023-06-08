import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

import { createQueryString, parseQueryString, parseResult, runScript } from "@/lib/apple-script";
import { Song } from "@/models/music";

export type ASTrack = {
	id: string;
	name: string;
	artist: string;
	album: string;
};

export const experimental_songSearch = (song: Song) => {
	const outputQuery = createQueryString({
		id: "trackId",
		name: "trackName",
		artist: "artistName",
		album: "albumName",
		duration: "trackDuration",
	});

	return pipe(
		runScript(`
		set output to ""
			tell application "Music"
				set results to (every track whose name is "${song.attributes.name}" and artist is "${song.attributes.artistName}" and album is "${song.attributes.albumName}")

				repeat with selectedTrack in results
					set trackId to the id of selectedTrack
					set trackName to the name of selectedTrack
					set albumName to the album of selectedTrack
					set artistName to the artist of selectedTrack
					set trackDuration to the duration of selectedTrack
					set output to output & ${outputQuery} & "\n"
				end repeat
			end tell
		return output
	`),
		TE.map(parseQueryString<ASTrack>())
	);
};

export const searchTrack = (search: string) => {
	const outputQuery = createQueryString({
		id: "trackId",
		name: "trackName",
		artist: "artistName",
		album: "albumName",
		duration: "trackDuration",
	});

	return pipe(
		runScript(`
		set output to ""
			tell application "Music"
				set results to (every track whose name contains "${search}" or artist contains "${search}")
				repeat with selectedTrack in results
					set trackId to the id of selectedTrack
					set trackName to the name of selectedTrack
					set albumName to the album of selectedTrack
					set artistName to the artist of selectedTrack
					set trackDuration to the duration of selectedTrack
					set output to output & ${outputQuery} & "\n"
				end repeat
			end tell
		return output
	`),
		TE.map(parseResult<ASTrack>())
	);
};
