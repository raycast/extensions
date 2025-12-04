import { getPreferenceValues } from "@raycast/api";
import { LDFlag } from "../types";

interface LDPreferences {
  apiToken: string;
  projectKey?: string;
  ldApiUrl: string;
}

export function getLDBaseUrl(): string {
  const { ldApiUrl } = getPreferenceValues<LDPreferences>();
  return ldApiUrl?.trim() || "https://app.launchdarkly.com";
}

export function getLDPreferences(): { apiToken: string; projectKey: string } {
  const prefs = getPreferenceValues<LDPreferences>();
  return {
    apiToken: prefs.apiToken,
    projectKey: prefs.projectKey?.trim() || "default",
  };
}

export function getLDUrl(flag: LDFlag): string {
  const { projectKey } = getLDPreferences();
  return `${getLDBaseUrl()}/projects/${projectKey}/flags/${flag.key}/targeting`;
}

export function getLDUrlWithEnvs(flag: LDFlag, environmentOrder: string[], selectedEnv?: string): string {
  const baseUrl = getLDUrl(flag);
  const currentEnvKeys = Object.keys(flag.environments || {});
  const sortedEnvs = currentEnvKeys.sort((a, b) => environmentOrder.indexOf(a) - environmentOrder.indexOf(b));

  let url = baseUrl;
  if (sortedEnvs.length > 0) {
    url += "?" + sortedEnvs.map((env) => `env=${encodeURIComponent(env)}`).join("&");
  }
  if (sortedEnvs.length > 0) {
    const selectedEnvParam = selectedEnv || sortedEnvs[0];
    url += `&selected-env=${encodeURIComponent(selectedEnvParam)}`;
  }
  return url;
}
