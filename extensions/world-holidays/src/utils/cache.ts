import { Cache } from '@raycast/api';

const cache = new Cache();

export const getDataFromCache = <T>(dataKey: string): T | undefined => {
  try {
    const cached = cache.get(dataKey);
    return cached ? (JSON.parse(cached) as T) : undefined;
  } catch (e) {
    return undefined;
  }
};

export const saveDataInCache = <T>(dataKey: string, data: T): boolean => {
  try {
    cache.set(dataKey, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
};
