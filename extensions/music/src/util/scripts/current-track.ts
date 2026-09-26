import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as R from "fp-ts/Reader";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { match } from "ts-pattern";

import { getLibraryName } from "./general";
import { createQueryString, escapeAppleScriptString, parseQueryString, runScript, tell } from "../apple-script";
import { STAR_VALUE } from "../constants";
import { getMacosVersion } from "../get-macos-version";
import { MenuBarSnapshot, PlayerState, ScriptError, Track } from "../models";

const FAVORITE_CONFIRMATION_TIMEOUT_MS = 10_000;
const FAVORITE_POLL_INTERVAL_MS = 250;
const FAVORITE_TRACK_ID_MISMATCH = "__TRACK_ID_MISMATCH__";

const isSonomaOrNewer = (versionMajor: number) => versionMajor >= 14;
const isTrackFavorited = (status: string) => status.trim().toLowerCase() === "true";
const getFavoriteErrorMessage = (error: Error | ScriptError) =>
  "shortMessage" in error && typeof error.shortMessage === "string" ? error.shortMessage : error.message;
const getFavoritePropertyByVersion = (versionMajor: number) => (isSonomaOrNewer(versionMajor) ? "favorited" : "loved");
const getFavoriteCommand = (versionMajor: number) =>
  `get ${getFavoritePropertyByVersion(versionMajor)} of current track`;
const getSetFavoriteCommand = (versionMajor: number, targetState: boolean) =>
  isSonomaOrNewer(versionMajor)
    ? `set favorited of current track to ${targetState.toString()}`
    : `set loved of current track to ${targetState.toString()}`;
const getFavoriteByVersion = (versionMajor: number) => tell("Music", getFavoriteCommand(versionMajor));
const getFavoriteForCurrentTrackIdByVersion = (versionMajor: number, trackId: string) =>
  runScript(`
    tell application "Music"
      set expectedTrackId to "${escapeAppleScriptString(trackId)}"
      set currentTrackId to (id of current track) as text

      if currentTrackId is not expectedTrackId then
        return "${FAVORITE_TRACK_ID_MISMATCH}"
      end if

      return (${getFavoritePropertyByVersion(versionMajor)} of current track) as text
    end tell
  `);
const waitForFavoritePollInterval = pipe(
  TE.right(undefined),
  TE.chainFirstTaskK(
    () => () =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, FAVORITE_POLL_INTERVAL_MS);
      }),
  ),
);
const getFavoriteTimeoutError = (targetState: boolean, lastError?: Error | ScriptError) =>
  new Error(
    `Music did not confirm track was ${
      targetState ? "favorited" : "unfavorited"
    } within ${FAVORITE_CONFIRMATION_TIMEOUT_MS / 1000} seconds${
      lastError ? ` (last check error: ${getFavoriteErrorMessage(lastError)})` : ""
    }.`,
  );

type MenuBarSnapshotQuery = {
  kind: string;
  playerState?: string;
  id?: string;
  name?: string;
  artist?: string;
  album?: string;
  duration?: string;
  rating?: string;
  favorited?: string;
};

const getMenuBarNotRunningQueryString = createQueryString({
  kind: '"not-running"',
});
const getMenuBarNoTrackQueryString = createQueryString({
  kind: '"no-track"',
  playerState: "trackPlayerState",
});
const getMenuBarTrackQueryString = createQueryString({
  kind: '"ok"',
  playerState: "trackPlayerState",
  id: "trackId",
  name: "trackName",
  artist: "trackArtist",
  album: "trackAlbum",
  duration: "trackDuration",
  rating: "trackRating",
  favorited: "trackFavorited",
});

const toPlayerState = (playerState?: string): PlayerState =>
  match(playerState)
    .with(PlayerState.PLAYING, () => PlayerState.PLAYING)
    .with(PlayerState.PAUSED, () => PlayerState.PAUSED)
    .otherwise(() => PlayerState.STOPPED);

const toMenuBarSnapshot = (query: MenuBarSnapshotQuery): MenuBarSnapshot =>
  match(query.kind)
    .with("ok", () => ({
      kind: "ok" as const,
      playerState: toPlayerState(query.playerState),
      track: {
        id: query.id,
        name: query.name ?? "",
        artist: query.artist ?? "",
        album: query.album ?? "",
        duration: query.duration ?? "",
        favorited: query.favorited,
      },
    }))
    .with("no-track", () => ({
      kind: "no-track" as const,
      playerState: toPlayerState(query.playerState),
    }))
    .otherwise(() => ({ kind: "not-running" as const }));

const waitForFavoriteConfirmation = (
  getFavoriteStatus: () => TE.TaskEither<ScriptError, string>,
  targetState: boolean,
  startTime: number,
  lastError?: Error | ScriptError,
): TE.TaskEither<Error | ScriptError, void> =>
  pipe(
    getFavoriteStatus(),
    TE.map(isTrackFavorited),
    TE.orElseW((error) => {
      if (Date.now() - startTime >= FAVORITE_CONFIRMATION_TIMEOUT_MS) {
        return TE.left(getFavoriteTimeoutError(targetState, error));
      }

      return pipe(
        waitForFavoritePollInterval,
        TE.chainW(() => waitForFavoriteConfirmation(getFavoriteStatus, targetState, startTime, error)),
      );
    }),
    TE.chainW((isFavorited) => {
      if (isFavorited === targetState) {
        return TE.right(undefined);
      }

      if (Date.now() - startTime >= FAVORITE_CONFIRMATION_TIMEOUT_MS) {
        return TE.left(getFavoriteTimeoutError(targetState, lastError));
      }

      return pipe(
        waitForFavoritePollInterval,
        TE.chainW(() => waitForFavoriteConfirmation(getFavoriteStatus, targetState, startTime, lastError)),
      );
    }),
  );

const setFavoriteWithConfirmation = (targetState: boolean): TE.TaskEither<Error | ScriptError, string> =>
  pipe(
    TE.tryCatch(() => getMacosVersion(), E.toError),
    TE.chainW((version) => {
      const getFavoriteStatus = () => getFavoriteByVersion(version.major);

      return pipe(
        tell("Music", getSetFavoriteCommand(version.major, targetState)),
        TE.chainW((result) =>
          pipe(
            waitForFavoriteConfirmation(getFavoriteStatus, targetState, Date.now()),
            TE.map(() => result),
          ),
        ),
      );
    }),
  );

export const reveal = tell("Music", "reveal current track");
export const getFavorite = pipe(
  TE.tryCatch(() => getMacosVersion(), E.toError),
  TE.chainW((version) => getFavoriteByVersion(version.major)),
);
export const getFavoriteForCurrentTrackId = (trackId: string): TE.TaskEither<Error | ScriptError, string | undefined> =>
  pipe(
    TE.tryCatch(() => getMacosVersion(), E.toError),
    TE.chainW((version) => getFavoriteForCurrentTrackIdByVersion(version.major, trackId)),
    TE.map((favoriteStatus) => (favoriteStatus === FAVORITE_TRACK_ID_MISMATCH ? undefined : favoriteStatus)),
  );
export const favorite = setFavoriteWithConfirmation(true);
export const unfavorite = setFavoriteWithConfirmation(false);
export const getDislike = tell("Music", "get disliked of current track");
export const dislike = tell("Music", "set disliked of current track to true");
export const undislike = tell("Music", "set disliked of current track to false");
export const addToLibrary = pipe(
  tell("Music", `duplicate current track to source 1`),
  TE.orElse((err) => {
    console.error(err);

    return pipe(
      getLibraryName,
      TE.chain((name) =>
        tell("Music", `duplicate current track to library playlist "${escapeAppleScriptString(name)}"`),
      ),
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

/** Add once, then wait for the specific track rather than the library's total count. */
export const addToPlaylist = (playlist: string) =>
  runScript(`
    tell application "Music"
      set targetPlaylist to playlist "${escapeAppleScriptString(playlist)}"
      if smart of targetPlaylist then
        error "Music manages this playlist automatically. Use Favorite Track for Favorite Songs."
      end if

      try
        set playingTrack to current track
        set theName to name of playingTrack
        set theArtist to artist of playingTrack
        set theAlbum to album of playingTrack
      on error number -1728
        error "Music cannot access the current track. For station tracks, add the song in Music first."
      end try

      set existingTracks to (get tracks of library playlist 1 whose name is theName and artist is theArtist and album is theAlbum)
      if (count of existingTracks) = 0 then
        duplicate playingTrack to library playlist 1
        repeat 20 times
          set existingTracks to (get tracks of library playlist 1 whose name is theName and artist is theArtist and album is theAlbum)
          if (count of existingTracks) > 0 then exit repeat
          delay 0.25
        end repeat
      end if

      if (count of existingTracks) = 0 then
        error "The track has not appeared in your library yet. Wait for Music to sync, then try again."
      end if

      try
        duplicate (item 1 of existingTracks) to targetPlaylist
      on error number -54
        error "Music does not allow adding to this playlist. For Favorite Songs, use Favorite Track."
      end try
    end tell
  `);

export const getCurrentTrack = (): TE.TaskEither<Error, Readonly<Track>> => {
  return pipe(
    TE.tryCatch(() => getMacosVersion(), E.toError),
    TE.chainW((version) => {
      const favProp = isSonomaOrNewer(version.major) ? "favorited" : "loved";
      const querystring = createQueryString({
        id: "trackId",
        name: "trackName",
        artist: "trackArtist",
        album: "trackAlbum",
        duration: "trackDuration",
        rating: "trackRating",
        favorited: "trackFavorited",
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
              set trackFavorited to ${favProp} of t

              set output to ${querystring}
            end tell
          end if

          return output
        `),
        TE.map(parseQueryString<Track>()),
      );
    }),
  );
};

export const getMenuBarSnapshot = (): TE.TaskEither<Error, MenuBarSnapshot> =>
  pipe(
    TE.tryCatch(() => getMacosVersion(), E.toError),
    TE.chainW((version) => {
      const favoriteProperty = getFavoritePropertyByVersion(version.major);

      return pipe(
        runScript(`
          if application "Music" is running then
            tell application "Music"
              set trackPlayerState to (player state as text)

              try
                set t to (get current track)
                set trackId to (id of t) as text
                set trackName to name of t
                set trackArtist to artist of t
                set trackAlbum to album of t
                set trackDuration to (duration of t) as text
                set trackRating to (rating of t) as text
                set trackFavorited to (${favoriteProperty} of t) as text

                return ${getMenuBarTrackQueryString}
              on error
                return ${getMenuBarNoTrackQueryString}
              end try
            end tell
          else
            return ${getMenuBarNotRunningQueryString}
          end if
        `),
        TE.map(parseQueryString<MenuBarSnapshotQuery>()),
        TE.map(toMenuBarSnapshot),
      );
    }),
  );

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
