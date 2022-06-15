import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { Preferences } from "@raycast/api/types/core/preferences";
import fetch from "node-fetch";
import { Board } from "../Board";

export const returnBoards = async () => {
  const { token }: Preferences = getPreferenceValues();
  const { apitoken }: Preferences = getPreferenceValues();
  try {
    const response = await fetch(
      `https://api.trello.com/1/members/me/boards?key=${apitoken}&token=${token}&organization=true`
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await response.json();
    return json as Board[];
  } catch (error) {
    showToast(Toast.Style.Failure, "An error occured", "Could not fetch todos, check your credentials");
    return Promise.resolve([]);
  }
};
