import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { List } from "../List";
import { preferences } from "./types";

export const returnLists = async (boardId: string) => {
  const { token, apitoken } = getPreferenceValues<preferences>();
  try {
    const response = await fetch(`https://api.trello.com/1/boards/${boardId}/lists?key=${apitoken}&token=${token}`);

    return (await response.json()) as List[];
  } catch (error) {
    showToast(Toast.Style.Failure, "An error occured", "Could not fetch todos, check your credentials");
    return Promise.resolve([]);
  }
};
