import { getClickUpClient } from "../api/clickup";

export default async function ({ teamId }: { teamId: string }) {
  return getClickUpClient().getDocs(teamId);
}
