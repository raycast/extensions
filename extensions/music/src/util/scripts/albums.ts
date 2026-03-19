import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

import { parseQueryString, runScript } from "../apple-script";
import { Album } from "../models";

import { general } from ".";

/** Deduplicate tracks by album name, counting tracks per album */
function groupTracksByAlbum(raw: string): ReadonlyArray<Album> {
  const lines = raw.trim().split("\n").filter(Boolean);
  const albumMap = new Map<string, Album>();

  for (const line of lines) {
    const parts = parseQueryString<Record<string, string>>()(line);
    const albumName = parts.name ?? "";
    const existing = albumMap.get(albumName);

    if (existing) {
      existing.count = String(Number(existing.count ?? "0") + 1);
    } else {
      albumMap.set(albumName, {
        id: parts.id ?? "",
        name: albumName,
        artist: parts.artist ?? "",
        count: "1",
      });
    }
  }

  return Array.from(albumMap.values());
}

export const getAll: TE.TaskEither<Error, ReadonlyArray<Album>> = pipe(
  runScript(`
	set output to ""
	set seenAlbums to {}
	tell application "Music"
		set allAlbums to album of every track of (library playlist 1)
		set allIds to id of every track of (library playlist 1)
		set allArtists to artist of every track of (library playlist 1)
		set trackCount to count of allAlbums
		repeat with i from 1 to trackCount
			set aName to item i of allAlbums
			if seenAlbums does not contain aName then
				set end of seenAlbums to aName
				set output to output & "id=" & (item i of allIds) & "$BREAKname=" & aName & "$BREAKartist=" & (item i of allArtists) & "\n"
			end if
		end repeat
	end tell
	return output
  `),
  TE.map(groupTracksByAlbum),
);

export const search = (term: string): TE.TaskEither<Error, ReadonlyArray<Album>> =>
  pipe(
    runScript(`
	set output to ""
	tell application "Music"
		set results to (search (library playlist 1) for "${term}")
		repeat with aTrack in results
			set output to output & "id=" & (id of aTrack) & "$BREAKname=" & (album of aTrack) & "$BREAKartist=" & (artist of aTrack) & "\n"
		end repeat
	end tell
	return output
    `),
    TE.map(groupTracksByAlbum),
  );

export const play =
  (shuffle = false) =>
  (album: string) =>
    pipe(
      general.setShuffle(shuffle),
      TE.chain(() =>
        runScript(`
		tell application "Music"
			if (exists playlist "Raycast DJ") then
				delete playlist "Raycast DJ"
			end if
			make new user playlist with properties {name:"Raycast DJ", shuffle:false, song repeat:one}
			duplicate (every track of playlist 1 whose album contains "${album}") to playlist "Raycast DJ"
			play playlist "Raycast DJ"
		end tell
	`),
      ),
    );
