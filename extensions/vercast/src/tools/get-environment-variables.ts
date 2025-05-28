import { fetchEnvironmentVariables } from "../vercel";

type Input = {
  projectId: string;
  teamId: string;
};

export default async function getEnvironmentVariables({ projectId, teamId }: Input) {
  return fetchEnvironmentVariables(projectId, teamId);
}
