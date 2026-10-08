import { fetchProjects } from "../vercel";

type Input = {
  teamId?: string;
};

export default async function getProjects({ teamId }: Input) {
  return fetchProjects(teamId);
}
