import { TeamsResponse } from "../types/teams.dt";
import { ClickUpClient } from "../utils/clickUpClient";

export default async function () {
  const res = await ClickUpClient<TeamsResponse>("/team");
  return res.data.teams;
}
