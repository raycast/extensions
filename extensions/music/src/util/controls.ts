import { runAppleScript } from "run-applescript";

import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";

enum PlayerState {
  PLAYING = "playing",
  PAUSED = "paused",
  STOPPED = "stopped",
}

const tell = (application: string, command: string) =>
  TE.tryCatch(() => runAppleScript(`tell application "${application}" to ${command}`), E.toError);

export const pause = tell("Music", "pause");
export const play = tell("Music", "play");
export const stop = tell("Music", "stop");
export const next = tell("Music", "next track");
export const previous = tell("Music", "previous track");
export const togglePlay = tell("Music", "playpause");
export const getPlayerState = pipe(
  tell("Music", "player state"),
  TE.map((state) => state as PlayerState)
);
export const love = tell("Music", "set loved of current track to true");
export const dislike = tell("Music", "set disliked of current track to true");
export const addToLibrary = tell("Music", 'duplicate current track to source "Library"');

export interface TrackInfo {
  name: string;
  artist: string;
  album: string;
  duration: string;
  state: PlayerState;
}

export const getCurrentTrack = (): TE.TaskEither<Error, Readonly<TrackInfo>> => {
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
