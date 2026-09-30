import { getPreferenceValues } from "@raycast/api";

export function useGithubToken(): string {
  return getPreferenceValues<{
    githubToken: string;
  }>().githubToken;
}
