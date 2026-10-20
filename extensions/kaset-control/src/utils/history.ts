// Pure recent-played log. LocalStorage I/O lives in ./kaset.ts so this module
// stays free of Raycast imports and unit-testable.

export interface TrackLike {
  name: string;
  artist: string;
  album: string;
  duration: number;
  id: string;
  artworkURL: string;
}

export interface RecentTrack extends TrackLike {
  playedAt: number;
}

export const MAX_RECENT = 5;

// Kaset exposes an ID-only placeholder song titled "Loading..." while it fills
// in real metadata (`Song.placeholder` in the app's source, which its own views
// guard against by that same title). Recording one left a junk "Loading..." row
// in Recently Played with no artwork and the fallback icon, so placeholders are
// never logged and are filtered out of anything already stored.
export function isPlaceholderTrack(track: TrackLike): boolean {
  if (!track.name || track.name === "Loading...") return true;
  return !track.artist && !track.artworkURL && !track.duration;
}

export function mergeRecent(
  prev: RecentTrack[],
  track: TrackLike,
  now: number,
): RecentTrack[] {
  const entry: RecentTrack = { ...track, playedAt: now };
  const without = prev.filter((existing) => existing.id !== track.id);
  return [entry, ...without].slice(0, MAX_RECENT);
}
