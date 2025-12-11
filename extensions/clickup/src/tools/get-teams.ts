import { getClickUpClient } from "../api/clickup";

export default async function () {
  const client = getClickUpClient();
  return client.getTeams();
}
