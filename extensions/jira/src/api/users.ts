import { Avatar } from "./avatar";
import { autocomplete, request } from "./request";

type AccountType = "atlassian" | "app" | "customer";

export type User = {
  accountId: string;
  accountType: AccountType;
  avatarUrls?: Avatar;
  displayName: string;
};

export async function getUsers() {
  const result = await request<User[]>("/users/search");
  return result?.filter((user) => user.accountType === "atlassian");
}

export function getMyself() {
  return request<User>("/myself");
}

export async function autocompleteUsers(autocompleteURL: string, query: string) {
  return autocomplete<User[]>(autocompleteURL, { query });
}
