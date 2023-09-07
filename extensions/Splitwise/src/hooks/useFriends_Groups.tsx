import { useFetch } from "@raycast/utils";
import { HEADER } from "./userPreferences";
import { GetFriends, GetGroups, Friend, Group, ExpenseParams, Body } from "../types/friends_groups.types";
import got from "got";

export function getFriends(): [Friend[], boolean] {
  const friendsResponse = useFetch<GetFriends>("https://secure.splitwise.com/api/v3.0/get_friends", HEADER);

  const friends = friendsResponse.data?.friends || [];
  const loadingFriends = friendsResponse.isLoading;

  return [friends, loadingFriends];
}

export function getGroups(): [Group[], boolean] {
  const groupsResponse = useFetch<GetGroups>("https://secure.splitwise.com/api/v3.0/get_groups", HEADER);

  const groups = groupsResponse.data?.groups.filter((group) => group.id !== 0) || [];
  const loadingGroups = groupsResponse.isLoading;

  return [groups, loadingGroups];
}

export async function postExpense(paramsJson: ExpenseParams) {
  return got.post<Body>("https://secure.splitwise.com/api/v3.0/parse_sentence", {
    headers: HEADER.headers,
    json: paramsJson,
    responseType: "json",
  });
}
