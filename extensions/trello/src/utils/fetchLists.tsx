import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { Preferences } from "@raycast/api/types/core/preferences";
import fetch from "node-fetch";
import { List } from "../List";

export const returnLists = async (boardId: string) => {
  console.log(boardId);
  const { token }: Preferences = getPreferenceValues();
  const { apitoken }: Preferences = getPreferenceValues();
  try {
    const response = await fetch(
      //`https://api.trello.com/1/members/me/boards?key=${apitoken}&token=${token}&organization=true`
      `https://api.trello.com/1/boards/${boardId}/lists?key=${apitoken}&token=${token}`
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await response.json();
    console.log(json);
    return json as List[];
  } catch (error) {
    showToast(Toast.Style.Failure, "An error occured", "Could not fetch todos, check your credentials");
    return Promise.resolve([]);
  }
};
