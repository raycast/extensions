import { Action, ActionPanel, Detail, environment, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchContributionData, fetchUserProfile, fetchUserRepositories } from "./api/github";
import { ActivityRepo, ContributionHeatmap } from "./components/ContributionHeatmap";
import { formatRepositories } from "./components/RepositoryList";
import { formatUserProfile } from "./components/UserProfile";

interface Preferences {
  username: string;
}

export default function Command() {
  const { username } = getPreferenceValues<Preferences>();

  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
  } = useCachedPromise(() => fetchUserProfile(username));

  const { data: repositories, isLoading: isReposLoading, error: reposError } = useCachedPromise(fetchUserRepositories);

  const {
    data: contributions,
    isLoading: isContributionsLoading,
    error: contributionsError,
  } = useCachedPromise(() => fetchContributionData(username));

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
**Contribution Activity: total ${contributions.contributionCalendar.totalContributions} in last year**
${ContributionHeatmap({ weeks: contributions.contributionCalendar.weeks })}
`;
    const repositoriesSection = formatRepositories(repositories);

    // Use the dynamically fetched user ID from the profile
    const userId = profile.id;
    console.log(`User ID: ${userId}`);
    const ossInsights = `[![Dashboard stats of @${username}](https://next.ossinsight.io/widgets/official/compose-user-dashboard-stats/thumbnail.png?user_id=${userId}&image_size=auto&color_scheme=${environment.appearance})](https://next.ossinsight.io/widgets/official/compose-user-dashboard-stats?user_id=${userId})`;

    return `# GitHub Profile: ${profile.login}\n${contributionHeatmapSection}\n${userProfileSection}\n${ossInsights}\n${repositoriesSection}\n${ActivityRepo(userId)}`;
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
