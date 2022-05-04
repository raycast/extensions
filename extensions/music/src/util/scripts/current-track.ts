import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as R from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'

import { tell } from '../apple-script'
import { STAR_VALUE } from '../costants';
import { getPlayerState } from './player-controls';
import { Track } from '../models';


export const love = tell("Music", "set loved of current track to true");
export const dislike = tell("Music", "set disliked of current track to true");
export const addToLibrary = tell("Music", 'duplicate current track to source "Library"');

export const setCurrentTrackRating: RTE.ReaderTaskEither<number, Error, string> = pipe(
	R.ask<number>(),
	R.map(rating => tell("Music", `set rating of current track to ${rating * STAR_VALUE}`))
)

export const getCurrentTrackRating = pipe(
	tell("Music", `get rating of current track`),
	TE.map(rating => parseInt(rating)),
	TE.map(rating => Math.round(rating / STAR_VALUE))
);

export const getCurrentTrack = (): TE.TaskEither<Error, Readonly<Track>> => {
	const trackName = tell("Music", "get name of current track");
	const trackArtist = tell("Music", "get artist of current track");
	const trackAlbum = tell("Music", "get album of current track");
	const trackDuration = tell("Music", "get duration of current track");

	return pipe(
	  TE.Do,
	  TE.apS("name", trackName),
	  TE.apS("artist", trackArtist),
	  TE.apS("album", trackAlbum),
	  TE.apS("duration", trackDuration),
	  TE.apS("state", getPlayerState)
	);
  };
