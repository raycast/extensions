import { getPreferenceValues } from "@raycast/api";

type Preferences = {
  fetchFullTruncatedContent?: boolean;
};

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function shouldFetchFullTruncatedContent(): boolean {
  const { fetchFullTruncatedContent } = getPreferences();
  return fetchFullTruncatedContent !== false;
}
