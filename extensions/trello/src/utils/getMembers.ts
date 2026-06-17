import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { Member } from "../Member";
import { preferences } from "./types";

export const getMembers = async (boardId: string) => {
  const { token, apitoken } = getPreferenceValues<preferences>();
  try {
    const response = await fetch(`https://api.trello.com/1/boards/${boardId}/members?key=${apitoken}&token=${token}`);

    return (await response.json()) as Member[];
  } catch (error) {
    showToast(Toast.Style.Failure, "An error occured", "Could not fetch members, check your credentials");
    return Promise.resolve([]);
  }
};
