import { Cache, LocalStorage } from "@raycast/api";
import { bodyOf, failIfNotOk, get } from "./api";

interface CurrentUser {
  id: string;
  displayName: string;
  mail: string;
}

interface Users {
  value: User[];
}

export interface User {
  id: string;
  department?: string;
  displayName: string;
  jobTitle?: string;
  mail?: string;
  userPrincipalName?: string;
}

const cache = new Cache();
const cacheKeyCurrentUserId = "currentUserId";
const cacheKeyUserPhoto = "userPhoto";
const localStorageKeyRecentUsers = "recentUsers";
const maxRecentUsers = 10;

function userPhotoStorageKey(userId: string) {
  return `${cacheKeyUserPhoto}:${userId}`;
}

export function currentUserId() {
  return cache.get(cacheKeyCurrentUserId);
}

export async function cacheCurrentUserId() {
  const response = await get({ path: "/me" });
  const user = await bodyOf<CurrentUser>(response);
  cache.set(cacheKeyCurrentUserId, user.id);
}

export async function searchUsers(query: string): Promise<User[]> {
  const escapedQuery = query.replaceAll("'", "''").trim();
  if (!escapedQuery) {
    return [];
  }
  let response = await get({
    path: "/users",
    queryParams: {
      $select: "department,id,displayName,jobTitle,mail,userPrincipalName",
      $filter: `startswith(displayName,'${escapedQuery}') or startswith(mail,'${escapedQuery}') or startswith(userPrincipalName,'${escapedQuery}')`,
      $top: "50",
    },
  });

  // Some tenants reject complex /users filters. Retry with displayName-only if needed.
  if (response.status === 400) {
    await response.text();
    response = await get({
      path: "/users",
      queryParams: {
        $select: "department,id,displayName,jobTitle,mail,userPrincipalName",
        $filter: `startswith(displayName,'${escapedQuery}')`,
        $top: "50",
      },
    });
  }

  await failIfNotOk(response, "Searching users");
  const users = await bodyOf<Users>(response);
  return users.value;
}

export async function getRecentUsers(): Promise<User[]> {
  const recentUsersRaw = await LocalStorage.getItem<string>(localStorageKeyRecentUsers);
  if (!recentUsersRaw) {
    return [];
  }

  try {
    const recentUsers = JSON.parse(recentUsersRaw) as User[];
    return Array.isArray(recentUsers) ? recentUsers : [];
  } catch {
    return [];
  }
}

export async function addRecentUser(user: User): Promise<void> {
  const recentUsers = await getRecentUsers();
  const nextRecentUsers = recentUsers.filter((recentUser) => recentUser.id !== user.id);
  nextRecentUsers.unshift(user);
  await LocalStorage.setItem(localStorageKeyRecentUsers, JSON.stringify(nextRecentUsers.slice(0, maxRecentUsers)));
}

export async function getUserPhotoDataUrl(userId: string): Promise<string | undefined> {
  const photoCacheKey = userPhotoStorageKey(userId);
  const cachedPhoto = cache.get(photoCacheKey);
  if (cachedPhoto === "missing") {
    return undefined;
  }
  if (cachedPhoto) {
    return cachedPhoto;
  }

  const response = await get({ path: `/users/${userId}/photo/$value` });

  if (response.status === 404) {
    cache.set(photoCacheKey, "missing");
    return undefined;
  }

  await failIfNotOk(response, "Getting user photo");
  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const imageBuffer = Buffer.from(await response.arrayBuffer());
  const photoDataUrl = `data:${contentType};base64,${imageBuffer.toString("base64")}`;
  cache.set(photoCacheKey, photoDataUrl);
  return photoDataUrl;
}
