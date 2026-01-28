import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as R from "fp-ts/Reader";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { match } from "ts-pattern";

import { getLibraryName } from "./general";
import { createQueryString, parseQueryString, runScript, tell } from "../apple-script";
import { STAR_VALUE } from "../constants";
import { getMacosVersion } from "../get-macos-version";
import { ScriptError, Track } from "../models";

export const reveal = tell("Music", "reveal current track");
export const getFavorite = pipe(
  TE.tryCatch(() => getMacosVersion(), E.toError),
  TE.chainW((version) =>
    version.major >= 14 ? tell("Music", "get favorited of current track") : tell("Music", "get loved of current track"),
  ),
);
export const favorite = pipe(
  TE.tryCatch(() => getMacosVersion(), E.toError),
  TE.chainW((version) =>
    version.major >= 14
      ? tell("Music", "set favorited of current track to true")
      : tell("Music", "set loved of current track to true"),
  ),
);
export const unfavorite = pipe(
  TE.tryCatch(() => getMacosVersion(), E.toError),
  TE.chainW((version) =>
    version.major >= 14
      ? tell("Music", "set favorited of current track to false")
      : tell("Music", "set loved of current track to false"),
  ),
);
export const getDislike = tell("Music", "get disliked of current track");
export const dislike = tell("Music", "set disliked of current track to true");
export const undislike = tell("Music", "set disliked of current track to false");
export const addToLibrary = pipe(
  tell("Music", `duplicate current track to source 1`),
  TE.orElse((err) => {
    console.error(err);

    return pipe(
      getLibraryName,
      TE.chain((name) => tell("Music", `duplicate current track to library playlist "${name}"`)),
    );
  }),
);

export const setCurrentTrackRating: RTE.ReaderTaskEither<number, ScriptError, string> = pipe(
  R.ask<number>(),
  R.map((rating) => tell("Music", `set rating of current track to ${rating * STAR_VALUE}`)),
);

export const getCurrentTrackRating = pipe(
  tell("Music", `get rating of current track`),
  TE.map((rating) => parseInt(rating)),
  TE.map((rating) => Math.round(rating / STAR_VALUE)),
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
`,
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
`,
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
        }),
      ),
    ),
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
      tell application "System Events"
        set isNotRunning to (count of (every process whose name is "Music")) = 0
      end tell

      if isNotRunning then
        error
      else
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
      end if

      return output
    `),
    TE.map(parseQueryString<Track>())
  );
};

// Adapted from: https://dougscripts.com/itunes/2018/05/remove-currently-playing-from-current-playlist/
export const removeCurrentTrackFromCurrentPlaylist = (): TE.TaskEither<
  Error,
  Readonly<Pick<Track, "name" | "artist" | "album"> & { playlist: string }>
> => {
  const querystring = createQueryString({
    name: "tName",
    artist: "tArtist",
    album: "tAlbum",
    playlist: "tPlaylist",
  });

  // prettier-ignore
  return pipe(
    runScript(`
      set output to ""
        tell application "Music"
          set t to (get current track)
          set tName to name of t
          set tArtist to artist of t
          set tAlbum to album of t

          set tPlaylist to name of current playlist

          next track
          delete t

          set output to ${querystring}
        end tell
      return output
    `),
    TE.map(parseQueryString())
  );
};

export const removeFromLibrary = runScript(`
  tell application "Music" to activate
  delay 0.1
  tell application "System Events"
    tell process "Music"
      if exists (menu item "Delete from Library" of menu "Song" of menu bar item "Song" of menu bar 1) then
        click menu item "Delete from Library" of menu "Song" of menu bar item "Song" of menu bar 1
      end if
      if exists (button "Delete Song" of window 1) then
        click button "Delete Song" of window 1
      end if
    end tell
  end tell
`);

export const getCurrentTrackInfo = (): TE.TaskEither<
  ScriptError,
  Readonly<Pick<Track, "name" | "artist" | "album">>
> => {
  const querystring = createQueryString({
    name: "tName",
    artist: "tArtist",
    album: "tAlbum",
  });

  // prettier-ignore
  return pipe(
    runScript(`
      set output to ""
        tell application "Music"
          set t to (get current track)
          set tName to name of t
          set tArtist to artist of t
          set tAlbum to album of t
          set output to ${querystring}
        end tell
      return output
    `),
    TE.map(parseQueryString())
  );
};
