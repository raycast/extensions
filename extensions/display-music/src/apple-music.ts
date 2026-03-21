import { runAppleScript } from "run-applescript";
import { homedir } from "os";
import { join } from "path";
import { existsSync, writeFileSync, statSync, readdirSync, unlinkSync } from "fs";
import { createHash } from "crypto";
import https from "https";
import http from "http";

export interface TrackInfo {
  name: string;
  artist: string;
  album: string;
  playerState: "playing" | "paused" | "stopped";
}

export interface NowPlayingData {
  track: TrackInfo | null;
  artworkPath: string | null;
  trackUrl: string | null;
}

const CACHE_DIR = join(homedir(), ".cache");
const ARTWORK_PREFIX = "raycast-display-music-";

/**
 * Generate a unique artwork path based on track + artist.
 */
function getArtworkPathForTrack(trackName: string, artist: string): string {
  const hash = createHash("md5").update(`${trackName}::${artist}`).digest("hex").slice(0, 12);
  return join(CACHE_DIR, `${ARTWORK_PREFIX}${hash}.jpg`);
}

/**
 * Clean up old artwork files (keep only the current one).
 */
function cleanupOldArtwork(currentPath: string): void {
  try {
    const files = readdirSync(CACHE_DIR);
    for (const file of files) {
      if (file.startsWith(ARTWORK_PREFIX)) {
        const fullPath = join(CACHE_DIR, file);
        if (fullPath !== currentPath) {
          try {
            unlinkSync(fullPath);
          } catch {
            // ignore
          }
        }
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Download an image from a URL and save to disk.
 */
function downloadImage(url: string, dest: string): Promise<boolean> {
  return new Promise((resolve) => {
    const client = url.startsWith("https") ? https : http;
    client
      .get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            downloadImage(redirectUrl, dest).then(resolve);
            return;
          }
        }
        if (response.statusCode !== 200) {
          resolve(false);
          return;
        }
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          try {
            writeFileSync(dest, Buffer.concat(chunks));
            resolve(true);
          } catch {
            resolve(false);
          }
        });
        response.on("error", () => resolve(false));
      })
      .on("error", () => resolve(false));
  });
}

interface ITunesResult {
  artworkUrl: string | null;
  trackUrl: string | null;
}

/**
 * Search the iTunes Search API for artwork URL and track link.
 */
async function fetchFromITunesAPI(trackName: string, artist: string): Promise<ITunesResult> {
  const query = encodeURIComponent(`${trackName} ${artist}`);
  const url = `https://itunes.apple.com/search?term=${query}&media=music&limit=1`;

  return new Promise((resolve) => {
    https
      .get(url, (response) => {
        let data = "";
        response.on("data", (chunk: string) => (data += chunk));
        response.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (json.results && json.results.length > 0) {
              const result = json.results[0];
              let artworkUrl = result.artworkUrl100 || null;
              if (artworkUrl) {
                artworkUrl = artworkUrl.replace("100x100", "300x300");
              }
              const trackUrl = result.trackViewUrl || null;
              resolve({ artworkUrl, trackUrl });
              return;
            }
            resolve({ artworkUrl: null, trackUrl: null });
          } catch {
            resolve({ artworkUrl: null, trackUrl: null });
          }
        });
        response.on("error", () => resolve({ artworkUrl: null, trackUrl: null }));
      })
      .on("error", () => resolve({ artworkUrl: null, trackUrl: null }));
  });
}

// Cache per track
let lastTrackKey = "";
let lastTrackUrl: string | null = null;
let lastArtworkPath: string | null = null;

/**
 * Single call for track info, artwork, and track URL.
 */
export async function getNowPlaying(): Promise<NowPlayingData> {
  try {
    // Ensure cache directory exists
    if (!existsSync(CACHE_DIR)) {
      const { mkdirSync } = await import("fs");
      mkdirSync(CACHE_DIR, { recursive: true });
    }

    const result = await runAppleScript(`
      if application "Music" is not running then
        return "NOT_RUNNING"
      end if

      tell application "Music"
        if player state is stopped then
          return "STOPPED"
        end if

        set trackName to name of current track
        set trackArtist to artist of current track
        set trackAlbum to album of current track
        set pState to player state as string

        return trackName & "|||" & trackArtist & "|||" & trackAlbum & "|||" & pState
      end tell
    `);

    if (result === "NOT_RUNNING" || result === "STOPPED") {
      return { track: null, artworkPath: null, trackUrl: null };
    }

    const parts = result.split("|||");
    if (parts.length < 4) {
      return { track: null, artworkPath: null, trackUrl: null };
    }

    const track: TrackInfo = {
      name: parts[0],
      artist: parts[1],
      album: parts[2],
      playerState: parts[3] as TrackInfo["playerState"],
    };

    const trackKey = `${track.name}::${track.artist}`;
    const artworkPath = getArtworkPathForTrack(track.name, track.artist);

    // If same track and we already have artwork, reuse everything
    if (trackKey === lastTrackKey && lastArtworkPath && existsSync(lastArtworkPath)) {
      try {
        const stats = statSync(lastArtworkPath);
        if (stats.size > 0) {
          return { track, artworkPath: lastArtworkPath, trackUrl: lastTrackUrl };
        }
      } catch {
        // fall through
      }
    }

    // New track — try AppleScript artwork first
    let gotArtwork = false;
    try {
      await runAppleScript(`
        tell application "Music"
          set artworkData to raw data of artwork 1 of current track
          set outputPath to "${artworkPath}"
          set fileRef to open for access outputPath with write permission
          set eof fileRef to 0
          write artworkData to fileRef
          close access fileRef
        end tell
      `);
      if (existsSync(artworkPath)) {
        const stats = statSync(artworkPath);
        gotArtwork = stats.size > 0;
      }
    } catch {
      // AppleScript artwork failed, will fall back to API
    }

    // Fetch from iTunes API (for track URL, and artwork if AppleScript failed)
    const apiResult = await fetchFromITunesAPI(track.name, track.artist);
    lastTrackUrl = apiResult.trackUrl;

    if (!gotArtwork && apiResult.artworkUrl) {
      gotArtwork = await downloadImage(apiResult.artworkUrl, artworkPath);
    }

    lastTrackKey = trackKey;

    if (gotArtwork) {
      cleanupOldArtwork(artworkPath);
      lastArtworkPath = artworkPath;
      return { track, artworkPath, trackUrl: lastTrackUrl };
    }

    lastArtworkPath = null;
    return { track, artworkPath: null, trackUrl: lastTrackUrl };
  } catch {
    return { track: null, artworkPath: null, trackUrl: null };
  }
}

export async function togglePlayPause(): Promise<void> {
  await runAppleScript(`tell application "Music" to playpause`);
}

export async function nextTrack(): Promise<void> {
  await runAppleScript(`tell application "Music" to next track`);
}

export async function previousTrack(): Promise<void> {
  await runAppleScript(`tell application "Music" to previous track`);
}

export async function revealInMusic(): Promise<void> {
  await runAppleScript(`
    tell application "Music"
      activate
      reveal current track
    end tell
  `);
}

export async function openArtistInMusic(artistName: string): Promise<void> {
  const encoded = encodeURIComponent(artistName);
  await runAppleScript(`
    tell application "Music"
      activate
    end tell
    open location "music://music.apple.com/search?term=${encoded}"
  `);
}

export async function openAlbumInMusic(): Promise<void> {
  await runAppleScript(`
    tell application "Music"
      activate
      reveal current track
    end tell
  `);
}
