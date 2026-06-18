import { LocalStorage } from "@raycast/api";
import { MemeClip, StoredClip } from "./types";

const FAVORITES_KEY = "favorites";
const RECENTS_KEY = "recents";

export type ClipState = {
  favorites: StoredClip[];
  recents: StoredClip[];
};

export async function loadClipState(): Promise<ClipState> {
  const [favorites, recents] = await Promise.all([
    readClips(FAVORITES_KEY),
    readClips(RECENTS_KEY),
  ]);
  return { favorites, recents };
}

export async function toggleFavorite(clip: MemeClip): Promise<boolean> {
  const favorites = await readClips(FAVORITES_KEY);
  const existingIndex = favorites.findIndex((item) => item.id === clip.id);

  if (existingIndex >= 0) {
    favorites.splice(existingIndex, 1);
    await writeClips(FAVORITES_KEY, favorites);
    return false;
  }

  const stored = { ...clip, isFavorite: true };
  await writeClips(FAVORITES_KEY, [stored, ...favorites].slice(0, 100));
  return true;
}

export async function recordRecent(
  clip: MemeClip,
  cachedAudioPath?: string,
): Promise<void> {
  const recents = await readClips(RECENTS_KEY);
  const favorites = await readClips(FAVORITES_KEY);
  const stored: StoredClip = {
    ...clip,
    cachedAudioPath,
    isFavorite: favorites.some((item) => item.id === clip.id),
  };

  await writeClips(
    RECENTS_KEY,
    [stored, ...recents.filter((item) => item.id !== clip.id)].slice(0, 50),
  );
}

export async function removeClip(clip: MemeClip): Promise<void> {
  const [favorites, recents] = await Promise.all([
    readClips(FAVORITES_KEY),
    readClips(RECENTS_KEY),
  ]);
  await Promise.all([
    writeClips(
      FAVORITES_KEY,
      favorites.filter((item) => item.id !== clip.id),
    ),
    writeClips(
      RECENTS_KEY,
      recents.filter((item) => item.id !== clip.id),
    ),
  ]);
}

export function decorateClips(clips: MemeClip[], state: ClipState): MemeClip[] {
  const favorites = new Set(state.favorites.map((clip) => clip.id));
  const recentCache = new Map(
    state.recents.flatMap((clip) =>
      clip.cachedAudioPath ? ([[clip.id, clip.cachedAudioPath]] as const) : [],
    ),
  );

  return clips.map((clip) => ({
    ...clip,
    cachedAudioPath: clip.cachedAudioPath ?? recentCache.get(clip.id),
    isFavorite: favorites.has(clip.id),
  }));
}

export function storedDisplayClips(state: ClipState): MemeClip[] {
  const recentCache = new Map(
    state.recents.flatMap((clip) =>
      clip.cachedAudioPath ? ([[clip.id, clip.cachedAudioPath]] as const) : [],
    ),
  );
  const favorites = state.favorites.map((clip) => ({
    ...clip,
    cachedAudioPath: clip.cachedAudioPath ?? recentCache.get(clip.id),
    isFavorite: true,
  }));
  const recents = state.recents.map((clip) => ({
    ...clip,
    isFavorite: state.favorites.some((favorite) => favorite.id === clip.id),
  }));

  return dedupe([...favorites, ...recents]);
}

function dedupe(clips: MemeClip[]): MemeClip[] {
  const seen = new Set<string>();
  return clips.filter((clip) => {
    if (seen.has(clip.id)) {
      return false;
    }

    seen.add(clip.id);
    return true;
  });
}

async function readClips(key: string): Promise<StoredClip[]> {
  const value = await LocalStorage.getItem<string>(key);
  if (!value) {
    return [];
  }

  try {
    const decoded = JSON.parse(value);
    return Array.isArray(decoded) ? decoded.filter(isStoredClip) : [];
  } catch {
    return [];
  }
}

async function writeClips(key: string, clips: StoredClip[]): Promise<void> {
  await LocalStorage.setItem(key, JSON.stringify(clips));
}

function isStoredClip(value: unknown): value is StoredClip {
  if (!value || typeof value !== "object") {
    return false;
  }

  const clip = value as Partial<StoredClip>;
  return (
    typeof clip.id === "string" &&
    typeof clip.name === "string" &&
    typeof clip.soundURL === "string"
  );
}
