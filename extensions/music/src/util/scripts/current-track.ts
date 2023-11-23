import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as R from "fp-ts/Reader";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { match } from "ts-pattern";

import { getLibraryName } from "./general";
import { createQueryString, parseQueryString, runScript, tell } from "../apple-script";
import { STAR_VALUE } from "../costants";
import { getMacosVersion } from "../get-macos-version";
import { ScriptError, Track } from "../models";

export const reveal = tell("Music", "reveal current track");
export const favorite = pipe(
  TE.tryCatch(() => getMacosVersion(), E.toError),
  TE.chainW((version) =>
    version.major >= 14
      ? tell("Music", "set favorited of current track to true")
      : tell("Music", "set loved of current track to true")
  )
);
export const dislike = tell("Music", "set disliked of current track to true");
export const addToLibrary = pipe(
  tell("Music", `duplicate current track to source 1`),
  TE.orElse((err) => {
    console.error(err);

    return pipe(
      getLibraryName,
      TE.chain((name) => tell("Music", `duplicate current track to library playlist "${name}"`))
    );
  })
);

export const setCurrentTrackRating: RTE.ReaderTaskEither<number, ScriptError, string> = pipe(
  R.ask<number>(),
  R.map((rating) => tell("Music", `set rating of current track to ${rating * STAR_VALUE}`))
);

export const getCurrentTrackRating = pipe(
  tell("Music", `get rating of current track`),
  TE.map((rating) => parseInt(rating)),
  TE.map((rating) => Math.round(rating / STAR_VALUE))
);

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
export const addToPlaylist = (playlist: string) =>
  pipe(
    getLibraryName,
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
  );

export const getCurrentTrack = (): TE.TaskEither<Error, Readonly<Track>> => {
  const querystring = createQueryString({
    id: "trackId",
    name: "trackName",
    artist: "trackArtist",
    album: "trackAlbum",
    duration: "trackDuration",
    rating: "trackRating",
  });

  // prettier-ignore
  return pipe(
    runScript(`
      set output to ""
        tell application "Music"
          set t to (get current track)
          set trackId to id of t
          set trackName to name of t
          set trackArtist to artist of t
          set trackAlbum to album of t
          set trackDuration to duration of t
          set trackRating to rating of t

          set output to ${querystring}
        end tell
      return output
    `),
    TE.map(parseQueryString<Track>())
  );
};
