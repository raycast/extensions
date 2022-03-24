import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "@raycast/api/types/core/preferences";
import fetch from "node-fetch";
import { Board } from "../Board";

export const getBoards = async () => {
  const { token }: Preferences = getPreferenceValues();
  const { apitoken }: Preferences = getPreferenceValues();

  const response = await fetch(
    `https://api.trello.com/1/members/me/boards?key=${apitoken}&token=${token}&organization=true`
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json: any = await response.json();
  return json as Board[];
};
