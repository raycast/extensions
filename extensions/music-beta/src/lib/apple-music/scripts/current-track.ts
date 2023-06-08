import { pipe } from "fp-ts/function";
import * as R from "fp-ts/Reader";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "@/lib/fp/task-either";

import { createQueryString, parseQueryString, runScript, tell } from "@/lib/apple-script";
import { STAR_VALUE } from "@/lib/costants";
import { ScriptError } from "@/models/types";
import { getLibraryName } from "./general";
import { match } from "ts-pattern";
import { debug } from "@/lib/logger";

export const reveal = tell("Music", "reveal current track");
export const love = pipe(
	RTE.ask<boolean>(),
	RTE.chainTaskEitherKW((loved = true) => tell("Music", `set loved of current track to ${loved.toString()}`))
);

export const dislike = pipe(
	RTE.ask<boolean>(),
	RTE.chainTaskEitherKW((disliked = true) => tell("Music", `set disliked of current track to ${disliked.toString()}`))
);
export const addToLibrary = pipe(
	tell("Music", 'duplicate current track to source "Library"'),
	TE.orElse(() => tell("Music", 'duplicate current track to library playlist "Library"'))
);

export const loveAndAddToLibrary = pipe(
	love(true),
	TE.chain(() => addToLibrary)
);

/*
 * RATING
 */
export const setCurrentTrackRating: RTE.ReaderTaskEither<number, ScriptError, string> = pipe(
	R.ask<number>(),
	R.map((rating) => tell("Music", `set rating of current track to ${rating * STAR_VALUE} `))
);

export const getCurrentTrackRating = pipe(
	tell("Music", `get rating of current track`),
	TE.map((rating) => parseInt(rating)),
	TE.map((rating) => Math.round(rating / STAR_VALUE))
);

export const rating = {
	get: getCurrentTrackRating,
	set: setCurrentTrackRating,
};

export type CurrentTrack = {
	id: string;
	name: string;
	artist: string;
	album: string;
	duration: number;
	rating: number;
	loved: boolean;
	disliked: boolean;
};

export const getCurrentTrack = (): TE.TaskEither<Error, Readonly<CurrentTrack>> => {
	const querystring = createQueryString({
		id: "trackId",
		name: "trackName",
		artist: "trackArtist",
		album: "trackAlbum",
		duration: "trackDuration",
		rating: "trackRating",
		loved: "trackLoved",
		disliked: "trackDisliked",
	});

	// prettier-ignore
	return pipe(
		runScript(`
      set output to ""
        tell application "Music"
          set t to(get current track)
          set trackId to id of t
          set trackName to name of t
          set trackArtist to artist of t
          set trackAlbum to album of t
          set trackDuration to duration of t
          set trackRating to rating of t
					set trackLoved to loved of t
					set trackDisliked to disliked of t

          set output to ${querystring}
        end tell
return output
  `),
		TE.map(parseQueryString<CurrentTrack>())
	);
};

const getScriptForAddTo = (playlist: string, library = "source 1") =>
	match(library)
		.with(
			"source 1",
			() =>
				`
tell application "Music"
	set theName to name of current track
	set theArtist to artist of current track
	set theAlbum to album of the current track
	set existingTracks to get tracks of source 1 whose name is theName and artist is theArtist and album is theAlbum
	
	if (count of existingTracks) = 0 then
		set theCount to count of tracks of source 1
		duplicate current track to source 1
		
		repeat while theCount = (count of tracks of source 1)
			delay 1
		end repeat
	end if
	
	set theTrack to first track of source 1 whose name is theName and artist is theArtist and album is theAlbum
	duplicate theTrack to playlist "${playlist}"
end tell
`
		)
		.otherwise(
			() =>
				`
tell application "Music"
	set theName to name of current track
	set theArtist to artist of current track
	set theAlbum to album of the current track
	set existingTracks to get tracks of source "${library}" whose name is theName and artist is theArtist and album is theAlbum
	
	if (count of existingTracks) = 0 then
		set theCount to count of tracks of "${library}"
		duplicate current track to library playlist "${library}"
		
		repeat while theCount = (count of tracks of "${library}")
			delay 1
		end repeat
	end if
	
	set theTrack to first track of library playlist "${library}" whose name is theName and artist is theArtist and album is theAlbum
	duplicate theTrack to playlist "${playlist}"
end tell
`
		);
/**
 *
 * Add a track to a playlist
 * @param playlist - The name of the target playlist
 */
export const addToPlaylist = pipe(
	RTE.ask<string>(),
	RTE.chainTaskEitherKW((playlist) =>
		pipe(
			getLibraryName,
			TE.tap((library) => debug("Library name: ", library)),
			TE.chain((library) =>
				pipe(
					getScriptForAddTo(playlist, library),
					runScript,
					TE.orElse((err) => {
						console.error(err);
						return pipe(getScriptForAddTo(playlist, "source 1"), runScript);
					})
				)
			)
		)
	)
);
