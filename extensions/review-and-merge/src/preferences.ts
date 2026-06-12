import { getPreferenceValues } from "@raycast/api";
import { SearchScope } from "./lib/searchQueries";

interface Preferences {
  githubToken?: string;
  organization?: string;
  repositories?: string;
}

/** Build the repository/org scope applied to every PR search, from preferences. */
export function getSearchScope(): SearchScope {
  const prefs = getPreferenceValues<Preferences>();
  const organization = prefs.organization?.trim();
  const repositories = prefs.repositories?.trim();
  return {
    organization: organization || undefined,
    repositories: repositories || undefined,
  };
}
