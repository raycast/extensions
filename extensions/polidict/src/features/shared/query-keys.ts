import { Cache } from "@raycast/api";
import type { SearchParams } from "../../types";
import { stableSerialize } from "./serializers";

const dataCache = new Cache();
const revisionCache = new Cache();

const CACHE_ROOT = "polidict-raycast";
const ANONYMOUS_IDENTITY = "anonymous";
const DEFAULT_REVISION = "0";
type RevisionListener = (revision: string) => void;

const revisionListeners = new Map<string, Set<RevisionListener>>();

function normalizeAuthIdentity(authIdentity: string | undefined): string {
  return authIdentity?.trim() || ANONYMOUS_IDENTITY;
}

function normalizeLanguageCode(languageCode: string | undefined): string {
  return languageCode ?? "";
}

function getScopePrefix(authIdentity: string, languageCode: string): string {
  return `${CACHE_ROOT}:${normalizeAuthIdentity(authIdentity)}:${normalizeLanguageCode(languageCode)}`;
}

function getRevisionKey(scope: string): string {
  return `${CACHE_ROOT}:revision:${scope}`;
}

function getDomainRevisionKey(domain: string, authIdentity: string, languageCode: string): string {
  return `${CACHE_ROOT}:revision:${domain}:${getScopePrefix(authIdentity, languageCode)}`;
}

function readRevision(key: string): string {
  return revisionCache.get(key) ?? DEFAULT_REVISION;
}

function bumpRevision(key: string): string {
  const currentRevision = Number.parseInt(readRevision(key), 10);
  const nextRevision = String(Number.isNaN(currentRevision) ? 1 : currentRevision + 1);
  revisionCache.set(key, nextRevision);
  const listeners = revisionListeners.get(key);
  if (listeners) {
    for (const listener of listeners) {
      listener(nextRevision);
    }
  }
  return nextRevision;
}

function subscribeRevision(key: string, listener: RevisionListener): () => void {
  const listeners = revisionListeners.get(key) ?? new Set<RevisionListener>();
  listeners.add(listener);
  revisionListeners.set(key, listeners);

  return () => {
    const currentListeners = revisionListeners.get(key);
    if (!currentListeners) {
      return;
    }

    currentListeners.delete(listener);
    if (currentListeners.size === 0) {
      revisionListeners.delete(key);
    }
  };
}

function readCachedValue<T>(key: string): T | undefined {
  const cached = dataCache.get(key);
  if (!cached) {
    return undefined;
  }

  try {
    return JSON.parse(cached) as T;
  } catch {
    return undefined;
  }
}

function writeCachedValue(key: string, value: unknown): void {
  dataCache.set(key, JSON.stringify(value));
}

function removeCachedValue(key: string): boolean {
  return dataCache.remove(key);
}

export function readSharedCache<T>(key: string): T | undefined {
  return readCachedValue<T>(key);
}

export function writeSharedCache(key: string, value: unknown): void {
  writeCachedValue(key, value);
}

export function removeSharedCache(key: string): boolean {
  return removeCachedValue(key);
}

export const queryKeys = {
  auth: {
    scope: (authIdentity: string, languageCode?: string) => getScopePrefix(authIdentity, languageCode ?? ""),
  },
  learningItems: {
    scope: (authIdentity: string, languageCode: string) => getScopePrefix(authIdentity, languageCode),
    revisionKey: (authIdentity: string, languageCode: string) =>
      getDomainRevisionKey("learning-items", authIdentity, languageCode),
    revision: (authIdentity: string, languageCode: string) =>
      readRevision(queryKeys.learningItems.revisionKey(authIdentity, languageCode)),
    bumpRevision: (authIdentity: string, languageCode: string) =>
      bumpRevision(queryKeys.learningItems.revisionKey(authIdentity, languageCode)),
    subscribeRevision: (authIdentity: string, languageCode: string, listener: RevisionListener) =>
      subscribeRevision(queryKeys.learningItems.revisionKey(authIdentity, languageCode), listener),
    list: (authIdentity: string, languageCode: string, revision: string, params: Partial<SearchParams>) =>
      `${queryKeys.learningItems.scope(authIdentity, languageCode)}:learning-items:v${revision}:${stableSerialize(
        params,
      )}`,
  },
  groups: {
    scope: (authIdentity: string, languageCode: string) => getScopePrefix(authIdentity, languageCode),
    revisionKey: (authIdentity: string, languageCode: string) =>
      getDomainRevisionKey("groups", authIdentity, languageCode),
    revision: (authIdentity: string, languageCode: string) =>
      readRevision(queryKeys.groups.revisionKey(authIdentity, languageCode)),
    bumpRevision: (authIdentity: string, languageCode: string) =>
      bumpRevision(queryKeys.groups.revisionKey(authIdentity, languageCode)),
    subscribeRevision: (authIdentity: string, languageCode: string, listener: RevisionListener) =>
      subscribeRevision(queryKeys.groups.revisionKey(authIdentity, languageCode), listener),
    list: (authIdentity: string, languageCode: string, revision: string) =>
      `${queryKeys.groups.scope(authIdentity, languageCode)}:groups:v${revision}`,
  },
  lookup: {
    scope: (authIdentity: string, languageCode: string) => getScopePrefix(authIdentity, languageCode),
    revisionKey: (authIdentity: string, languageCode: string) =>
      getDomainRevisionKey("lookup", authIdentity, languageCode),
    revision: (authIdentity: string, languageCode: string) =>
      readRevision(queryKeys.lookup.revisionKey(authIdentity, languageCode)),
    bumpRevision: (authIdentity: string, languageCode: string) =>
      bumpRevision(queryKeys.lookup.revisionKey(authIdentity, languageCode)),
    subscribeRevision: (authIdentity: string, languageCode: string, listener: RevisionListener) =>
      subscribeRevision(queryKeys.lookup.revisionKey(authIdentity, languageCode), listener),
    result: (authIdentity: string, languageCode: string, revision: string, query: string) =>
      `${queryKeys.lookup.scope(authIdentity, languageCode)}:lookup:v${revision}:${stableSerialize(query)}`,
  },
  profile: {
    scope: (authIdentity: string) => `${CACHE_ROOT}:${normalizeAuthIdentity(authIdentity)}`,
    revisionKey: (authIdentity: string) => getRevisionKey(`${queryKeys.profile.scope(authIdentity)}:profile`),
    revision: (authIdentity: string) => readRevision(queryKeys.profile.revisionKey(authIdentity)),
    bumpRevision: (authIdentity: string) => bumpRevision(queryKeys.profile.revisionKey(authIdentity)),
    subscribeRevision: (authIdentity: string, listener: RevisionListener) =>
      subscribeRevision(queryKeys.profile.revisionKey(authIdentity), listener),
    current: (authIdentity: string, revision: string) =>
      `${queryKeys.profile.scope(authIdentity)}:profile:v${revision}`,
  },
  languages: {
    scope: (authIdentity: string) => `${CACHE_ROOT}:${normalizeAuthIdentity(authIdentity)}`,
    listRevisionKey: (authIdentity: string) => getRevisionKey(`${queryKeys.languages.scope(authIdentity)}:list`),
    listRevision: (authIdentity: string) => readRevision(queryKeys.languages.listRevisionKey(authIdentity)),
    bumpListRevision: (authIdentity: string) => bumpRevision(queryKeys.languages.listRevisionKey(authIdentity)),
    subscribeListRevision: (authIdentity: string, listener: RevisionListener) =>
      subscribeRevision(queryKeys.languages.listRevisionKey(authIdentity), listener),
    list: (authIdentity: string, revision: string) =>
      `${queryKeys.languages.scope(authIdentity)}:languages:list:v${revision}`,
    nativeRevisionKey: (authIdentity: string) => getRevisionKey(`${queryKeys.languages.scope(authIdentity)}:native`),
    nativeRevision: (authIdentity: string) => readRevision(queryKeys.languages.nativeRevisionKey(authIdentity)),
    bumpNativeRevision: (authIdentity: string) => bumpRevision(queryKeys.languages.nativeRevisionKey(authIdentity)),
    subscribeNativeRevision: (authIdentity: string, listener: RevisionListener) =>
      subscribeRevision(queryKeys.languages.nativeRevisionKey(authIdentity), listener),
    native: (authIdentity: string, revision: string) =>
      `${queryKeys.languages.scope(authIdentity)}:languages:native:v${revision}`,
    currentRevisionKey: (authIdentity: string) => getRevisionKey(`${queryKeys.languages.scope(authIdentity)}:current`),
    currentRevision: (authIdentity: string) => readRevision(queryKeys.languages.currentRevisionKey(authIdentity)),
    bumpCurrentRevision: (authIdentity: string) => bumpRevision(queryKeys.languages.currentRevisionKey(authIdentity)),
    subscribeCurrentRevision: (authIdentity: string, listener: RevisionListener) =>
      subscribeRevision(queryKeys.languages.currentRevisionKey(authIdentity), listener),
    current: (authIdentity: string, revision: string) =>
      `${queryKeys.languages.scope(authIdentity)}:languages:current:v${revision}`,
  },
};

export function invalidateLearningItemsCache(authIdentity: string, languageCode: string): string {
  return queryKeys.learningItems.bumpRevision(authIdentity, languageCode);
}

export function invalidateGroupsCache(authIdentity: string, languageCode: string): string {
  return queryKeys.groups.bumpRevision(authIdentity, languageCode);
}

export function invalidateLookupCache(authIdentity: string, languageCode: string): string {
  return queryKeys.lookup.bumpRevision(authIdentity, languageCode);
}

export function invalidateUserProfileCache(authIdentity: string): string {
  return queryKeys.profile.bumpRevision(authIdentity);
}
