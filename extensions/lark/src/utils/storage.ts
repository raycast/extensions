import { LocalStorage } from '@raycast/api';
import { RecentDocsListResponse } from '../services/space';
import { RecentMinutesListResponse } from '../services/minutes';

export const StorageKey = {
  TenantDomain: 'TENANT_DOMAIN',
  SpaceSession: 'SPACE_SESSION',
  DocsRecentList: 'DOCS_RECENT_LIST',
  MinutesRecentList: 'MINUTES_RECENT_LIST',
} as const;

export type StorageKey = ValueOf<typeof StorageKey>;

type StorageTypes = {
  TENANT_DOMAIN: string;
  SPACE_SESSION: string;
  DOCS_RECENT_LIST: RecentDocsListResponse;
  MINUTES_RECENT_LIST: RecentMinutesListResponse;
};

export async function setStorage<K extends StorageKey>(key: K, value: StorageTypes[K]): Promise<void> {
  await LocalStorage.setItem(key, JSON.stringify(value));
}

export async function getStorage<K extends StorageKey>(key: K): Promise<StorageTypes[K] | null> {
  const cache = await LocalStorage.getItem(key);
  if (typeof cache === 'string') {
    return JSON.parse(cache) as StorageTypes[K];
  }
  return null;
}
