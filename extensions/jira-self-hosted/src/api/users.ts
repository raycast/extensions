import { Avatar } from "./avatar";
import { autocomplete, getAuthenticatedUri, request } from "./request";

export type User = {
  name: string;
  avatarUrls?: Avatar;
  displayName: string;
};

export async function getUsers() {
  const result = await request<User[]>("/user/search", { params: { username: ".", maxResults: "200" } });
  if (!result) return [];

  await Promise.all(
    result.map(async (user) => {
      if (user.avatarUrls?.["32x32"]) {
        user.avatarUrls["32x32"] = await getAuthenticatedUri(user.avatarUrls["32x32"], "image/jpeg");
      }
    }),
  );

  return result;
}

export function getMyself() {
  return request<User>("/myself");
}

export async function autocompleteUsers(autocompleteURL: string, query: string) {
  return autocomplete<User[]>(autocompleteURL, { username: query });
}
