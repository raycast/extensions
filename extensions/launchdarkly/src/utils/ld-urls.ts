import { getBaseUrl } from "../api/client";
import { sortEnvironmentKeys } from "./environments";

const enc = encodeURIComponent;

export function getProjectUrl(projectKey: string): string {
  return `${getBaseUrl()}/projects/${enc(projectKey)}/flags`;
}

/**
 * Deep link to a flag's targeting page. `envKeys` become `env=` params (in the
 * user's preferred order) and `selectedEnv` (or the first env) is pre-selected.
 */
export function getFlagUrl(
  projectKey: string,
  flagKey: string,
  envKeys: string[] = [],
  environmentOrder: string[] = [],
  selectedEnv?: string,
): string {
  const url = new URL(`${getBaseUrl()}/projects/${enc(projectKey)}/flags/${enc(flagKey)}/targeting`);
  const sorted = sortEnvironmentKeys(envKeys, environmentOrder);
  for (const env of sorted) url.searchParams.append("env", env);
  if (sorted.length > 0) url.searchParams.set("selected-env", selectedEnv ?? sorted[0]);
  return url.toString();
}

export function getAuditLogUrl(projectKey: string, flagKey?: string): string {
  const spec = `proj/${projectKey}:env/*:flag/${flagKey ?? "*"}`;
  return `${getBaseUrl()}/settings/history?spec=${enc(spec)}`;
}
