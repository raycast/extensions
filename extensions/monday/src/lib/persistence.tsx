import { LocalStorage } from "@raycast/api";
import { Board, Me, User } from "./models";

const BoardsCacheKey = "boards";
const BoardCacheKey = "board";
const UserCacheKey = "user";
const TeamCacheKey = "team";

export async function resetAllCaches(): Promise<void> {
  return await LocalStorage.clear();
}

// Boards
export async function getCachedBoards(): Promise<Board[] | undefined> {
  return await retrieve<Board[]>(BoardsCacheKey);
}

export async function cacheBoards(boards: Board[]): Promise<void> {
  return await store(BoardsCacheKey, boards);
}

export async function getCachedQuickAddBoard(): Promise<Board | undefined> {
  return await retrieve<Board>(BoardCacheKey);
}

export async function cacheQuickAddBoard(boards: Board): Promise<void> {
  return await store(BoardCacheKey, boards);
}

// User
export async function getCachedUser(): Promise<Me | undefined> {
  return await retrieve<Me>(UserCacheKey);
}

export async function cacheUser(user: Me): Promise<void> {
  return await store(UserCacheKey, user);
}

// Team
export async function getCachedTeam(): Promise<User[] | undefined> {
  return await retrieve<User[]>(TeamCacheKey);
}

export async function cacheTeam(users: User[]): Promise<void> {
  return await store(TeamCacheKey, users);
}

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
