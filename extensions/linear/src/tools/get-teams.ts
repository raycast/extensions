import { Team } from "@linear/sdk";
import { withAccessToken } from "@raycast/utils";

import { getTeams } from "../api/getTeams";
import { linear } from "../api/linearClient";

export type TeamResult = Pick<Team, "id" | "name" | "key" | "icon" | "color">;

export default withAccessToken(linear)(async () => {
  return getTeams();
});
