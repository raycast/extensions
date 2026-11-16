import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  environment,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchContributionData, fetchUserProfile, fetchUserRepositories } from "./api/github";
import { ContributionHeatmap } from "./components/ContributionHeatmap";
import { formatOSSInsight } from "./components/OSSInsight";
import { formatRepositories } from "./components/RepositoryList";
import { RepositoryBrowser } from "./components/RepositoryBrowser";
import { formatUserProfile } from "./components/UserProfile";

export default function Command() {
  const { username } = getPreferenceValues<Preferences>();

  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
    revalidate: revalidateProfile,
  } = useCachedPromise(fetchUserProfile, [username], { execute: Boolean(username) });

  const {
    data: repositories,
    isLoading: isReposLoading,
    error: reposError,
    revalidate: revalidateRepositories,
  } = useCachedPromise(fetchUserRepositories, [username], { execute: Boolean(username) });

  const {
    data: contributions,
    isLoading: isContributionsLoading,
    error: contributionsError,
    revalidate: revalidateContributions,
  } = useCachedPromise(fetchContributionData, [username], { execute: Boolean(username) });

  const isLoading = isProfileLoading || isReposLoading || isContributionsLoading;

  const getMarkdown = () => {
    if (!username) {
      return "# ⚠️ GitHub Username Not Set\n\nPlease set your GitHub username in the extension preferences.";
    }

    const sections: string[] = [];
    if (contributions?.contributionCalendar.weeks.length) {
      sections.push(
        ContributionHeatmap({
          weeks: contributions.contributionCalendar.weeks,
          totalContributions: contributions.contributionCalendar.totalContributions,
        }),
      );
    } else if (!contributionsError) {
      sections.push(
        `## Contribution Activity\n\n${
          isContributionsLoading
            ? "The contribution calendar is loading…"
            : "The contribution calendar is currently unavailable."
        }`,
      );
    }
    if (contributionsError)
      sections.push(`The contribution calendar could not be refreshed. ${contributionsError.message}`);

    if (profile) {
      sections.push(formatUserProfile(profile));
    } else if (!profileError) {
      sections.push(isProfileLoading ? "The profile details are loading…" : "The profile details are unavailable.");
    }
    if (profileError) sections.push(`The profile could not be refreshed. ${profileError.message}`);

    if (repositories) {
      sections.push(formatRepositories(repositories));
    } else if (!reposError) {
      sections.push(
        `## Recently Updated Repositories\n\n${isReposLoading ? "The repositories are loading…" : "The repositories are unavailable."}`,
      );
    }
    if (reposError) sections.push(`The repositories could not be refreshed. ${reposError.message}`);

    return sections.join("\n\n");
  };

  return (
    <Detail
      markdown={getMarkdown()}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {profile && <Action.OpenInBrowser url={profile.html_url} title="Open GitHub Profile" />}
          <Action.CopyToClipboard title="Copy Username" content={username} />
          {repositories && repositories.length > 0 && (
            <Action.Push
              title="Browse Repositories"
              icon={Icon.Code}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
              target={<RepositoryBrowser repositories={repositories} />}
            />
          )}
          {profile && (
            <Action.Push
              title="Show Public Activity Charts"
              icon={Icon.BarChart}
              target={
                <Detail
                  navigationTitle={`${profile.login}'s Public Activity`}
                  markdown={formatOSSInsight(profile.id, profile.login, environment.appearance)}
                />
              }
            />
          )}
          <Action
            title="Refresh Profile"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={async () => {
              await Promise.all([revalidateProfile(), revalidateRepositories(), revalidateContributions()]);
            }}
          />
          {profile && <Action.OpenInBrowser title="Open Starred Repositories" url={`${profile.html_url}?tab=stars`} />}
          {profile && (
            <Action.OpenInBrowser
              title="Open Authored Pull Requests"
              url={`https://github.com/search?q=${encodeURIComponent(`is:pr author:${profile.login}`)}&type=pullrequests`}
            />
          )}
          {profile && (
            <Action.OpenInBrowser
              title="Open Authored Issues"
              url={`https://github.com/search?q=${encodeURIComponent(`is:issue author:${profile.login}`)}&type=issues`}
            />
          )}
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
