import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { runAppleScript } from "run-applescript";
import { PlayerState, Track } from "./models";

const tell = (application: string, command: string) =>
  TE.tryCatch(() => runAppleScript(`tell application "${application}" to ${command}`), E.toError);

const tellCustom = (command: string) => TE.tryCatch(() => runAppleScript(command), E.toError);

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

export const playPlaylist = (name: string): TE.TaskEither<Error, string> =>
  tell("Music", `play playlist "${name.trim()}"`);

export const getPlaylists = (): TE.TaskEither<Error, string> =>
  tellCustom(`set output to ""
        tell application "Music"
        ${loopThroughPlaylists("subscription")}
        ${loopThroughPlaylists("user")}
        end tell
        return output`);

const loopThroughPlaylists = (type: "subscription" | "user") => {
  return `repeat with selectedPlaylist in ${type} playlists
    set pId to the id of selectedPlaylist
    set pName to the name of selectedPlaylist
    set pDuration to the duration of selectedPlaylist
    set pCount to count (tracks of selectedPlaylist)
    set output to output & "id: " & pId & "&nbsp;name: " & pName & "&nbsp;duration: " & pDuration & "&nbsp;count: " & pCount & "\n"
    end repeat`;
};

export const searchForTrack = (search: string) =>
  tellCustom(`set output to ""
  tell application "Music"
  set results to (every track whose name contains "${search}" or artist contains "${search}")
  repeat with selectedTrack in results
  set trackId to the id of selectedTrack
  set trackName to the name of selectedTrack
  set albumName to the album of selectedTrack
  set artistName to the artist of selectedTrack
  set trackDuration to the duration of selectedTrack
  set output to output & "id: " & trackId & "&nbsp;name: " & trackName & "&nbsp;artist: " & artistName & "&nbsp;album: " & albumName & "&nbsp;duration: " & trackDuration & "\n"
  end repeat
  end tell
  return output`);

export const playTrack = (track: string) => tell("Music", `play track "${track}" of playlist 1`);

export const searchForAlbum = (search: string) =>
  tellCustom(`set output to ""
  set albumList to {}
  tell application "Music"
    set results to (every track of playlist 1 whose album contains "${search}" or artist contains "${search}")
    repeat with aTrack in results
      set albumName to the album of aTrack
      set trackCount to count (every track of playlist 1 whose album contains albumName)
      tell album of aTrack to if albumList does not contain it then
        set end of albumList to it
        set trackId to the id of aTrack
        set artistName to the artist of aTrack
        set output to output & "id: " & trackId & "&nbsp;name: " & albumName & "&nbsp;artist: " & artistName & "&nbsp;count: " & trackCount & "\n"
      end if
    end repeat
  end tell
  return output`);

export const playAlbum = (album: string) =>
  tellCustom(`tell application "Music"
    if (exists playlist "Raycast DJ") then
        delete playlist "Raycast DJ"
    end if
    make new user playlist with properties {name:"Raycast DJ", shuffle:false, song repeat:one}
    duplicate (every track of playlist 1 whose album contains "${album}") to playlist "Raycast DJ"
    play playlist "Raycast DJ"
  end tell`);

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
