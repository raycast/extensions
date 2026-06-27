import { createEnvironmentVariable } from "../vercel";
import type { CreateEnvironment } from "../types";

const DEFAULT_TARGETS = ["production", "preview", "development"] as const;

type Input = {
  /* The Vercel project to add the environment variable to */
  projectId: string;
  /* The environment variable to add */
  envVar: {
    key: string;
    value: string;
    type: "system" | "secret" | "encrypted" | "plain";
  };
  /* Comma-separated deployment targets: production, preview, development */
  target?: string;
  /* The Vercel team associated with the project */
  teamId?: string;
};

export default async function addEnvironmentVariable({ projectId, envVar, target, teamId }: Input) {
  const targets = (target ?? DEFAULT_TARGETS.join(","))
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean) as NonNullable<CreateEnvironment["target"]>;

  return createEnvironmentVariable(projectId, { ...envVar, target: targets }, teamId);
}
