import { Avatar } from "./avatar";
import { autocomplete, request } from "./request";

export type User = {
  accountId: string;
  avatarUrls?: Avatar;
  displayName: string;
};

export async function getUsers() {
  const result = await request<User[]>("user/assignable/multiProjectSearch?projectKeys=KJCA");
  return result!;
}

export function getMyself() {
  return request<User>("/myself");
}

export async function autocompleteUsers(autocompleteURL: string, query: string) {
  return autocomplete<User[]>(autocompleteURL, { query });
}
