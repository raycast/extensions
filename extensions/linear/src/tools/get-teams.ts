import { Team } from "@linear/sdk";

import { getTeams } from "../api/getTeams";

import { resolveToolClient, withToolAuth } from "./resolveToolWorkspace";

export type TeamResult = Pick<Team, "id" | "name" | "key" | "icon" | "color">;

type Input = {
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};

export default withToolAuth(async ({ workspaceId }: Input) => {
  const client = await resolveToolClient(workspaceId);
  return getTeams(undefined, client);
});
