import type { Sound, SoundFilename } from "@repo/domain";

import { LocalStorage } from "@raycast/api";

const KEY = "favourites";

export type Favourites = Record<SoundFilename, number>;

export async function readFavourites(): Promise<Favourites> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return {} as Favourites;
  return JSON.parse(raw) as Favourites;
}

export async function writeFavourites(favs: Favourites): Promise<void> {
  await LocalStorage.setItem(KEY, JSON.stringify(favs));
}

export async function toggleFavourite(filename: SoundFilename): Promise<Favourites> {
  const favs = await readFavourites();
  if (filename in favs) {
    delete favs[filename];
  } else {
    favs[filename] = Date.now();
  }
  await writeFavourites(favs);
  return favs;
}

export function sortWithFavourites(sounds: readonly Sound[], favs: Favourites): Sound[] {
  const favourited: Sound[] = [];
  const rest: Sound[] = [];
  for (const s of sounds) {
    if (s.filename in favs) {
      favourited.push(s);
    } else {
      rest.push(s);
    }
  }
  favourited.sort((a, b) => (favs[b.filename] ?? 0) - (favs[a.filename] ?? 0));
  return [...favourited, ...rest];
}
