// src/lib/env.ts
export type Environment = "prod" | "staging" | "dev";

export interface EnvironmentConfig {
  baseUrl: string;
  /**
   * The CLI auth file's profile key for this environment. The CLI's
   * AuthManager only knows two profile keys, "prod" and "dev". For staging
   * it falls back to the "prod" profile inside cli-auth-staging.json.
   */
  profile: "prod" | "dev";
}

const ENVIRONMENTS: Record<Environment, EnvironmentConfig> = {
  prod: { baseUrl: "https://niteshift.dev", profile: "prod" },
  staging: { baseUrl: "https://stage.niteshift.dev", profile: "prod" },
  dev: { baseUrl: "https://niteshift.local", profile: "dev" },
};

export function getEnvironmentConfig(env: Environment): EnvironmentConfig {
  return ENVIRONMENTS[env];
}
