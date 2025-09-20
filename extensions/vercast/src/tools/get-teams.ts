import { fetchTeams } from "../vercel";

export default async function getTeams() {
  return fetchTeams();
}
