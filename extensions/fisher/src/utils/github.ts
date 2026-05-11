import { getPreferenceValues, openExtensionPreferences, showToast, Toast } from "@raycast/api";

const preferences = getPreferenceValues<{ githubToken?: string }>();

export const GITHUB_HEADERS = preferences.githubToken
  ? {
      Authorization: `Bearer ${preferences.githubToken}`,
      Accept: "application/vnd.github+json",
    }
  : {
      Accept: "application/vnd.github+json",
    };

if (!preferences.githubToken) {
  showToast({
    style: Toast.Style.Failure,
    title: "Using GitHub API unauthenticated",
    message: "Add a GitHub API token in preferences to increase rate limit from 60 to 5000 req/h.",
    primaryAction: {
      title: "Open Preferences",
      onAction: () => {
        openExtensionPreferences();
      },
    },
  });
}
