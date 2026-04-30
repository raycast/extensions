import { Color, getPreferenceValues, Icon, Image, open } from "@raycast/api";

import { MenuBarItem, MenuBarItemConfigureCommand, MenuBarRoot, MenuBarSection } from "./components/Menu";
import { withGitHubClient } from "./helpers/withGithubClient";
import { useViewerStats } from "./hooks/useViewerStats";

type TitleMetric = "followers" | "stars" | "prsOpen" | "issuesOpen" | "none";

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function MyStatsMenu() {
  const { titleMetric, useAvatarAsIcon } = getPreferenceValues<Preferences.MyStatsMenu>();
  const { data, isLoading, error } = useViewerStats();

  const metricValue = (metric: TitleMetric): number | undefined => {
    if (!data) return undefined;
    switch (metric) {
      case "followers":
        return data.social.followers;
      case "stars":
        return data.social.starsReceived;
      case "prsOpen":
        return data.activity.prsOpen;
      case "issuesOpen":
        return data.activity.issuesOpen;
      default:
        return undefined;
    }
  };

  const title = (() => {
    if (titleMetric === "none") return undefined;
    const value = metricValue(titleMetric);
    return value === undefined ? undefined : formatNumber(value);
  })();

  const login = data?.profile.login;
  const profileUrl = data?.profile.url ?? (login ? `https://github.com/${login}` : "https://github.com");
  const searchUrl = (type: "pullrequests" | "issues" | "commits", query: string) =>
    `https://github.com/search?type=${type}&q=${encodeURIComponent(query)}`;
  const partialTooltip = "Aggregated over the top 100 owned repositories by stars";

  const menuBarIcon: Image.ImageLike =
    useAvatarAsIcon && data?.profile.avatarUrl
      ? { source: data.profile.avatarUrl, mask: Image.Mask.Circle }
      : { source: "github.svg", tintColor: Color.PrimaryText };

  return (
    <MenuBarRoot
      title={title}
      icon={menuBarIcon}
      tooltip={data?.profile.name ? `${data.profile.name} (@${data.profile.login})` : "GitHub Stats"}
      isLoading={isLoading}
      error={error?.message}
    >
      {data && (
        <>
          <MenuBarSection>
            <MenuBarItem
              title={data.profile.name ?? data.profile.login}
              subtitle={`@${data.profile.login}`}
              icon={{ source: data.profile.avatarUrl, mask: Image.Mask.Circle }}
              tooltip={data.profile.bio ?? undefined}
              onAction={() => open(profileUrl)}
            />
          </MenuBarSection>

          <MenuBarSection title="Social">
            <MenuBarItem
              title="Followers"
              subtitle={formatNumber(data.social.followers)}
              icon={Icon.Person}
              onAction={() => open(`${profileUrl}?tab=followers`)}
            />
            <MenuBarItem
              title="Following"
              subtitle={formatNumber(data.social.following)}
              icon={Icon.PersonCircle}
              onAction={() => open(`${profileUrl}?tab=following`)}
            />
            <MenuBarItem
              title="Stars Received"
              subtitle={
                data.social.ownedReposPartial
                  ? `${formatNumber(data.social.starsReceived)}+`
                  : formatNumber(data.social.starsReceived)
              }
              icon={Icon.Star}
              tooltip={data.social.ownedReposPartial ? partialTooltip : undefined}
              onAction={() => open(`${profileUrl}?tab=repositories`)}
            />
            <MenuBarItem
              title="Starred Repositories"
              subtitle={formatNumber(data.social.starred)}
              icon={Icon.Bookmark}
              onAction={() => open(`${profileUrl}?tab=stars`)}
            />
          </MenuBarSection>

          <MenuBarSection title="Activity">
            <MenuBarItem
              title="PRs Authored"
              subtitle={formatNumber(data.activity.prsAuthored)}
              icon={{ source: "pull-request-open.svg", tintColor: Color.PrimaryText }}
              onAction={() => open(searchUrl("pullrequests", `is:pr author:${data.profile.login}`))}
            />
            <MenuBarItem
              title="PRs Merged"
              subtitle={`${formatNumber(data.activity.prsMerged)} (${data.activity.mergeRate}%)`}
              icon={{ source: "pull-request-merged.svg", tintColor: Color.PrimaryText }}
              tooltip={`${data.activity.mergeRate}% of authored PRs were merged`}
              onAction={() => open(searchUrl("pullrequests", `is:pr is:merged author:${data.profile.login}`))}
            />
            <MenuBarItem
              title="Issues Authored"
              subtitle={formatNumber(data.activity.issuesAuthored)}
              icon={{ source: "issue-open.svg", tintColor: Color.PrimaryText }}
              onAction={() => open(searchUrl("issues", `is:issue author:${data.profile.login}`))}
            />
            <MenuBarItem
              title="Commits (last year)"
              subtitle={formatNumber(data.activity.commitsYear)}
              icon={{ source: "commit.svg", tintColor: Color.PrimaryText }}
              onAction={() => open(searchUrl("commits", `author:${data.profile.login}`))}
            />
          </MenuBarSection>

          <MenuBarSection title="Operational">
            <MenuBarItem
              title="Public Repos"
              subtitle={formatNumber(data.operational.publicRepos)}
              icon={Icon.Folder}
              onAction={() => open(`${profileUrl}?tab=repositories`)}
            />
            <MenuBarItem
              title="Forks Received"
              subtitle={
                data.social.ownedReposPartial
                  ? `${formatNumber(data.social.forksReceived)}+`
                  : formatNumber(data.social.forksReceived)
              }
              icon={{ source: "branch.svg", tintColor: Color.PrimaryText }}
              tooltip={data.social.ownedReposPartial ? partialTooltip : undefined}
              onAction={() => open(`${profileUrl}?tab=repositories`)}
            />
            <MenuBarItem
              title="Open PRs"
              subtitle={formatNumber(data.activity.prsOpen)}
              icon={{ source: "pull-request-open.svg", tintColor: Color.PrimaryText }}
              onAction={() => open(searchUrl("pullrequests", `is:pr is:open author:${data.profile.login}`))}
            />
            <MenuBarItem
              title="Open Issues"
              subtitle={formatNumber(data.activity.issuesOpen)}
              icon={{ source: "issue-open.svg", tintColor: Color.PrimaryText }}
              onAction={() => open(searchUrl("issues", `is:issue is:open author:${data.profile.login}`))}
            />
          </MenuBarSection>

          {data.organizations.length > 0 && (
            <MenuBarSection title="Organizations">
              {data.organizations.map((org) => (
                <MenuBarItem
                  key={org.id}
                  title={org.name ?? org.login}
                  subtitle={org.name ? `@${org.login}` : undefined}
                  icon={{ source: org.avatarUrl, mask: Image.Mask.Circle }}
                  onAction={() => open(org.url)}
                />
              ))}
            </MenuBarSection>
          )}
        </>
      )}

      <MenuBarSection>
        <MenuBarItem
          title="Open Profile on GitHub"
          icon={Icon.Globe}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => open(profileUrl)}
        />
        <MenuBarItemConfigureCommand />
      </MenuBarSection>
    </MenuBarRoot>
  );
}

export default withGitHubClient(MyStatsMenu);
