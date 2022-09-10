import { Cache } from "@raycast/api";

const cache = new Cache();

export enum ExpirationTime {
  Hour = 3600 * 1000,
  Day = 24 * Hour,
}

export const queryCache = (key: string, expirationTime = ExpirationTime.Hour): any => {
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
