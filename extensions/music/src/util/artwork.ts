import { Cache, environment } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const artworkCache = new Cache({ namespace: "music-artwork" });

export function cleanSearchQuery(title: string): string {
  return title
    .replace(/\(.*?\)/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/\b(feat|ft)\.?\s+.*$/i, "")
    .replace(/\s*:\s*.*$/, "")
    .replace(/\s*-\s*(single|ep|audio|video|official|remastered).*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function getArtworkDiskPath(track: { id?: string; name: string; artist: string }): string {
  const supportPath = environment?.supportPath || path.join(os.tmpdir(), "raycast-music-artwork");
  const rawKey = `${track.id || ""}_${track.artist}_${track.name}`;
  const safeKey = rawKey.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  return path.join(supportPath, `art_${safeKey}.jpg`);
}

/**
 * Returns synchronously cached artwork file path or URL if available (0ms delay).
 */
export function getCachedTrackArtwork(track: {
  id?: string;
  name: string;
  artist: string;
  album?: string;
}): string | null {
  const diskPath = getArtworkDiskPath(track);
  try {
    if (fs.existsSync(diskPath) && fs.statSync(diskPath).size > 0) {
      return diskPath;
    }
  } catch {
    // ignore filesystem errors
  }

  const cacheKey = `${track.artist}:::${track.name}`;
  return artworkCache.get(cacheKey) ?? null;
}

/**
 * Searches the public iTunes Search API for song artwork.
 * Returns a high-res artwork URL, or null if not found.
 */
export async function fetchArtworkFromItunes(track: {
  name: string;
  artist: string;
  album?: string;
}): Promise<string | null> {
  try {
    const cleanName = cleanSearchQuery(track.name);
    const query = `${track.artist} ${cleanName || track.name || track.album || ""}`.trim();
    if (!query) return null;

    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const json = (await res.json()) as { results?: Array<{ artworkUrl100?: string; artworkUrl60?: string }> };
    const match = json.results?.[0];
    if (match?.artworkUrl100) {
      return match.artworkUrl100.replace("100x100bb", "200x200bb");
    }
    if (match?.artworkUrl60) {
      return match.artworkUrl60;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolves artwork for the current track:
 * 1. Local disk / Cache (0ms)
 * 2. AppleScript direct extraction from Music.app to local disk
 * 3. iTunes Search API fallback
 */
export async function getTrackArtwork(track: {
  id?: string;
  name: string;
  artist: string;
  album?: string;
}): Promise<string | null> {
  const cached = getCachedTrackArtwork(track);
  if (cached) {
    return cached;
  }

  const cacheKey = `${track.artist}:::${track.name}`;

  // 1. Try extracting directly from Music.app
  try {
    const diskPath = getArtworkDiskPath(track);
    const dir = path.dirname(diskPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const escapedDiskPath = diskPath.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const script = `
tell application "Music"
  if running then
    try
      set t to current track
      if (count of artworks of t) > 0 then
        set artData to raw data of artwork 1 of t
      else
        return "no-artwork"
      end if
    on error
      return "no-artwork"
    end try
  else
    return "not-running"
  end if
end tell

set filePath to POSIX file "${escapedDiskPath}"
try
  set fileRef to open for access filePath with write permission
  set eof fileRef to 0
  write artData to fileRef
  close access fileRef
  return "saved"
on error
  try
    close access filePath
  end try
  return "error"
end try
`;

    const result = await runAppleScript(script, { timeout: 3000 });
    if (result === "saved" && fs.existsSync(diskPath) && fs.statSync(diskPath).size > 0) {
      artworkCache.set(cacheKey, diskPath);
      return diskPath;
    }
  } catch {
    // Continue to iTunes fallback
  }

  // 2. Fallback to iTunes Search API
  const itunesArtwork = await fetchArtworkFromItunes(track);
  if (itunesArtwork) {
    artworkCache.set(cacheKey, itunesArtwork);
    return itunesArtwork;
  }

  return null;
}
