import { getPreferenceValues } from "@raycast/api";

export function getGitpodEndpoint(): string {
  const { gitpodUrl } = getPreferenceValues();
  return gitpodUrl;
}
