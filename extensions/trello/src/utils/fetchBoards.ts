import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { Board } from "../Board";
import { preferences } from "./types";

export const returnBoards = async () => {
  const { token, apitoken, closedboards } = getPreferenceValues<preferences>();

  try {
    const response = await fetch(
      `https://api.trello.com/1/members/me/boards?key=${apitoken}&token=${token}&organization=true&filter=${
        closedboards ? "all" : "open"
      }`,
    );
    return (await response.json()) as Board[];
  } catch (error) {
    showToast(Toast.Style.Failure, "An error occured", "Could not fetch todos, check your credentials");
    return Promise.resolve([]);
  }
};
