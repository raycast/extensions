import { callOp, Track } from "./ipc";

// Track favorites live in a real cliamp saved playlist (~/.config/cliamp/playlists/starred.toml),
// managed entirely over IPC so the daemon owns the file. Each track is also bookmarked, which
// surfaces it in cliamp's native virtual "Favorites" playlist in the TUI.
export const FAVORITES_PLAYLIST = "Starred";

function slim(t: Track): Track {
  return {
    title: t.title,
    ...(t.artist ? { artist: t.artist } : {}),
    ...(t.album ? { album: t.album } : {}),
    path: t.path,
  };
}

export async function listTrackFavorites(): Promise<Track[]> {
  try {
    const res = await callOp<{ tracks?: Track[] }>("provider.tracks", {
      provider: "local",
      playlist: FAVORITES_PLAYLIST,
    });
    return res.tracks ?? [];
  } catch {
    return []; // playlist does not exist yet
  }
}

export async function addTrackFavorite(t: Track): Promise<void> {
  try {
    await callOp("playlist.create", { provider: "local", playlist: FAVORITES_PLAYLIST });
  } catch {
    // already exists
  }
  await callOp("playlist.add", { provider: "local", playlist: FAVORITES_PLAYLIST, track: slim(t) });
  try {
    await callOp("playlist.bookmark", { provider: "local", playlist: FAVORITES_PLAYLIST, track: slim(t) });
  } catch {
    // bookmark is cosmetic (TUI Favorites aggregation) — the track is saved either way
  }
}

export async function removeTrackFavorite(index: number): Promise<void> {
  await callOp("playlist.remove", { provider: "local", playlist: FAVORITES_PLAYLIST, index });
}
