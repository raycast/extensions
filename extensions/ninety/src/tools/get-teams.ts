import { getAvailableTeams } from "../api/ninety";

/** Returns every Team the user can read and create work for. Use the `id` with other tools. */
export default async function tool() {
  const teams = await getAvailableTeams();
  return teams.map((team) => ({ id: team._id, name: team.name, isMember: team.isMember }));
}
