import { useFetch } from "@raycast/utils";
import { personalAccessToken } from "./preferences";
import { GetFriends, GetGroups, Friend, Group, ExpenseParams, Body } from "./types";
import got from "got";

const OPTIONS = {
  headers: {
    Accept: "application/json",
    Authorization: `Bearer ${personalAccessToken}`,
  },
};

export function getFriends(): [Friend[], boolean] {
  const friendsResponse = useFetch<GetFriends>("https://secure.splitwise.com/api/v3.0/get_friends", OPTIONS);

  const friends = friendsResponse.data?.friends || [];
  const loadingFriends = friendsResponse.isLoading;

  return [friends, loadingFriends];
}

export function getGroups(): [Group[], boolean] {
  const groupsResponse = useFetch<GetGroups>("https://secure.splitwise.com/api/v3.0/get_groups", OPTIONS);

  const groups = groupsResponse.data?.groups.filter((group) => group.id !== 0) || [];
  const loadingGroups = groupsResponse.isLoading;

  return [groups, loadingGroups];
}

export async function postExpense(paramsJson: ExpenseParams) {
  return got.post<Body>("https://secure.splitwise.com/api/v3.0/parse_sentence", {
    headers: OPTIONS.headers,
    json: paramsJson,
    responseType: "json",
  });
}
