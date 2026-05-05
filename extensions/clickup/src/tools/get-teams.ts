import { getClickUpClient } from "../api/clickup";

export default async function () {
  return getClickUpClient().getTeams();
}
