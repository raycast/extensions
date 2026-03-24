import { runAppleScript } from "run-applescript";
import { homedir } from "os";
import { join } from "path";
import { existsSync, statSync, readdirSync, unlinkSync, mkdirSync } from "fs";
import { createHash } from "crypto";
import { get as httpsGet } from "https";
import { get as httpGet } from "http";
import { createWriteStream } from "fs";

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

function getArtworkPathForTrack(trackName: string, artist: string): string {
  const hash = createHash("md5")
    .update(`${trackName}::${artist}`)
    .digest("hex")
    .slice(0, 12);
  return join(CACHE_DIR, `${ARTWORK_PREFIX}${hash}.jpg`);
}

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

function downloadImage(url: string, dest: string): Promise<boolean> {
  return new Promise((resolve) => {
    const getter = url.startsWith("https") ? httpsGet : httpGet;
    getter(url, (response) => {
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
      const fileStream = createWriteStream(dest);
      response.pipe(fileStream);
      fileStream.on("finish", () => {
        fileStream.close();
        resolve(true);
      });
      fileStream.on("error", () => {
        resolve(false);
      });
    }).on("error", () => resolve(false));
  });
}

interface ITunesResult {
  artworkUrl: string | null;
  trackUrl: string | null;
}

async function fetchFromITunesAPI(
  trackName: string,
  artist: string,
): Promise<ITunesResult> {
  const query = encodeURIComponent(`${trackName} ${artist}`);
  const url = `https://itunes.apple.com/search?term=${query}&media=music&limit=1`;

  return new Promise((resolve) => {
    httpsGet(url, (response) => {
      let data = "";
      response.on("data", (chunk: string) => (data += chunk));
      response.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (json.results && json.results.length > 0) {
            const result = json.results[0];
            let artworkUrl: string | null = result.artworkUrl100 || null;
            if (artworkUrl) {
              artworkUrl = artworkUrl.replace("100x100", "300x300");
            }
            const trackUrl: string | null = result.trackViewUrl || null;
            resolve({ artworkUrl, trackUrl });
            return;
          }
          resolve({ artworkUrl: null, trackUrl: null });
        } catch {
          resolve({ artworkUrl: null, trackUrl: null });
        }
      });
      response.on("error", () => resolve({ artworkUrl: null, trackUrl: null }));
    }).on("error", () => resolve({ artworkUrl: null, trackUrl: null }));
  });
}

let lastTrackKey = "";
let lastTrackUrl: string | null = null;
let lastArtworkPath: string | null = null;

export async function getNowPlaying(): Promise<NowPlayingData> {
  try {
    if (!existsSync(CACHE_DIR)) {
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

    if (
      trackKey === lastTrackKey &&
      lastArtworkPath &&
      existsSync(lastArtworkPath)
    ) {
      try {
        const stats = statSync(lastArtworkPath);
        if (stats.size > 0) {
          return {
            track,
            artworkPath: lastArtworkPath,
            trackUrl: lastTrackUrl,
          };
        }
      } catch {
        // fall through
      }
    }

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

export async function loveTrack(): Promise<void> {
  await runAppleScript(`
    tell application "Music"
      set favorited of current track to true
    end tell
  `);
}

export async function dislikeTrack(): Promise<void> {
  await runAppleScript(`
    tell application "Music"
      set disliked of current track to true
    end tell
  `);
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
