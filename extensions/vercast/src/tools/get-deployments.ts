import { fetchDeployments, fetchTeams } from "../vercel";

type Input = {
  teamId?: string;
};

async function getTeamSlug(teamId?: string) {
  if (!teamId) {
    return undefined;
  }

  try {
    return (await fetchTeams()).find((team) => team.id === teamId)?.slug;
  } catch (error) {
    console.error(error);
    return undefined;
  }
}

export default async function getDeployments({ teamId }: Input) {
  const slug = await getTeamSlug(teamId);

  return fetchDeployments(teamId ?? undefined, 100, 100, slug);
}
