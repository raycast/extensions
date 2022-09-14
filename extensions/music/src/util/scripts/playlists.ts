import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import { runAppleScript } from "run-applescript";

import { tell, runScript, createQueryString } from "../apple-script";
import { parseImageStream } from "../artwork";
import { queryCache, setCache } from "../cache";
import { Track, Playlist, PlaylistKind } from "../models";
import { constructDate, getAttribute } from "../utils";
import { getTrackArtwork } from "./track";

import { general } from ".";

export const getPlaylists = async (useCache = true): Promise<Playlist[]> => {
  if (useCache) {
    const playlistCache = queryCache("playlists");
    if (playlistCache) {
      return playlistCache;
    }
  }

  const outputQuery = createQueryString({
    id: "id",
    name: "name",
    duration: "duration",
    time: "time",
    count: "count tracks",
    description: "description",
  });

  const response = await runAppleScript(`
      set output to ""
      tell application "Music"
        set allPlaylists to every playlist
        repeat with aPlaylist in allPlaylists
          tell aPlaylist to set output to output & ${outputQuery} 
          set output to output & "$breakkind=" & class of aPlaylist & "\n" 
        end repeat
      end tell
      return output
    `);

  let playlists: Playlist[] = response
    .split("\n")
    .slice(0, -1)
    .map((line: string) => ({
      id: getAttribute(line, "id"),
      name: getAttribute(line, "name"),
      duration: getAttribute(line, "duration"),
      count: getAttribute(line, "count"),
      time: getAttribute(line, "time"),
      description: getAttribute(line, "description"),
      kind: getAttribute(line, "kind") as PlaylistKind,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter((playlist) => playlist.name !== "Library" && playlist.name !== "Music");

  const promises = playlists.map(async (playlist: Playlist) => {
    const artwork = await getPlaylistArtwork(playlist.id, 300);
    return { ...playlist, artwork };
  });

  playlists = await Promise.all(promises);
  setCache("playlists", playlists);
  return playlists;
};

export const getPlaylistArtwork = async (id: string, size?: number): Promise<string> => {
  const data = await runAppleScript(`
    tell application "Music"
      set playlistArtwork to first artwork of first playlist of (every playlist whose id is ${id})
      set playlistImage to data of playlistArtwork
    end tell
    return playlistImage
  `);
  return await parseImageStream(data, size ? { width: size, height: size } : undefined);
};

export const getPlaylistTracks = async (id: string, useCache = true): Promise<Track[]> => {
  if (useCache) {
    const cachedTracks = queryCache(id);
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
    dateAdded: "date added",
    playedCount: "played count",
  });

  const response = await runAppleScript(`
		set output to ""
			tell application "Music"
				set allTracks to tracks of first playlist of (every playlist whose id is ${id})
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
      dateAdded: constructDate(getAttribute(line, "dateAdded")).getTime(),
      playedCount: parseInt(getAttribute(line, "playedCount")),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const promises = tracks.map(async (track: Track) => {
    const artwork = await getTrackArtwork(track);
    return { ...track, artwork };
  });

  tracks = await Promise.all(promises);
  setCache(id, tracks);
  return tracks;
};

export const play =
  (shuffle = false) =>
  (name: string): TE.TaskEither<Error, string> =>
    pipe(
      general.setShuffle(shuffle),
      TE.chain(() => tell("Music", `play playlist "${name.trim()}"`))
    );

export const playById =
  (shuffle = false) =>
  (id: string) =>
    pipe(
      general.setShuffle(shuffle),
      TE.chain(() => tell("Music", `play (every playlist whose id is "${id}")`))
    );

export const showPlaylist = (id: string) =>
  runScript(`tell application "Music" 
    reveal (every playlist whose id is "${id}")
    activate
  end tell`);
