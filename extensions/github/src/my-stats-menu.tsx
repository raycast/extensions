import { Color, getPreferenceValues, Icon, Image, open } from "@raycast/api";
import { formatDistanceToNowStrict } from "date-fns";

import {
  MenuBarItem,
  MenuBarItemConfigureCommand,
  MenuBarRoot,
  MenuBarSection,
  MenuBarSubmenu,
} from "./components/Menu";
import { IssueState, PullRequestState } from "./generated/graphql";
import { withGitHubClient } from "./helpers/withGithubClient";
import { useStarsTracker } from "./hooks/useStarsTracker";
import { useViewerStats } from "./hooks/useViewerStats";

type TitleMetric = "followers" | "stars" | "prsOpen" | "issuesOpen" | "none";

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function formatResetAt(resetAt: string): string {
  const date = new Date(resetAt);
  if (Number.isNaN(date.getTime())) return "soon";
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return "now";
  return `in ${formatDistanceToNowStrict(date)}`;
}

function prStateIcon(state: PullRequestState): Image.ImageLike {
  switch (state) {
    case PullRequestState.Open:
      return { source: "pull-request-open.svg", tintColor: Color.Green };
    case PullRequestState.Merged:
      return { source: "pull-request-merged.svg", tintColor: Color.Purple };
    case PullRequestState.Closed:
      return { source: "pull-request-closed.svg", tintColor: Color.Red };
  }
}

function issueStateIcon(state: IssueState): Image.ImageLike {
  switch (state) {
    case IssueState.Open:
      return { source: "issue-open.svg", tintColor: Color.Green };
    case IssueState.Closed:
      return { source: "issue-closed.svg", tintColor: Color.Red };
  }
}

function MyStatsMenu() {
  const { titleMetric, useAvatarAsIcon, notifyOnNewStars } = getPreferenceValues<Preferences.MyStatsMenu>();
  const { data, isLoading, error } = useViewerStats();
  const { totalNewStars, perRepoNew, markRepoSeen, markAllSeen } = useStarsTracker(
    data?.ownedReposBreakdown,
    notifyOnNewStars,
  );

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
      case "none":
        return undefined;
    }
  };

  const title = (() => {
    if (notifyOnNewStars && totalNewStars > 0) return `★+${totalNewStars}`;
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

          {notifyOnNewStars && perRepoNew.length > 0 && (
            <MenuBarSection title={`What's New · +${totalNewStars} ★`}>
              {perRepoNew.map((repo) => (
                <MenuBarItem
                  key={repo.id}
                  title={repo.nameWithOwner}
                  subtitle={`+${repo.delta} ★ (now ${formatNumber(repo.current)})`}
                  icon={{ source: Icon.Star, tintColor: Color.Yellow }}
                  onAction={async () => {
                    await open(`${repo.url}/stargazers`);
                    await markRepoSeen(repo.id);
                  }}
                />
              ))}
              <MenuBarItem
                title="Mark All as Seen"
                icon={Icon.Check}
                shortcut={{ modifiers: ["cmd"], key: "k" }}
                onAction={markAllSeen}
              />
            </MenuBarSection>
          )}

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
            <MenuBarSubmenu
              title="PRs Authored"
              subtitle={formatNumber(data.activity.prsAuthored)}
              icon={{ source: "pull-request-open.svg", tintColor: Color.PrimaryText }}
            >
              {data.recent?.pullRequests && data.recent.pullRequests.length > 0 ? (
                data.recent.pullRequests.map((pr) => (
                  <MenuBarItem
                    key={pr.id}
                    title={`#${pr.number} ${pr.title}`}
                    subtitle={pr.repository.nameWithOwner}
                    icon={prStateIcon(pr.state)}
                    onAction={() => open(pr.url)}
                  />
                ))
              ) : (
                <MenuBarItem title="No recent pull requests" icon={Icon.Info} />
              )}
              <MenuBarItem
                title="View All Authored PRs"
                icon={Icon.MagnifyingGlass}
                onAction={() => open(searchUrl("pullrequests", `is:pr author:${data.profile.login}`))}
              />
            </MenuBarSubmenu>
            <MenuBarItem
              title="PRs Merged"
              subtitle={`${formatNumber(data.activity.prsMerged)} (${data.activity.mergeRate}%)`}
              icon={{ source: "pull-request-merged.svg", tintColor: Color.PrimaryText }}
              tooltip={`${data.activity.mergeRate}% of authored PRs were merged`}
              onAction={() => open(searchUrl("pullrequests", `is:pr is:merged author:${data.profile.login}`))}
            />
            <MenuBarSubmenu
              title="Issues Authored"
              subtitle={formatNumber(data.activity.issuesAuthored)}
              icon={{ source: "issue-open.svg", tintColor: Color.PrimaryText }}
            >
              {data.recent?.issues && data.recent.issues.length > 0 ? (
                data.recent.issues.map((issue) => (
                  <MenuBarItem
                    key={issue.id}
                    title={`#${issue.number} ${issue.title}`}
                    subtitle={issue.repository.nameWithOwner}
                    icon={issueStateIcon(issue.state)}
                    onAction={() => open(issue.url)}
                  />
                ))
              ) : (
                <MenuBarItem title="No recent issues" icon={Icon.Info} />
              )}
              <MenuBarItem
                title="View All Authored Issues"
                icon={Icon.MagnifyingGlass}
                onAction={() => open(searchUrl("issues", `is:issue author:${data.profile.login}`))}
              />
            </MenuBarSubmenu>
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
            <MenuBarSubmenu
              title="Open PRs"
              subtitle={formatNumber(data.activity.prsOpen)}
              icon={{ source: "pull-request-open.svg", tintColor: Color.Green }}
            >
              {data.recent?.openPullRequests && data.recent.openPullRequests.length > 0 ? (
                data.recent.openPullRequests.map((pr) => (
                  <MenuBarItem
                    key={pr.id}
                    title={`#${pr.number} ${pr.title}`}
                    subtitle={pr.repository.nameWithOwner}
                    icon={{ source: "pull-request-open.svg", tintColor: Color.Green }}
                    onAction={() => open(pr.url)}
                  />
                ))
              ) : (
                <MenuBarItem title="No open pull requests" icon={Icon.Info} />
              )}
              <MenuBarItem
                title="View All Open PRs"
                icon={Icon.MagnifyingGlass}
                onAction={() => open(searchUrl("pullrequests", `is:pr is:open author:${data.profile.login}`))}
              />
            </MenuBarSubmenu>
            <MenuBarSubmenu
              title="Open Issues"
              subtitle={formatNumber(data.activity.issuesOpen)}
              icon={{ source: "issue-open.svg", tintColor: Color.Green }}
            >
              {data.recent?.openIssues && data.recent.openIssues.length > 0 ? (
                data.recent.openIssues.map((issue) => (
                  <MenuBarItem
                    key={issue.id}
                    title={`#${issue.number} ${issue.title}`}
                    subtitle={issue.repository.nameWithOwner}
                    icon={{ source: "issue-open.svg", tintColor: Color.Green }}
                    onAction={() => open(issue.url)}
                  />
                ))
              ) : (
                <MenuBarItem title="No open issues" icon={Icon.Info} />
              )}
              <MenuBarItem
                title="View All Open Issues"
                icon={Icon.MagnifyingGlass}
                onAction={() => open(searchUrl("issues", `is:issue is:open author:${data.profile.login}`))}
              />
            </MenuBarSubmenu>
          </MenuBarSection>

          {data.organizations.length > 0 && (
            <MenuBarSection title="Organizations">
              {data.organizations.map((org) => (
                <MenuBarSubmenu
                  key={org.id}
                  title={org.name ?? org.login}
                  icon={{ source: org.avatarUrl, mask: Image.Mask.Circle }}
                >
                  <MenuBarItem
                    title="Open Profile"
                    subtitle={`@${org.login}`}
                    icon={Icon.Globe}
                    onAction={() => open(org.url)}
                  />
                  <MenuBarItem
                    title="Repositories"
                    icon={Icon.Folder}
                    onAction={() => open(`https://github.com/orgs/${org.login}/repositories`)}
                  />
                  <MenuBarItem
                    title="People"
                    icon={Icon.PersonCircle}
                    onAction={() => open(`https://github.com/orgs/${org.login}/people`)}
                  />
                  <MenuBarItem
                    title="Projects"
                    icon={Icon.Goal}
                    onAction={() => open(`https://github.com/orgs/${org.login}/projects`)}
                  />
                </MenuBarSubmenu>
              ))}
            </MenuBarSection>
          )}

          {data.rateLimit && (
            <MenuBarSection title="API">
              <MenuBarItem
                title="Rate Limit"
                subtitle={`${formatNumber(data.rateLimit.remaining)} / ${formatNumber(data.rateLimit.limit)}`}
                icon={Icon.Gauge}
                tooltip={`Resets ${formatResetAt(data.rateLimit.resetAt)}`}
                onAction={() => open("https://docs.github.com/en/rest/rate-limit")}
              />
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
