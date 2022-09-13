import { Cache } from "@raycast/api";

import * as music from "./scripts";

const cache = new Cache();

export enum ExpirationTime {
  Hour = 3600 * 1000,
  Day = 24 * Hour,
}

export const queryCache = (key: string, expirationTime = ExpirationTime.Day): any => {
  if (cache.has(key)) {
    const data = cache.get(key);
    if (data) {
      const { time, value }: { time: number; value: any } = JSON.parse(data);
      if (Date.now() - time < expirationTime) {
        return value;
      }
    }
  }
  return undefined;
};

export const setCache = (key: string, value: any): void => {
  cache.set(key, JSON.stringify({ time: Date.now(), value }));
};

export const wait = async (seconds: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

export const refreshCache = async (): Promise<void> => {
  await music.track.getAllTracks(false);
  const playlists = await music.playlists.getPlaylists(false);
  const promises = playlists.map((p) => music.playlists.getPlaylistTracks(p.id, false));
  await Promise.all(promises);
};
