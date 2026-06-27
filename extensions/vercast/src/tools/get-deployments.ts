import { fetchDeployments, fetchTeams } from "../vercel";

type Input = {
  teamId?: string;
};

export default async function getDeployments({ teamId }: Input) {
  const slug = teamId ? (await fetchTeams()).find((team) => team.id === teamId)?.slug : undefined;

  return fetchDeployments(teamId ?? undefined, 100, 100, slug);
}
