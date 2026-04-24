import { getPreferenceValues } from "@raycast/api";

interface ExtensionPreferences {
  githubToken?: string;
}

export function getGitHubToken(): string | null {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const token = preferences.githubToken?.trim();
  return token ? token : null;
}
