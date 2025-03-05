import { Action, ActionPanel, Detail, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchContributionData, fetchUserProfile, fetchUserRepositories } from "./api/github";
import { ContributionHeatmap } from "./components/ContributionHeatmap";
import { formatRepositories } from "./components/RepositoryList";
import { formatUserProfile } from "./components/UserProfile";

interface Preferences {
  username: string;
}

export default function Command() {
  const { username } = getPreferenceValues<Preferences>();

  const { data: profile, isLoading: isProfileLoading, error: profileError } = useCachedPromise(fetchUserProfile);

  const { data: repositories, isLoading: isReposLoading, error: reposError } = useCachedPromise(fetchUserRepositories);

  const {
    data: contributions,
    isLoading: isContributionsLoading,
    error: contributionsError,
  } = useCachedPromise(fetchContributionData);

  const isLoading = isProfileLoading || isReposLoading || isContributionsLoading;
  const error = profileError || reposError || contributionsError;

  const getMarkdown = () => {
    if (!username) {
      return "# ⚠️ GitHub Username Not Set\n\nPlease set your GitHub username in the extension preferences.";
    }

    if (error) {
      return `# Error\n\n${error.message}`;
    }

    if (isLoading || !profile || !repositories || !contributions) {
      return "# Loading GitHub Profile...";
    }

    const userProfileSection = formatUserProfile(profile);
    const contributionHeatmapSection = `
**Contribution Activity: total ${contributions.contributionCalendar.totalContributions} last year**
${ContributionHeatmap({ weeks: contributions.contributionCalendar.weeks })}
`;
    const repositoriesSection = formatRepositories(repositories);

    return `# GitHub Profile: ${profile.login}\n${contributionHeatmapSection}\n${userProfileSection}\n${repositoriesSection}`;
  };

  return (
    <Detail
      markdown={getMarkdown()}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {profile && <Action.OpenInBrowser url={profile.html_url} title="Open GitHub Profile" />}
          <Action.CopyToClipboard title="Copy Username" content={username} />
        </ActionPanel>
      }
    />
  );
}
