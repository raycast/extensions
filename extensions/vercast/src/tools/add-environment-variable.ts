import { createEnvironmentVariable } from "../vercel";

const DEFAULT_TARGETS = ["production", "preview", "development"] as const;
const VALID_TARGETS = new Set<string>(DEFAULT_TARGETS);

type EnvironmentTargetValue = (typeof DEFAULT_TARGETS)[number];
type EnvironmentTarget = EnvironmentTargetValue[] | EnvironmentTargetValue;
type EnvironmentVariableType = "system" | "secret" | "encrypted" | "plain";

type Input = {
  /* The Vercel project to add the environment variable to */
  projectId: string;
  /* The environment variable to add */
  envVar: {
    key: string;
    value: string;
    type: EnvironmentVariableType;
    target?: "production" | "preview" | "development";
  };
  /* Comma-separated deployment targets: production, preview, development */
  target?: string;
  /* The Vercel team associated with the project */
  teamId?: string;
};

function isEnvironmentTargetValue(value: string): value is EnvironmentTargetValue {
  return VALID_TARGETS.has(value);
}

function parseTargets(target?: string, envVarTarget?: EnvironmentTarget): EnvironmentTargetValue[] {
  const targetValues = target
    ? target.split(",")
    : Array.isArray(envVarTarget)
      ? envVarTarget
      : envVarTarget
        ? [envVarTarget]
        : [...DEFAULT_TARGETS];

  return targetValues.map((value) => {
    const normalizedValue = value.trim();

    if (!isEnvironmentTargetValue(normalizedValue)) {
      throw new Error(`Invalid environment variable target: ${normalizedValue}`);
    }

    return normalizedValue;
  });
}

export default async function addEnvironmentVariable({ projectId, envVar, target, teamId }: Input) {
  const targets = parseTargets(target, envVar.target as EnvironmentTarget | undefined);

  return createEnvironmentVariable(projectId, { ...envVar, target: targets }, teamId);
}
