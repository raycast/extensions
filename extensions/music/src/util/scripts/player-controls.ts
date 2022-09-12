import { runScript, tellMusic } from "../apple-script";
import { MusicState } from "../models";
import { getAttribute } from "../utils";
import { createQueryString } from "../apple-script";
import { runAppleScript } from "run-applescript";

export const activate = tellMusic("activate");
export const revealTrack = tellMusic("reveal current track");

export const pause = tellMusic("pause");
export const play = tellMusic("play");
export const stop = tellMusic("stop");
export const next = tellMusic("next track");
export const previous = tellMusic("previous track");
export const restart = tellMusic("back track");
export const togglePlay = tellMusic("playpause");
export const love = tellMusic("set loved of current track to true");
export const dislike = tellMusic("set disliked of current track to true");
export const toggleLove = tellMusic("set loved of current track to not loved of current track");
export const addToLibrary = tellMusic(`duplicate current track to source "Library"`);

export const setShuffle = (shuffle: boolean) => tellMusic(`set shuffle enabled to ${shuffle}`);
export const setRepeatMode = (mode: "one" | "all" | "off") => tellMusic(`set song repeat to ${mode}`);
export const setVolume = (volume: number) => tellMusic(`set sound volume to ${volume}`);
export const setRating = (rating: number) =>
  runScript(`
  tell application "Music" 
    set matchingTrack to first track of (tracks of playlist "Library" whose name is name of current track as string and album is album of current track as string and artist is artist of current track as string)
    set rating of matchingTrack to ${rating}
  end tell`);

export const isPlaying = async (): Promise<boolean> => {
  return (await runAppleScript(`tell application "Music" to get player state`)) === "playing";
};

export const getMusicState = async (): Promise<MusicState | undefined> => {
  const outputQuery = createQueryString({
    name: "name of current track",
    artist: "artist of current track",
    loved: "loved of current track",
    rating: "rating of current track",
    inLibrary: "inLibrary",
    playing: "player state",
    repeat: "song repeat",
    shuffle: "shuffle enabled",
  });
  try {
    const response = await runAppleScript(`
      tell application "Music" 
        set matchingTracks to (tracks of playlist "Library" whose name is name of current track as string and album is album of current track as string and artist is artist of current track as string)
        set inLibrary to (count of matchingTracks) > 0
        set output to ${outputQuery} & "\n"
      end tell
      return output
    `);
    return {
      title: `${getAttribute(response, "name")} - ${getAttribute(response, "artist")}`,
      playing: getAttribute(response, "playing") === "playing",
      repeat: getAttribute(response, "repeat"),
      shuffle: getAttribute(response, "shuffle") === "true",
      loved: getAttribute(response, "loved") === "true",
      added: getAttribute(response, "inLibrary") === "true",
      rating: parseInt(getAttribute(response, "rating")) / 20,
    };
  } catch {
    return undefined;
  }
};
