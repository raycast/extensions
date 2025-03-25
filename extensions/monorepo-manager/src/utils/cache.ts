import { Cache } from '@raycast/api';
import { getConfigs } from './config';
import { DEFAULT_CACHE_DURATION } from './constants';

export enum CacheKeys {
  CACHED_WORKSPACES = 'WORKSPACES',
  TIMESTAMP = 'TIMESTAMP',
  TEAMS = 'TEAMS',
  LIST_PACKAGES = 'LIST_PACKAGES',
}

const cacheDuration = getConfigs().cacheDuration || DEFAULT_CACHE_DURATION;

const cached = new Cache();

export function get(key: CacheKeys): string | undefined {
  const timestamp = Number(cached.get(CacheKeys.TIMESTAMP));

  const elapsed = Date.now() - timestamp;

  if (elapsed <= cacheDuration) {
    return cached.get(key);
  } else {
    remove(key);
  }

  return undefined;
}

export function set(key: CacheKeys, value: string): void {
  cached.set(CacheKeys.TIMESTAMP, Date.now().toString());
  return cached.set(key, value);
}

export function remove(key: CacheKeys): void {
  cached.remove(key);
}

export function clear(): void {
  cached.clear();
}
