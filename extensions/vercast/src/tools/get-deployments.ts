import { fetchDeployments } from "../vercel";

type Input = {
  teamId?: string;
};

export default async function getDeployments({ teamId }: Input) {
  return fetchDeployments(teamId ?? undefined, 100, 100);
}
