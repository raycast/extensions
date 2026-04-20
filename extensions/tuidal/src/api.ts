import type {
  FavAlbum,
  Library,
  PlayTrackRequest,
  QueueResponse,
  Status,
  Track,
} from "./types";

const BASE = "http://127.0.0.1:7837";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

async function post(path: string, body?: unknown): Promise<void> {
  const opts: RequestInit = { method: "POST" };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
    opts.headers = { "Content-Type": "application/json" };
  }
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok && res.status !== 204) throw new Error(`API ${res.status}`);
}

export const api = {
  // Status
  status: () => get<Status>("/status"),

  // Playback controls
  playPause: () => post("/play-pause"),
  next: () => post("/next"),
  previous: () => post("/previous"),
  volumeUp: () => post("/volume-up"),
  volumeDown: () => post("/volume-down"),
  setVolume: (level: number) => post(`/volume?level=${level}`),
  seekForward: () => post("/seek-forward"),
  seekBackward: () => post("/seek-backward"),
  shuffle: () => post("/shuffle"),
  repeat: () => post("/repeat"),

  // Play
  playTrack: (track: PlayTrackRequest) => post("/play-track", track),
  justPlay: (q: string) => post(`/just-play?q=${encodeURIComponent(q)}`),

  // Queue & search
  queue: () => get<QueueResponse>("/queue"),
  search: (q: string, limit = 20) =>
    get<Track[]>(`/search?q=${encodeURIComponent(q)}&limit=${limit}`),

  // Library
  library: () => get<Library>("/library"),
  favorites: () => get<Track[]>("/library/favorites"),
  favoriteAlbums: () => get<FavAlbum[]>("/library/favorite-albums"),
  playlistTracks: (uuid: string) => get<Track[]>(`/library/playlist/${uuid}`),
  mixTracks: (id: string) => get<Track[]>(`/library/mix/${id}`),
  albumTracks: (id: number) => get<Track[]>(`/library/album/${id}`),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function artistNames(artists: { name: string }[]): string {
  return artists.map((a) => a.name).join(", ");
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function qualityIcon(quality?: string): string {
  switch (quality) {
    case "HI_RES_LOSSLESS":
      return "◈";
    case "LOSSLESS":
      return "◆";
    default:
      return "◇";
  }
}

export function progressBar(progress: number, width = 24): string {
  const filled = Math.round(progress * width);
  return "▓".repeat(filled) + "░".repeat(width - filled);
}

export async function playTrack(track: Track): Promise<void> {
  await api.playTrack({
    id: track.id,
    title: track.title,
    artist: artistNames(track.artists),
    album: track.album.title,
    duration: track.duration,
  });
}
