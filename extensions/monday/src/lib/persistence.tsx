import { LocalStorage } from "@raycast/api";
import { Me } from "./models";

const UserCacheKey = "user";

export async function resetAllCaches(): Promise<void> {
  return await LocalStorage.clear();
}

// Boards -> now uses useCachedPromise (remove comment in future update)

// User
export async function getCachedUser(): Promise<Me | undefined> {
  return await retrieve<Me>(UserCacheKey);
}

export async function cacheUser(user: Me): Promise<void> {
  return await store(UserCacheKey, user);
}

// Team -> now uses useCachedPromise (remove comment in future update)

// Helpers
async function store<T>(key: string, object: T): Promise<void> {
  await LocalStorage.setItem(key, JSON.stringify(object));
}

async function retrieve<T>(key: string): Promise<T | undefined> {
  const localCache = await LocalStorage.getItem<string>(key);
  if (localCache) {
    return JSON.parse(localCache) as T;
  }
}
