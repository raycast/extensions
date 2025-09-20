import { deleteEnvironmentVariableById } from "../vercel";
import getEnvironmentVariables from "./get-environment-variables";

type Input = {
  projectId: string;
  envId: string;
  teamId: string;
};

export default async function deleteEnvironmentVariable({ projectId, envId }: Input) {
  return deleteEnvironmentVariableById(projectId, envId);
}

export const confirmation = async ({ projectId, envId, teamId }: Input) => {
  const envVariables = await getEnvironmentVariables({ projectId, teamId });
  const envVariable = envVariables.find((env) => env.id === envId);
  return {
    message: `Are you sure you want to delete the environment variable?`,
    info: [{ name: envVariable?.key, value: envVariable?.value }],
  };
};
