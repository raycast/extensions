import { withAccessToken } from "@raycast/utils";
import { linear } from "../api/linearClient";
import { Team } from "@linear/sdk";
import { getTeams } from "../api/getTeams";

export type TeamResult = Pick<Team, "id" | "name" | "key" | "icon" | "color">;

export default withAccessToken(linear)(async () => {
  return getTeams();
});
