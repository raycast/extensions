import { SpacesResponse } from "../types/spaces.dt";
import { ClickUpClient } from "../utils/clickUpClient";

export default async function ({ teamId }: { teamId: string }) {
  const res = await ClickUpClient<SpacesResponse>(`/team/${teamId}/space?archived=false`);
  return res.data.spaces;
}
