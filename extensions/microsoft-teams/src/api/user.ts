import { Cache } from "@raycast/api";
import { bodyOf, get } from "./api";

interface User {
  id: string;
  displayName: string;
  mail: string;
}

const cache = new Cache();
const cacheKeyCurrentUserId = "currentUserId";

export function currentUserId() {
  return cache.get(cacheKeyCurrentUserId);
}

export async function cacheCurrentUserId() {
  const response = await get({ path: "/me" });
  const user = await bodyOf<User>(response);
  cache.set(cacheKeyCurrentUserId, user.id);
}
