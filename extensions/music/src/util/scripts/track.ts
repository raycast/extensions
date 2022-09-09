import { createQueryString, runScript, tell } from "../apple-script";
import { runAppleScript } from "run-applescript";
import { getAttribute } from "../utils";
import { queryCache, setCache } from "../cache";
import { getTrackArtwork } from "../artwork";
import { Track } from "../models";

export const getAllTracks = async (useCache = true): Promise<Track[]> => {
  if (useCache) {
    const cachedTracks = queryCache("tracks");
    if (cachedTracks) {
      return cachedTracks;
    }
  }

  const outputQuery = createQueryString({
    id: "database ID",
    name: "name",
    artist: "artist",
    album: "album",
    albumArtist: "album artist",
    genre: "genre",
  });

  const response = await runAppleScript(`
    set output to ""
    tell application "Music"
      set allTracks to every track
      repeat with aTrack in allTracks
        tell aTrack to set output to output & ${outputQuery} & "\n"
      end repeat
    end tell
    return output
  `);

  let tracks: Track[] = response
    .split("\n")
    .slice(0, -1)
    .map((line: string) => ({
      id: getAttribute(line, "id"),
      name: getAttribute(line, "name"),
      artist: getAttribute(line, "artist"),
      album: getAttribute(line, "album"),
      albumArtist: getAttribute(line, "albumArtist"),
      genre: getAttribute(line, "genre"),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const promises = tracks.map(async (track: Track) => {
    const artwork = await getTrackArtwork(track);
    return { ...track, artwork };
  });

  tracks = await Promise.all(promises);
  setCache("tracks", tracks);
  return tracks;
};

export const play = (track: string) => tell("Music", `play track "${track}" of playlist 1`);
export const playById = (id: string) =>
  runScript(`tell application "Music" to play (every track whose database ID is "${id}")`);

export const revealTrack = (id: string) =>
  runScript(`tell application "Music" 
    reveal (every track whose database ID is "${id}")
    activate
  end tell`);

export const playOnRepeat = (id: string) =>
  runScript(`tell application "Music" 
    set song repeat to one
    reveal (every track whose database ID is "${id}")
    activate
    tell application "System Events" to key code 36
  end tell`);

export const getTrackDetails = async (track: Track): Promise<Track> => {
  const outputQuery = createQueryString({
    duration: "duration",
    time: "time",
    genre: "genre",
    playCount: "played count",
    loved: "loved",
    year: "year",
  });

  const response = await runAppleScript(`
    set output to ""
    tell application "Music"
      set myTrack to first track of (every track whose database ID is "${track.id}")
      tell myTrack to set output to output & ${outputQuery} & "\n"
    end tell
    return output
  `);

  return {
    ...track,
    duration: getAttribute(response, "duration"),
    genre: getAttribute(response, "genre"),
    time: getAttribute(response, "time"),
    playCount: parseInt(getAttribute(response, "playCount")),
    loved: getAttribute(response, "loved") === "true",
    year: getAttribute(response, "year"),
  };
};
