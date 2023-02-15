import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { TrelloFetchResponse } from "../trelloResponse.model";
import { preferences } from "./types";

const { token, apitoken, username } = getPreferenceValues<preferences>();

export const returnTodos = async (searchTerm: string): Promise<TrelloFetchResponse> => {
  try {
    if (searchTerm != "") {
      const response = await fetch(
        `https://api.trello.com/1/search?filter=visible&key=${apitoken}&token=${token}&modelTypes=cards&query=${searchTerm}`
      );

      return (await response.json()) as TrelloFetchResponse;
    } else {
      try {
        const response = await fetch(
          `https://api.trello.com/1/members/${username}/cards?filter=visible&key=${apitoken}&token=${token}`
        );

        return (await response.json()) as TrelloFetchResponse;
      } catch (error) {
        showToast(Toast.Style.Failure, "An error occured", "Could not fetch todos, check your credentials");
        return Promise.resolve([]);
      }
    }
  } catch (error) {
    showToast(Toast.Style.Failure, "An error occured", "Could not fetch todos, check your credentials");
    return Promise.resolve([]);
  }
};
