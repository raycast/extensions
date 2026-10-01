import { environment } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Menu bar icons render at roughly 18pt, so 2x of that is plenty.
const ICON_PX = 40;
const MAX_CACHED_FILES = 50;
// Short on purpose: right after a skip Music often has not loaded the new
// track's artwork yet, so a miss must not stick for long.
const MISS_TTL_MS = 15 * 1000;
// A leftover .raw means an extraction was interrupted. Real ones finish in seconds.
const STALE_RAW_MS = 60 * 1000;
// Reusing a cached cover refreshes its age so pruning drops the least recently
// played albums first. Skipped when recent, to avoid a write on every poll.
const TOUCH_AFTER_MS = 60 * 1000;

const artworkDir = path.join(environment.supportPath, "artwork");
const inFlight = new Map<string, Promise<string | undefined>>();

// Keyed by artist + album rather than track id: streamed tracks don't have a
// stable id, and one lookup then covers every track on the album.
function cacheKey(artist: string, album: string, name: string): string {
  const basis = album ? `${artist}|${album}` : `${artist}|${name}`;
  return createHash("sha1").update(basis.toLowerCase()).digest("hex").slice(0, 16);
}

function ageMs(file: string): number {
  return Date.now() - fs.statSync(file).mtimeMs;
}

function prune(): void {
  try {
    const names = fs.readdirSync(artworkDir);

    // Expired misses and interrupted extractions are just clutter.
    for (const name of names) {
      const limit = name.endsWith(".miss") ? MISS_TTL_MS : name.endsWith(".raw") ? STALE_RAW_MS : undefined;
      if (limit === undefined) continue;
      const file = path.join(artworkDir, name);
      if (ageMs(file) > limit) fs.rmSync(file, { force: true });
    }

    const covers = names
      .filter((f) => f.endsWith(".png"))
      .map((f) => ({ f, t: fs.statSync(path.join(artworkDir, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t);
    for (const { f } of covers.slice(MAX_CACHED_FILES)) fs.rmSync(path.join(artworkDir, f), { force: true });
  } catch {
    // best effort
  }
}

/** True if the cover exists. Also refreshes its age if it has not been used recently. */
function useCachedCover(file: string): boolean {
  try {
    if (ageMs(file) > TOUCH_AFTER_MS) {
      const now = new Date();
      fs.utimesSync(file, now, now);
    }
    return true;
  } catch {
    return false;
  }
}

async function extract(key: string, album: string): Promise<string | undefined> {
  const finalPath = path.join(artworkDir, `${key}.png`);
  const missPath = path.join(artworkDir, `${key}.miss`);
  const rawPath = path.join(artworkDir, `${key}.raw`);

  // Writes the artwork's original bytes to disk. The album check guards
  // against the track changing between the snapshot and this call.
  const result = await runAppleScript(
    `
    on run argv
      set rawPath to item 1 of argv
      set expectedAlbum to item 2 of argv
      tell application "Music"
        if player state is stopped then return "none"
        set t to current track
        if (album of t) is not expectedAlbum then return "mismatch"
        if (count of artworks of t) is 0 then return "none"
        set d to raw data of artwork 1 of t
      end tell
      set f to open for access (POSIX file rawPath) with write permission
      try
        set eof f to 0
        write d to f
        close access f
      on error
        try
          close access f
        end try
        return "none"
      end try
      return "ok"
    end run
  `,
    [rawPath, album],
    { timeout: 5_000 },
  ).catch(() => "none");

  if (result === "mismatch") return undefined; // transient, try again next poll

  if (result === "ok") {
    try {
      await execFileAsync("/usr/bin/sips", [
        "-s",
        "format",
        "png",
        "-z",
        String(ICON_PX),
        String(ICON_PX),
        rawPath,
        "--out",
        finalPath,
      ]);
      return finalPath;
    } catch {
      // fall through to recording a miss
    } finally {
      fs.rmSync(rawPath, { force: true });
    }
  }

  fs.writeFileSync(missPath, "");
  return undefined;
}

/**
 * Returns a small cached PNG of the current track's album art, or undefined
 * when none is available. Does no work on a cache hit beyond a file check.
 */
export async function getArtworkPath(artist: string, album: string, name: string): Promise<string | undefined> {
  const key = cacheKey(artist, album, name);
  const finalPath = path.join(artworkDir, `${key}.png`);
  if (useCachedCover(finalPath)) return finalPath;

  const missPath = path.join(artworkDir, `${key}.miss`);
  try {
    if (Date.now() - fs.statSync(missPath).mtimeMs < MISS_TTL_MS) return undefined;
  } catch {
    // no recorded miss
  }

  const pending = inFlight.get(key);
  if (pending) return pending;

  fs.mkdirSync(artworkDir, { recursive: true });
  const job = extract(key, album).finally(() => {
    inFlight.delete(key);
    prune();
  });
  inFlight.set(key, job);
  return job;
}
