import { pipe } from "fp-ts/function";
import * as R from "fp-ts/Reader";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { createQueryString, parseQueryString, runScript, tell } from "../apple-script";
import { STAR_VALUE } from "../costants";
import { Track } from "../models";

export const love = tell("Music", "set loved of current track to true");
export const dislike = tell("Music", "set disliked of current track to true");
export const addToLibrary = tell("Music", 'duplicate current track to library playlist "Library"');

export const setCurrentTrackRating: RTE.ReaderTaskEither<number, Error, string> = pipe(
  R.ask<number>(),
  R.map((rating) => tell("Music", `set rating of current track to ${rating * STAR_VALUE}`))
);

export const getCurrentTrackRating = pipe(
  tell("Music", `get rating of current track`),
  TE.map((rating) => parseInt(rating)),
  TE.map((rating) => Math.round(rating / STAR_VALUE))
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
