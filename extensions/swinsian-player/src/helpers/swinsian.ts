import { showHUD, Cache, Clipboard, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import fs from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { readFileMetadataReport } from "../fileMetadata";
import {
  queryArtistAlbums,
  queryArtistAlbumTracks,
  queryLibraryFacets,
  queryLibraryTracksByFacet,
  type ArtistAlbumRow,
  type LibraryBrowseMode,
  type LibraryFacetRow,
} from "../libraryDatabase";

const execFileAsync = promisify(execFile);
const libraryCache = new Cache({ namespace: "library-browser" });

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type PlayerState = "playing" | "paused" | "stopped";
export type ShuffleType = "none" | "track shuffle" | "album shuffle";

export interface Track {
  name: string;
  artist: string;
  album: string;
  albumArtist: string;
  genre: string;
  year: number;
  duration: number;
  time: string;
  rating: number;
  playCount: number;
  bitRate: number;
  kind: string;
  path: string;
  id: string;
}

export interface PlayerStatus {
  state: PlayerState;
  track: Track | null;
  position: number;
  volume: number;
  shuffle: ShuffleType;
  repeatQueue: boolean;
  repeatSingle: boolean;
  stopAfterTrack: boolean;
}

export interface Playlist {
  name: string;
  id: string;
  smart: boolean;
  trackCount: number;
}

export interface SearchTrack {
  name: string;
  artist: string;
  album: string;
  duration: number;
  time: string;
  rating: number;
  id: string;
  path: string;
}

export interface AudioOutputDevice {
  name: string;
  id: string;
  active: boolean;
}

export type { LibraryBrowseMode };

export type LibraryFacet = LibraryFacetRow;
export type LibraryAlbum = ArtistAlbumRow;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Returns true if Swinsian is currently running */
export async function isSwinsianRunning(): Promise<boolean> {
  try {
    const result = await runAppleScript(`
      tell application "System Events"
        return (name of every process) contains "Swinsian"
      end tell
    `);
    return result.trim() === "true";
  } catch {
    return false;
  }
}

/** Fetch the full player status including current track details */
export async function getPlayerStatus(): Promise<PlayerStatus> {
  const running = await isSwinsianRunning();
  if (!running) {
    return {
      state: "stopped",
      track: null,
      position: 0,
      volume: 50,
      shuffle: "none",
      repeatQueue: false,
      repeatSingle: false,
      stopAfterTrack: false,
    };
  }

  try {
    const raw = await runAppleScript(`
      tell application "Swinsian"
        set ps to player state
        set vol to sound volume
        
        -- Explicitly get properties to avoid keyword issues
        set sh to (get shuffle)
        set rq to (get repeat queue)
        set rs to (get repeat single)
        set sat to (get stop after track)
        set pos to player position
        
        -- Convert enums to strings manually for safety
        set shStr to "none"
        if sh is track shuffle then set shStr to "track shuffle"
        if sh is album shuffle then set shStr to "album shuffle"
        
        set stateStr to "stopped"
        if ps is playing then set stateStr to "playing"
        if ps is paused then set stateStr to "paused"
        
        set sep to "===SEP==="
        set statusStr to stateStr & sep & vol & sep & shStr & sep & rq & sep & rs & sep & pos & sep & sat
        
        if ps is not stopped then
          try
            set t to current track
            set tName to name of t
            set tArtist to artist of t
            set tAlbum to album of t
            set tAA to album artist of t
            set tGenre to genre of t
            set tYear to year of t
            set tDuration to duration of t
            set tTime to time of t
            set tRating to rating of t
            set tPC to play count of t
            set tBR to bit rate of t
            set tKind to kind of t
            set tPath to path of t
            set tId to id of t
            set statusStr to statusStr & sep & "TRACK" & sep & tName & sep & tArtist & sep & tAlbum & sep & tAA & sep & tGenre & sep & tYear & sep & tDuration & sep & tTime & sep & tRating & sep & tPC & sep & tBR & sep & tKind & sep & tPath & sep & tId
          on error
          end try
        end if
        
        return statusStr
      end tell
    `);

    return parsePlayerStatus(raw.trim());
  } catch (e) {
    console.error("Error fetching Swinsian status:", e);
    return {
      state: "stopped",
      track: null,
      position: 0,
      volume: 50,
      shuffle: "none",
      repeatQueue: false,
      repeatSingle: false,
      stopAfterTrack: false,
    };
  }
}

function parsePlayerStatus(raw: string): PlayerStatus {
  const sep = "===SEP===";
  const parts = raw.split(sep);
  const state = parts[0] as PlayerState;
  const volume = parseFloat(parts[1]) || 50;
  const shuffle = parts[2] as ShuffleType;
  const repeatQueue = parts[3] === "true";
  const repeatSingle = parts[4] === "true";
  const position = parseFloat(parts[5]) || 0;
  const stopAfterTrack = parts[6] === "true";

  let track: Track | null = null;
  const trackIdx = parts.indexOf("TRACK");
  if (trackIdx !== -1 && parts.length > trackIdx + 14) {
    track = {
      name: parts[trackIdx + 1] || "",
      artist: parts[trackIdx + 2] || "",
      album: parts[trackIdx + 3] || "",
      albumArtist: parts[trackIdx + 4] || "",
      genre: parts[trackIdx + 5] || "",
      year: parseInt(parts[trackIdx + 6]) || 0,
      duration: parseFloat(parts[trackIdx + 7]) || 0,
      time: parts[trackIdx + 8] || "",
      rating: parseFloat(parts[trackIdx + 9]) || 0,
      playCount: parseInt(parts[trackIdx + 10]) || 0,
      bitRate: parseInt(parts[trackIdx + 11]) || 0,
      kind: parts[trackIdx + 12] || "",
      path: parts[trackIdx + 13] || "",
      id: parts[trackIdx + 14] || "",
    };
  }

  return { state, track, position, volume, shuffle, repeatQueue, repeatSingle, stopAfterTrack };
}

// ─────────────────────────────────────────────
// Playback Controls
// ─────────────────────────────────────────────

export async function playpause(): Promise<void> {
  await runAppleScript(`tell application "Swinsian" to playpause`);
}

export async function nextTrack(): Promise<void> {
  await runAppleScript(`tell application "Swinsian" to next track`);
}

export async function previousTrack(): Promise<void> {
  await runAppleScript(`tell application "Swinsian" to previous track`);
}

export async function stop(): Promise<void> {
  await runAppleScript(`tell application "Swinsian" to stop`);
}

export async function setRepeatQueue(enabled: boolean): Promise<void> {
  await runAppleScript(`tell application "Swinsian" to set repeat queue to ${enabled}`);
}

export async function setRepeatSingle(enabled: boolean): Promise<void> {
  await runAppleScript(`tell application "Swinsian" to set repeat single to ${enabled}`);
}

export async function cycleRepeat(): Promise<string> {
  const raw = await runAppleScript(`
    tell application "Swinsian"
      set rq to repeat queue
      set rs to repeat single
      if rq is false and rs is false then
        set repeat queue to true
        set repeat single to false
        return "queue"
      else if rq is true and rs is false then
        set repeat queue to false
        set repeat single to true
        return "single"
      else
        set repeat queue to false
        set repeat single to false
        return "off"
      end if
    end tell
  `);
  return raw.trim();
}

export async function setShuffle(type: ShuffleType): Promise<void> {
  await runAppleScript(`tell application "Swinsian" to set shuffle to ${type}`);
}

export async function cycleShuffle(): Promise<ShuffleType> {
  const raw = await runAppleScript(`
    tell application "Swinsian"
      set sh to shuffle
      if sh is none then
        set shuffle to track shuffle
        return "track shuffle"
      else if sh is track shuffle then
        set shuffle to album shuffle
        return "album shuffle"
      else
        set shuffle to none
        return "none"
      end if
    end tell
  `);
  return raw.trim() as ShuffleType;
}

export async function setVolume(volume: number): Promise<void> {
  const v = Math.max(0, Math.min(100, volume));
  await runAppleScript(`tell application "Swinsian" to set sound volume to ${v}`);
}

export async function adjustVolume(delta: number): Promise<void> {
  const raw = await runAppleScript(`tell application "Swinsian" to return sound volume`);
  const current = parseFloat(raw.trim()) || 50;
  await setVolume(current + delta);
}

export async function seek(delta: number): Promise<void> {
  await runAppleScript(`
    tell application "Swinsian"
      set pos to player position
      set newPos to pos + ${delta}
      if newPos < 0 then set newPos to 0
      set player position to newPos
    end tell
  `);
}

export async function toggleStopAfterTrack(): Promise<boolean> {
  const raw = await runAppleScript(`
    tell application "Swinsian"
      set sat to stop after track
      set stop after track to (not sat)
      return (not sat)
    end tell
  `);
  return raw.trim() === "true";
}

export async function copyLyrics(): Promise<string> {
  const script = `
    tell application "Swinsian"
      set sel to selection of window 1
      if sel is {} then
        -- Use current track if nothing selected
        if not (exists current track) then return "No track playing"
        set sel to {current track}
      end if
      
      set lyricsList to {}
      repeat with tr in sel
        set lyr to lyrics of tr
        if lyr is not "" then
          set end of lyricsList to ("--- " & name of tr & " by " & artist of tr & " ---" & return & lyr)
        end if
      end repeat
    end tell

    if (count of lyricsList) is 0 then
      return "No lyrics found"
    end if

    set AppleScript's text item delimiters to return & return
    set clipboardText to lyricsList as text
    set AppleScript's text item delimiters to ""
    set the clipboard to clipboardText

    return ((count of lyricsList) as text) & " track lyric(s) copied"
  `;
  return await runAppleScript(script);
}

export async function reshuffle(): Promise<void> {
  await runAppleScript(`tell application "Swinsian" to reshuffle`);
}

// ─────────────────────────────────────────────
// Rating & Tags
// ─────────────────────────────────────────────

export async function setRating(stars: number): Promise<void> {
  const clamped = Math.max(0, Math.min(5, Math.round(stars)));
  await runAppleScript(`
    tell application "Swinsian"
      set rating of current track to ${clamped}
    end tell
  `);
}

export async function rescanTags(): Promise<void> {
  await runAppleScript(`
    tell application "System Events"
      if not (exists process "Swinsian") then return
    end tell

    tell application "Swinsian"
      set targetTracks to {}
      try
        set targetTracks to selection of front window
      end try
      if targetTracks is {} then
        if player state is stopped then return
        set targetTracks to {current track}
      end if
      rescan tags targetTracks
    end tell
  `);
}

async function clickSwinsianMenuItem(menuName: string, itemNames: string[]): Promise<boolean> {
  const result = await runAppleScript(
    `
      on run argv
        set menuName to item 1 of argv
        set itemNamesText to item 2 of argv
        set AppleScript's text item delimiters to linefeed
        set itemNames to text items of itemNamesText
        set AppleScript's text item delimiters to ""

        tell application "Swinsian" to activate
        delay 0.25

        tell application "System Events"
          tell process "Swinsian"
            repeat with i from 1 to 20
              if exists menu bar 1 then exit repeat
              delay 0.05
            end repeat

            try
              set targetMenu to menu menuName of menu bar 1
            on error
              return "MISSING_MENU"
            end try

            repeat with requestedName in itemNames
              try
                click menu item (requestedName as text) of targetMenu
                return "OK"
              end try
            end repeat

            repeat with menuItemRef in menu items of targetMenu
              set actualName to name of menuItemRef
              repeat with requestedName in itemNames
                if actualName contains (requestedName as text) then
                  click menuItemRef
                  return "OK"
                end if
              end repeat
            end repeat
          end tell
        end tell

        return "MISSING_ITEM"
      end run
    `,
    [menuName, itemNames.join("\n")],
    { timeout: 15000 },
  );

  return result.trim() === "OK";
}

export async function completeTags(): Promise<void> {
  await clickSwinsianMenuItem("Library", ["Complete Tags...", "Complete Tags…", "Complete Tags"]);
}

export async function fetchAlbumArt(): Promise<void> {
  await clickSwinsianMenuItem("Library", ["Fetch Album Art", "Fetch Album Artwork"]);
}

export async function addAlbumArt(): Promise<void> {
  await clickSwinsianMenuItem("Library", [
    "Add Album Art...",
    "Add Album Art…",
    "Add Album Artwork...",
    "Add Album Artwork…",
  ]);
}

export async function clearAlbumArt(): Promise<void> {
  await clickSwinsianMenuItem("Library", [
    "Clear Album Art...",
    "Clear Album Art…",
    "Clear Album Artwork...",
    "Clear Album Artwork…",
  ]);
}

export async function findAndReplace(): Promise<void> {
  await clickSwinsianMenuItem("Library", [
    "Find and Replace...",
    "Find and Replace…",
    "Find & Replace...",
    "Find & Replace…",
  ]);
}

export async function findDuplicates(): Promise<void> {
  await clickSwinsianMenuItem("Library", ["Find Duplicates...", "Find Duplicates…", "Show Duplicates", "Duplicates"]);
}

export async function resetPlayCount(): Promise<void> {
  await runAppleScript(`
    tell application "Swinsian"
      set play count of current track to 0
    end tell
  `);
}

// ─────────────────────────────────────────────
// Last.fm & UI
// ─────────────────────────────────────────────

export async function activateApp(): Promise<void> {
  await runAppleScript(`tell application "Swinsian" to activate`);
}

export async function loveOnLastFM(): Promise<void> {
  await runAppleScript(`
    if application "Swinsian" is not running then error "Swinsian is not running"
    tell application "Swinsian" to activate
    delay 0.2
    tell application "System Events"
      tell process "Swinsian"
        try
          keystroke "l" using {control down, shift down}
        on error
          click menu item "Love on Last.fm" of menu 1 of menu bar item "Player" of menu bar 1
        end try
      end tell
    end tell
  `);
}

export async function banOnLastFM(): Promise<void> {
  await runAppleScript(`
    if application "Swinsian" is not running then error "Swinsian is not running"
    tell application "Swinsian" to activate
    delay 0.2
    tell application "System Events"
      tell process "Swinsian"
        click menu item "Ban on Last.fm" of menu 1 of menu bar item "Player" of menu bar 1
      end tell
    end tell
  `);
}

export async function showMainWindow(): Promise<void> {
  await runAppleScript(`
    tell application "Swinsian" to activate
    delay 0.15
    tell application "System Events" to key code 18 using command down
  `);
}

export async function showMiniWindow(): Promise<void> {
  await runAppleScript(`
    tell application "Swinsian" to activate
    delay 0.15
    tell application "System Events" to key code 19 using command down
  `);
}

export async function showLibraryStatistics(): Promise<void> {
  const didClick = await clickSwinsianMenuItem("Window", [
    "Statistics",
    "Library Statistics",
    "Show Library Statistics",
  ]);
  if (!didClick) await showHUD("Library Statistics is not available in Swinsian's Window menu");
}

export async function showDeviceInspector(): Promise<void> {
  const didClick = await clickSwinsianMenuItem("Window", ["Device Inspector", "Show Device Inspector"]);
  if (!didClick) await showHUD("Device Inspector is not available in Swinsian's Window menu");
}

export async function showEqualizer(): Promise<void> {
  const didClick = await clickSwinsianMenuItem("Window", ["Show Equalizer Window", "Show Equalizer", "Equalizer"]);
  if (!didClick) await showHUD("Equalizer is not available in Swinsian's Window menu");
}

// ─────────────────────────────────────────────
// Audio Devices
// ─────────────────────────────────────────────

export async function getAudioOutputDevices(): Promise<AudioOutputDevice[]> {
  const raw = await runAppleScript(`
    tell application "Swinsian"
      set currentDeviceId to id of output device
      set outputList to {}
      repeat with d in audio devices
        set dName to name of d
        set dId to id of d
        set isActive to (dId is currentDeviceId)
        set end of outputList to (dName & "|||" & dId & "|||" & isActive)
      end repeat
      set AppleScript's text item delimiters to "???"
      return outputList as text
    end tell
  `);
  if (!raw || raw.trim() === "") return [];
  return raw.split("???").map((line) => {
    const [name, id, active] = line.split("|||");
    return { name: name || "Unknown Device", id: id || "", active: active === "true" };
  });
}

export async function setAudioOutputDevice(deviceId: string): Promise<void> {
  await runAppleScript(`
    tell application "Swinsian"
      set output device to (first audio device whose id is "${deviceId}")
    end tell
  `);
}

// ─────────────────────────────────────────────
// Artwork
// ─────────────────────────────────────────────

export async function getTrackArtwork(trackId: string): Promise<string | undefined> {
  const cacheDir = path.join(os.tmpdir(), "raycast-swinsian-art");
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  const artPath = path.join(cacheDir, `${trackId}.jpg`);
  if (fs.existsSync(artPath)) return artPath;

  try {
    const script = `
      set artPath to "${artPath}"
      tell application "Swinsian"
        try
          set t to first track whose id is "${trackId}"
          set theArt to album art of t
          if theArt is missing value then return "NONE"
          set targetFile to open for access (POSIX file artPath) with write permission
          set eof targetFile to 0
          write theArt to targetFile
          close access targetFile
          return "OK"
        on error
          try
            close access targetFile
          end try
          return "ERROR"
        end try
      end tell
    `;
    const res = await runAppleScript(script);
    if (res.trim() === "OK" && fs.existsSync(artPath) && fs.statSync(artPath).size > 0) {
      return artPath;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

// ─────────────────────────────────────────────
// Search & Playlists
// ─────────────────────────────────────────────

export async function getPlaylists(): Promise<Playlist[]> {
  try {
    const raw = await runAppleScript(`
      tell application "Swinsian"
        set output to ""
        repeat with pl in every playlist
          set plName to name of pl
          set plId to id of pl
          set plSmart to smart of pl
          set plCount to count of tracks of pl
          set output to output & plName & "|||" & plId & "|||" & plSmart & "|||" & plCount & "\n"
        end repeat
        return output
      end tell
    `);

    return raw
      .trim()
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const [name, id, smart, trackCount] = line.split("|||");
        return {
          name: name || "",
          id: id || "",
          smart: smart === "true",
          trackCount: parseInt(trackCount) || 0,
        };
      });
  } catch {
    return [];
  }
}

export async function playPlaylist(playlistId: string): Promise<void> {
  const result = await runAppleScript(
    `
      on run argv
        set playlistId to item 1 of argv

        tell application "System Events"
          if not (exists process "Swinsian") then error "Swinsian is not running"
        end tell

        tell application "Swinsian"
          set targetPlaylist to first playlist whose id is playlistId
          set targetTracks to every track of targetPlaylist
          set targetCount to count targetTracks
          if targetCount is 0 then error "The selected playlist is empty"
          set insertedCount to 0

          try
            repeat with i from targetCount to 1 by -1
              duplicate item i of targetTracks to beginning of playback queue
              set insertedCount to insertedCount + 1
            end repeat

            stop
            play
            delay 0.1

            if id of current track is not id of item 1 of targetTracks then
              error "Swinsian did not start the selected playlist"
            end if
            return "OK"
          on error errorMessage number errorNumber
            repeat insertedCount times
              try
                delete first track of playback queue
              end try
            end repeat
            error errorMessage number errorNumber
          end try
        end tell
      end run
    `,
    [playlistId],
    { timeout: 15000 },
  );

  if (result.trim() !== "OK") throw new Error("Swinsian did not confirm playlist playback");
}

export async function createPlaylist(name: string): Promise<void> {
  await runAppleScript(
    `
      on run argv
        tell application "Swinsian"
          make new playlist with properties {name:item 1 of argv}
        end tell
      end run
    `,
    [name],
  );
}

export async function addTrackToPlaylist(playlistId: string, trackId?: string): Promise<void> {
  await runAppleScript(
    `
      on run argv
        set playlistId to item 1 of argv
        set trackId to item 2 of argv

        tell application "System Events"
          if not (exists process "Swinsian") then error "Swinsian is not running"
        end tell

        tell application "Swinsian"
          set targetPlaylist to first normal playlist whose id is playlistId

          if trackId is "" then
            if player state is stopped then error "No current track"
            set targetTracks to {current track}
          else
            set targetTracks to {first track whose id is trackId}
          end if

          add tracks targetTracks to targetPlaylist
        end tell
      end run
    `,
    [playlistId, trackId || ""],
    { timeout: 4000 },
  );
}

/**
 * Exports the current playlist to an M3U file using a native save dialog.
 */
export async function exportCurrentPlaylistToM3U() {
  const script = `
    tell application "Swinsian"
      set pl to current playlist
      if pl is missing value then
        error "No playlist selected"
      end if
      set plName to name of pl
      set plTracks to tracks of pl
    end tell

    set outFile to choose file name with prompt "Save M3U playlist as:" default name (plName & ".m3u") default location (path to desktop folder)
    if outFile is false then return

    set m3uContent to "#EXTM3U" & return
    tell application "Swinsian"
      repeat with tr in plTracks
        set p to path of tr
        if p is not "" then
          set d to (duration of tr as integer)
          set a to artist of tr
          set n to name of tr
          set m3uContent to m3uContent & "#EXTINF:" & d & "," & a & " - " & n & return & p & return
        end if
      end repeat
    end tell

    set fRef to open for access outFile with write permission
    set eof fRef to 0
    write m3uContent to fRef as «class utf8»
    close access fRef
    
    return "Exported " & (count of plTracks) & " tracks to M3U"
  `;
  return await runAppleScript(script);
}

export async function getLibraryRoot(): Promise<string | null> {
  try {
    const configuredRoot = getPreferenceValues<{ libraryRoot?: string }>().libraryRoot?.trim();
    if (configuredRoot && fs.existsSync(configuredRoot)) return configuredRoot;

    const trackPath = await runAppleScript(`tell application "Swinsian" to get path of current track`);
    if (trackPath && trackPath !== "missing value") {
      if (trackPath.startsWith("/Volumes/")) {
        const parts = trackPath.split("/");
        return parts.slice(0, 5).join("/");
      }
      return path.dirname(path.dirname(path.dirname(trackPath)));
    }
    return null;
  } catch {
    return null;
  }
}

export async function searchLibrary(query: string, limit = 50): Promise<SearchTrack[]> {
  try {
    const script = `
      on run argv
      set queryText to item 1 of argv
      set resultLimit to (item 2 of argv) as integer
      set fieldSep to ASCII character 31
      set rowSep to ASCII character 30

      tell application "System Events"
        if not (exists process "Swinsian") then return ""
      end tell

      tell application "Swinsian"
        try
          try
            set librarySource to first playlist whose name is "Library"
            set foundTracks to search librarySource for queryText
          on error
            try
              set foundTracks to search music library for queryText
            on error
              set foundTracks to every track whose name contains queryText or artist contains queryText or album contains queryText
            end try
          end try

          set results to {}
          repeat with i from 1 to count foundTracks
            if i > resultLimit then exit repeat
            set t to item i of foundTracks
            set end of results to (name of t) & fieldSep & (artist of t) & fieldSep & (album of t) & fieldSep & (duration of t) & fieldSep & (time of t) & fieldSep & (rating of t) & fieldSep & (id of t) & fieldSep & (path of t)
          end repeat
          set AppleScript's text item delimiters to rowSep
          return results as string
        on error
          return ""
        end try
      end tell
      end run
    `;
    const raw = await runAppleScript(script, [query, String(limit)], { timeout: 5000 });

    let tracks: SearchTrack[] = [];
    if (raw.trim()) {
      tracks = raw
        .trim()
        .split("\u001e")
        .map((line) => {
          const [name, artist, album, duration, time, rating, id, path] = line.split("\u001f");
          return {
            name: name || "",
            artist: artist || "",
            album: album || "",
            duration: parseFloat(duration) || 0,
            time: time || "",
            rating: parseFloat(rating) || 0,
            id: id || "",
            path: path || "",
          };
        });
    }

    return tracks;
  } catch {
    return [];
  }
}

function getLibraryDatabasePath(): string {
  const { libraryDatabasePath } = getPreferenceValues<{ libraryDatabasePath?: string }>();
  const databasePath =
    libraryDatabasePath?.trim() ||
    path.join(os.homedir(), "Library", "Application Support", "Swinsian", "Library.sqlite");
  if (!fs.existsSync(databasePath)) {
    throw new Error(`Swinsian library database was not found at ${databasePath}`);
  }
  return databasePath;
}

export async function getLibraryFacets(mode: LibraryBrowseMode, query = "", limit = 5000): Promise<LibraryFacet[]> {
  const databasePath = getLibraryDatabasePath();
  const cacheKey = `facets:v3:${databasePath}:${fs.statSync(databasePath).mtimeMs}:${mode}:${limit}`;
  const cached = libraryCache.get(cacheKey);
  if (!query.trim() && cached) {
    try {
      return JSON.parse(cached) as LibraryFacet[];
    } catch {
      libraryCache.remove(cacheKey);
    }
  }

  const facets = await queryLibraryFacets(databasePath, mode, query, limit);
  if (!query.trim()) libraryCache.set(cacheKey, JSON.stringify(facets));
  return facets;
}

export async function getLibraryTracksByFacet(
  mode: LibraryBrowseMode,
  value: string,
  query = "",
  limit = 100,
  artist?: string,
): Promise<SearchTrack[]> {
  return queryLibraryTracksByFacet(getLibraryDatabasePath(), mode, value, query, limit, artist);
}

export async function getArtistAlbums(
  mode: "artist" | "albumArtist",
  artist: string,
  query = "",
  limit = 1000,
): Promise<LibraryAlbum[]> {
  return queryArtistAlbums(getLibraryDatabasePath(), mode, artist, query, limit);
}

export async function getArtistAlbumTracks(
  mode: "artist" | "albumArtist",
  artist: string,
  album: string,
  query = "",
  limit = 500,
): Promise<SearchTrack[]> {
  return queryArtistAlbumTracks(getLibraryDatabasePath(), mode, artist, album, query, limit);
}

export function clearLibraryBrowserCache(): void {
  libraryCache.clear();
}

export async function playTrackByPath(filePath: string, trackId?: string): Promise<void> {
  const result = await runAppleScript(
    `
      on run argv
        set trackId to item 1 of argv
        set trackPath to item 2 of argv

        tell application "Swinsian"
          set matches to {}
          if trackId is not "" then set matches to every track whose id is trackId
          if matches is {} and trackPath is not "" then set matches to find track trackPath
          if matches is {} then error "Track was not found in the Swinsian library"
          set targetTrack to item 1 of matches
          duplicate targetTrack to beginning of playback queue
          stop
          play
          delay 0.1
          if id of current track is not id of targetTrack then error "Swinsian did not start the selected track"
          return "OK"
        end tell
      end run
    `,
    [trackId ?? "", filePath],
    { timeout: 5000 },
  );

  if (result.trim() !== "OK") throw new Error("Swinsian did not confirm playback");
}

export async function addTrackToQueue(filePath: string, trackId?: string): Promise<void> {
  const result = await runAppleScript(
    `
      on run argv
        set trackId to item 1 of argv
        set trackPath to item 2 of argv

        tell application "Swinsian"
          set matches to {}
          if trackId is not "" then set matches to every track whose id is trackId
          if matches is {} and trackPath is not "" then set matches to find track trackPath
          if matches is {} then error "Track was not found in the Swinsian library"

          set targetTrack to item 1 of matches
          set queueLength to count of tracks of playback queue
          duplicate targetTrack to end of playback queue
          if (count of tracks of playback queue) is not queueLength + 1 then error "Swinsian did not add the track to the queue"
          return "OK"
        end tell
      end run
    `,
    [trackId ?? "", filePath],
    { timeout: 5000 },
  );

  if (result.trim() !== "OK") throw new Error("Swinsian did not confirm the queue addition");
}

export async function addAlbumToQueue(mode: "artist" | "albumArtist", artist: string, album: string): Promise<number> {
  const result = await runAppleScript(
    `
      on run argv
        set artistMode to item 1 of argv
        set artistName to item 2 of argv
        set albumName to item 3 of argv

        tell application "Swinsian"
          if artistMode is "albumArtist" then
            set matches to every track whose album is albumName and ((album artist is artistName) or ((album artist is "") and (artist is artistName)))
          else
            set matches to every track whose album is albumName and artist is artistName
          end if
          if matches is {} then error "No tracks were found for the selected album"

          set queueLength to count of tracks of playback queue
          repeat with targetTrack in matches
            duplicate targetTrack to end of playback queue
          end repeat

          set addedCount to (count of tracks of playback queue) - queueLength
          if addedCount is not count of matches then error "Swinsian did not add the complete album to the queue"
          return addedCount as text
        end tell
      end run
    `,
    [mode, artist, album],
    { timeout: 15000 },
  );

  const addedCount = Number(result.trim());
  if (!Number.isInteger(addedCount) || addedCount < 1) {
    throw new Error("Swinsian did not confirm the album queue addition");
  }
  return addedCount;
}

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────

async function getSelectedOrCurrentTrackPath(): Promise<string> {
  const trackPath = await runAppleScript(`
    tell application "Swinsian"
      if not running then error "Swinsian is not running"

      try
        set selectedTracks to selection of front window
        if selectedTracks is not {} then return path of item 1 of selectedTracks as text
      end try

      if player state is stopped then error "Select or play a track in Swinsian first"
      return path of current track as text
    end tell
  `);

  if (!trackPath || !fs.existsSync(trackPath)) {
    throw new Error("The selected or playing track could not be resolved");
  }
  return trackPath;
}

export interface ExternalReport {
  title: string;
  body: string;
}

/** Reads file metadata for the selected or playing track with the bundled parser. */
export async function getFileMetadataReport(): Promise<ExternalReport> {
  return readFileMetadataReport(await getSelectedOrCurrentTrackPath());
}

/** Saves a generated read-only report after the user selects its destination. */
export async function saveExternalReport(report: ExternalReport): Promise<string | null> {
  const safeTitle = report.title.replace(/[\\/:*?"<>|]/g, "-").trim() || "Swinsian Report";
  const chosenPath = (
    await runAppleScript(
      `
        on run argv
          try
            set destination to choose file name with prompt "Save report" default name (item 1 of argv)
            return POSIX path of destination
          on error number -128
            return ""
          end try
        end run
      `,
      [`${safeTitle}.txt`],
    )
  ).trim();
  if (!chosenPath) return null;
  await fs.promises.writeFile(chosenPath, `${report.body}\n`, "utf8");
  return chosenPath;
}

// ─────────────────────────────────────────────
export async function revealInFinder(filePath: string): Promise<void> {
  if (!filePath) return;
  await execFileAsync("/usr/bin/open", ["-R", filePath]);
}

export async function revealArtistInFinder(filePath: string): Promise<void> {
  if (!filePath) return;
  const albumDir = path.dirname(filePath);
  const artistDir = path.dirname(albumDir);
  const targetDir = fs.existsSync(artistDir) ? artistDir : albumDir;
  await execFileAsync("/usr/bin/open", [targetDir]);
}

export async function copyAlbumPathToClipboard(filePath: string): Promise<void> {
  if (!filePath) return;
  const albumDir = path.dirname(filePath);
  await Clipboard.copy(albumDir);
  await showHUD("Copied album path to clipboard");
}

export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatRating(rating: number): string {
  const stars = Math.round(rating);
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}

/** Fetch all available metadata from Swinsian for the current track */
export async function getExtendedTrackMetadata(): Promise<TrackMetadata | null> {
  const script = `
    tell application "Swinsian"
      if not (exists current track) then return "error: no track"
      set tr to current track
      set {n, a, aa, al, c, g, gr, y, tn, tc, dn, dc, d, sr, br, bd, k, r, pc, lp, da, dc2, dm, l, p, cm, ds, bp, bc, pb, cd, cr, ct, en} to {name of tr, artist of tr, album artist of tr, album of tr, composer of tr, genre of tr, grouping of tr, year of tr, track number of tr, track count of tr, disc number of tr, disc count of tr, duration of tr, sample rate of tr, bit rate of tr, bit depth of tr, kind of tr, rating of tr, play count of tr, last played of tr, date added of tr, date created of tr, date modified of tr, lyrics of tr, path of tr, comment of tr, description of tr, bpm of tr, barcode of tr, publisher of tr, conductor of tr, copyright of tr, catalog number of tr, encoder of tr}
      
      -- Helper to handle missing values and dates
      set out to "{"
      set out to out & "\\"name\\": " & my jsonValue(n) & ", "
      set out to out & "\\"artist\\": " & my jsonValue(a) & ", "
      set out to out & "\\"album_artist\\": " & my jsonValue(aa) & ", "
      set out to out & "\\"album\\": " & my jsonValue(al) & ", "
      set out to out & "\\"composer\\": " & my jsonValue(c) & ", "
      set out to out & "\\"genre\\": " & my jsonValue(g) & ", "
      set out to out & "\\"grouping\\": " & my jsonValue(gr) & ", "
      set out to out & "\\"year\\": " & my jsonNumber(y) & ", "
      set out to out & "\\"track_number\\": " & my jsonNumber(tn) & ", "
      set out to out & "\\"track_count\\": " & my jsonNumber(tc) & ", "
      set out to out & "\\"disc_number\\": " & my jsonNumber(dn) & ", "
      set out to out & "\\"disc_count\\": " & my jsonNumber(dc) & ", "
      set out to out & "\\"duration\\": " & my jsonNumber(d) & ", "
      set out to out & "\\"sample_rate\\": " & my jsonNumber(sr) & ", "
      set out to out & "\\"bit_rate\\": " & my jsonNumber(br) & ", "
      set out to out & "\\"bit_depth\\": " & my jsonNumber(bd) & ", "
      set out to out & "\\"kind\\": " & my jsonValue(k) & ", "
      set out to out & "\\"rating\\": " & my jsonNumber(r) & ", "
      set out to out & "\\"play_count\\": " & my jsonNumber(pc) & ", "
      set out to out & "\\"last_played\\": " & my jsonDate(lp) & ", "
      set out to out & "\\"date_added\\": " & my jsonDate(da) & ", "
      set out to out & "\\"date_created\\": " & my jsonDate(dc2) & ", "
      set out to out & "\\"date_modified\\": " & my jsonDate(dm) & ", "
      set out to out & "\\"lyrics\\": " & my jsonValue(l) & ", "
      set out to out & "\\"path\\": " & my jsonValue(p) & ", "
      set out to out & "\\"comment\\": " & my jsonValue(cm) & ", "
      set out to out & "\\"description\\": " & my jsonValue(ds) & ", "
      set out to out & "\\"bpm\\": " & my jsonNumber(bp) & ", "
      set out to out & "\\"barcode\\": " & my jsonValue(bc) & ", "
      set out to out & "\\"publisher\\": " & my jsonValue(pb) & ", "
      set out to out & "\\"conductor\\": " & my jsonValue(cd) & ", "
      set out to out & "\\"copyright\\": " & my jsonValue(cr) & ", "
      set out to out & "\\"catalog_number\\": " & my jsonValue(ct) & ", "
      set out to out & "\\"encoder\\": " & my jsonValue(en)
      set out to out & "}"
      return out
    end tell

    on jsonValue(v)
      if v is missing value then return "null"
      return "\\"" & my escapeString(v as text) & "\\""
    end jsonValue

    on jsonNumber(v)
      if v is missing value then return "null"
      return v as text
    end jsonNumber

    on jsonDate(d)
      if d is missing value then return "null"
      return "\\"" & (d as text) & "\\""
    end jsonDate

    on escapeString(t)
      set AppleScript's text item delimiters to "\\\\"
      set parts to text items of t
      set AppleScript's text item delimiters to "\\\\\\\\"
      set t to parts as text
      set AppleScript's text item delimiters to "\\""
      set parts to text items of t
      set AppleScript's text item delimiters to "\\\\\\""
      set t to parts as text
      set AppleScript's text item delimiters to return
      set parts to text items of t
      set AppleScript's text item delimiters to "\\\\n"
      set t to parts as text
      set AppleScript's text item delimiters to ""
      return t
    end escapeString
  `;

  const result = await runAppleScript(script, [], { timeout: 15000 });
  if (result === "error: no track") return null;
  // AppleScript can return literal control characters from multiline metadata
  // such as lyrics and comments. JSON strings require those characters to be
  // escaped, so normalise every ASCII control character before parsing.
  const validJson = Array.from(result, (character) => {
    const codePoint = character.charCodeAt(0);
    return codePoint <= 31 ? `\\u${codePoint.toString(16).padStart(4, "0")}` : character;
  }).join("");
  return JSON.parse(validJson);
}

export type TrackMetadata = Record<string, string | number | null | undefined>;

/** Formats metadata as Markdown */
export function formatMetadataMarkdown(m: TrackMetadata): string {
  const stars = (r: number) => "★".repeat(Math.round(r)) + "☆".repeat(5 - Math.round(r));
  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  return `## ${m.name}

**Artist:** ${m.artist}
**Album:** ${m.album}
**Album Artist:** ${m.album_artist || "N/A"}
**Genre:** ${m.genre || "N/A"}
**Year:** ${m.year}
**Track:** ${m.track_number} / ${m.track_count}
**Disc:** ${m.disc_number} / ${m.disc_count}
**Duration:** ${formatTime(Number(m.duration ?? 0))}
**Rating:** ${stars(Number(m.rating ?? 0))}
**Plays:** ${m.play_count}

### Technical Info
**Format:** ${m.kind}
**Bitrate:** ${m.bit_rate} kbps
**Sample Rate:** ${m.sample_rate} Hz
**Bit Depth:** ${m.bit_depth} bits
**Encoder:** ${m.encoder || "N/A"}

### Metadata Details
**BPM:** ${m.bpm || "N/A"}
**Composer:** ${m.composer || "N/A"}
**Publisher:** ${m.publisher || "N/A"}
**Conductor:** ${m.conductor || "N/A"}
**Copyright:** ${m.copyright || "N/A"}
**Catalog #:** ${m.catalog_number || "N/A"}
**Barcode:** ${m.barcode || "N/A"}

**Date Added:** ${m.date_added}
**Path:** \`${m.path}\`

### Comment
${m.comment || "No comment."}`;
}

/** Triggers Swinsian GUI Search dialog via AppleScript */
export async function triggerSwinsianSearchAppleScript(): Promise<void> {
  try {
    const script = `
      set dialogResult to display dialog "𝘌𝘯𝘵𝘦𝘳 𝘺𝘰𝘶𝘳 𝘴𝘦𝘢𝘳𝘤𝘩 𝘲𝘶𝘦𝘳𝘺:" default answer "" buttons {"✗", "􀊫"} default button "􀊫" cancel button "✗" with title "𝗦𝗪𝗜𝗡𝗦𝗜𝗔𝗡"
      set searchText to text returned of dialogResult

      if searchText is "" then return

      try
        tell application id "com.swinsian.Swinsian" to activate
      on error
        tell application "Swinsian" to activate
      end try

      tell application "System Events"
        repeat until frontmost of process "Swinsian" is true
          delay 0.1
        end repeat
      end tell

      set oldClipboard to missing value
      try
        set oldClipboard to the clipboard
      end try

      set the clipboard to searchText
      delay 0.1

      tell application "System Events"
        tell process "Swinsian"
          try
            click text field 1 of group 1 of toolbar 1 of window 1
            delay 0.1
            keystroke "a" using command down
            delay 0.05
            keystroke "v" using command down
          on error
            keystroke "f" using command down
            delay 0.2
            keystroke "a" using command down
            delay 0.05
            keystroke "v" using command down
          end try
        end tell
      end tell

      delay 0.1
      try
        if oldClipboard is not missing value then set the clipboard to oldClipboard
      end try
    `;
    await runAppleScript(script);
  } catch {
    // User canceled search dialog with ESC or Cancel button
  }
}

/** Locates the cover art file in the track's directory and copies it to the clipboard */
export async function copyCoverArtFile(): Promise<string> {
  const trackPath = await runAppleScript(`tell application "Swinsian" to get path of current track`);
  if (!trackPath || trackPath === "") return "No track playing";

  const dir = path.dirname(trackPath);
  const commonNames = ["cover.jpg", "Cover.jpg", "folder.jpg", "Folder.jpg", "front.jpg", "Front.jpg", "artwork.jpg"];

  let foundFile = "";
  for (const name of commonNames) {
    const fullPath = path.join(dir, name);
    if (fs.existsSync(fullPath)) {
      foundFile = fullPath;
      break;
    }
  }

  if (!foundFile) {
    // Try looking for any jpg/png in the directory if no common name matches
    const files = fs.readdirSync(dir);
    const imageFile = files.find((f) => f.toLowerCase().endsWith(".jpg") || f.toLowerCase().endsWith(".png"));
    if (imageFile) foundFile = path.join(dir, imageFile);
  }

  if (foundFile) {
    const script = `tell application "Finder" to set the clipboard to (POSIX file ${JSON.stringify(foundFile)})`;
    await runAppleScript(script);
    return `Copied ${path.basename(foundFile)} to clipboard`;
  }

  return "No cover art file found in directory";
}

/** Manage Swinsian's UI Windows */
export async function manageWindow(type: string) {
  const menuItems: Record<string, string[]> = {
    equalizer: ["Show Equalizer Window", "Show Equalizer", "Equalizer"],
    stats: ["Statistics", "Library Statistics", "Show Library Statistics"],
    inspector: ["Inspector", "Track Inspector", "Show Inspector", "Show Track Inspector"],
    quick: ["Quick Controller", "Show Quick Controller", "Controller"],
  };

  if (type === "main") {
    await showMainWindow();
    return;
  }
  if (type === "mini") {
    await showMiniWindow();
    return;
  }

  const itemNames = menuItems[type];
  if (!itemNames) return;

  const didClick = await clickSwinsianMenuItem("Window", itemNames);
  if (!didClick) {
    await showHUD(`${itemNames[0]} is not available in Swinsian's Window menu`);
  }
}
