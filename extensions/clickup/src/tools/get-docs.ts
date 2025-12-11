import { getClickUpClient } from "../api/clickup";

export default async function ({ teamId }: { teamId: string }) {
  const client = getClickUpClient();
  return client.getDocs(teamId);
}
