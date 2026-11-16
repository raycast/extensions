// Plays songs and playlists from Lantern's music results, as the app does (app/Sources/Lantern/MusicLibrary.swift
// MusicPlayer): Music by persistent ID, Spotify by spotify: URI. A closed app is started and the command waits until
// it answers; Music's first `play` after a cold start only loads the song, so play is repeated until it plays.
// macOS asks once whether Raycast may control Music or Spotify. Only validated IDs go into the scripts.
import { open } from "@raycast/api";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export interface MusicHit {
  id: string;
  kind: string; // song | playlist
  source: string; // apple | spotify
  title: string;
  artist: string | null;
  album: string | null;
  playlist_id: string | null;
  playlist_name: string | null;
  count: number;
}

function script(app: string, ready: string, body: string): string {
  return `tell application "${app}"
  if it is not running then launch
  repeat 40 times
    try
      ${ready}
      exit repeat
    end try
    delay 0.2
  end repeat
  ${body}
end tell`;
}

function untilPlaying(play: string): string {
  return `repeat 4 times
    ${play}
    repeat 12 times
      delay 0.25
      if player state is playing then return
    end repeat
    delay 1.5
  end repeat`;
}

function osascript(source: string): Promise<void> {
  return new Promise((resolve, reject) =>
    execFile("/usr/bin/osascript", ["-e", source], { timeout: 30000 }, (err) => (err ? reject(err) : resolve())),
  );
}

const APPLE_ID = /^[0-9A-F]{16}$/;
const SPOTIFY_ID = /^sp-[A-Za-z0-9]{1,40}$/;

/**
 * Liked Songs have no playlist URI: Spotify plays them as spotify:user:<id>:collection (spotify:collection:tracks only
 * shows them). The id comes from the Spotify app's own local prefs, read only; nothing is sent anywhere.
 */
function likedCollection(): string | null {
  try {
    const prefs = readFileSync(path.join(os.homedir(), "Library", "Application Support", "Spotify", "prefs"), "utf8");
    const user = prefs.match(/^autologin\.canonical_username="?([A-Za-z0-9._-]{1,64})"?$/m)?.[1];
    return user ? `spotify:user:${user}:collection` : null;
  } catch {
    return null;
  }
}

export async function play(m: MusicHit): Promise<void> {
  if (m.source === "spotify") {
    if (!SPOTIFY_ID.test(m.id) || (m.playlist_id && !SPOTIFY_ID.test(m.playlist_id))) return;
    const list = m.kind === "playlist" ? m.id : m.playlist_id;
    const listUri = list === "sp-liked" ? likedCollection() : list ? `spotify:playlist:${list.slice(3)}` : null;
    if (m.kind === "playlist" && !listUri) {
      await open("spotify:collection:tracks"); // Liked Songs without a known account: show them
      return;
    }
    const body =
      m.kind === "playlist"
        ? listUri
          ? `play track "${listUri}"`
          : ""
        : `play track "spotify:track:${m.id.slice(3)}"${listUri ? ` in context "${listUri}"` : ""}`;
    if (body) await osascript(script("Spotify", "get player state", body));
    return;
  }
  if (!APPLE_ID.test(m.id) || (m.playlist_id && !APPLE_ID.test(m.playlist_id))) return;
  let body: string;
  if (m.kind === "playlist") {
    body = `set p to first playlist whose persistent ID is "${m.id}"\n${untilPlaying("play p")}`;
  } else {
    // songs added from the catalogue to a playlist only are not in the library: then look in their playlist
    const fallback = m.playlist_id
      ? `on error
      set p to first playlist whose persistent ID is "${m.playlist_id}"
      set t to (first track of p whose persistent ID is "${m.id}")`
      : "";
    body = `try
      set t to (first track of library playlist 1 whose persistent ID is "${m.id}")
    ${fallback}
    end try
    ${untilPlaying("play t")}`;
  }
  await osascript(script("Music", "get name of library playlist 1", body));
}

/** Shows the song or playlist in its app without playing. */
export async function show(m: MusicHit): Promise<void> {
  if (m.source === "spotify") {
    if (!SPOTIFY_ID.test(m.id)) return;
    const view =
      m.id === "sp-liked"
        ? "spotify:collection:tracks"
        : m.kind === "playlist"
          ? `spotify:playlist:${m.id.slice(3)}`
          : `spotify:track:${m.id.slice(3)}`;
    await open(view);
    return;
  }
  if (!APPLE_ID.test(m.id) || (m.playlist_id && !APPLE_ID.test(m.playlist_id))) return;
  let find: string;
  if (m.kind === "playlist") {
    find = `set t to first playlist whose persistent ID is "${m.id}"`;
  } else {
    const fallback = m.playlist_id
      ? `on error
      set p to first playlist whose persistent ID is "${m.playlist_id}"
      set t to (first track of p whose persistent ID is "${m.id}")`
      : "";
    find = `try
      set t to (first track of library playlist 1 whose persistent ID is "${m.id}")
    ${fallback}
    end try`;
  }
  await osascript(script("Music", "get name of library playlist 1", `${find}\nreveal t\nactivate`));
}
