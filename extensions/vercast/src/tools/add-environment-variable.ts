import { createEnvironmentVariable } from "../vercel";

type Input = {
  /* The Vercel project to add the environment variable to */
  projectId: string;
  /* The environment variable to add */
  envVar: {
    key: string;
    value: string;
    type: "system" | "secret" | "encrypted" | "plain";
    target: ("production" | "preview" | "development" | "preview" | "development")[];
  };
  /* The Vercel team associated with the project */
  teamId?: string;
};

export default async function addEnvironmentVariable({ projectId, envVar, teamId }: Input) {
  return createEnvironmentVariable(projectId, envVar, teamId);
}
