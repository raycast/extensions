import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { getUser } from "../api/user";

export function getAuthToken() {
  return getPreferenceValues().vapor_token;
}

export async function getTeamId(): Promise<string> {
  let currentTeamId;
  currentTeamId = await LocalStorage.getItem<string>("current_team");

  if (!currentTeamId) {
    const user = await getUser();
    const teamId = user.current_team_id.toString();
    await LocalStorage.setItem("current_team", teamId);
    currentTeamId = teamId;
  }

  return currentTeamId;
}
