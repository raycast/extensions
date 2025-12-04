import { Color, getPreferenceValues, Icon, launchCommand, LaunchType, open } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useMemo } from "react";

import {
  getBoundedPreferenceNumber,
  MenuBarItem,
  MenuBarItemConfigureCommand,
  MenuBarRoot,
  MenuBarSection,
} from "./components/Menu";
import { SortMenuBarAction } from "./components/SortAction";
import { PullRequestFieldsFragment } from "./generated/graphql";
import { PR_DEFAULT_SORT_QUERY, PR_SORT_TYPES_TO_QUERIES } from "./helpers/pull-request";
import { withGitHubClient } from "./helpers/withGithubClient";
import { useMyPullRequests } from "./hooks/useMyPullRequests";

async function launchMyPullRequestsCommand(): Promise<void> {
  return launchCommand({ name: "my-pull-requests", type: LaunchType.UserInitiated });
}

function getMaxPullRequestsPreference(): number {
  return getBoundedPreferenceNumber({ name: "maxitems" });
}

function getPullRequestStatusIcon(pr: PullRequestFieldsFragment): Icon | string {
  const pullRequestStatus = pr.commits.nodes ? pr.commits.nodes[0]?.commit.statusCheckRollup?.state : null;
  switch (pullRequestStatus) {
    case "SUCCESS":
      return Icon.Check;
    case "ERROR":
    case "FAILURE":
      return Icon.Xmark;
    case "PENDING":
      return Icon.Clock;
    default:
      return "pull-request-open.svg";
  }
}

function MyPullRequestsMenu() {
  const preferences = getPreferenceValues<Preferences.MyPullRequestsMenu>();
  const {
    showtext,
    includeAssigned,
    includeMentioned,
    includeReviewed,
    includeReviewRequests,
    includeRecentlyClosed,
    useUnreadIndicator,
    repositoryFilterMode,
    repositoryList,
  } = preferences;

  const repositoryListArray = useMemo(() => {
    if (!repositoryList) return [];
    return repositoryList
      .split(",")
      .map((repo) => repo.trim())
      .filter((repo) => repo.length > 0);
  }, [repositoryList]);

  const [sortQuery, setSortQuery] = useCachedState<string>("sort-query", PR_DEFAULT_SORT_QUERY, {
    cacheNamespace: "github-my-pr-menu",
  });

  const { data: unfilteredSections, isLoading } = useMyPullRequests({
    repository: null,
    sortQuery,
    includeAssigned,
    includeMentioned,
    includeRecentlyClosed,
    includeReviewRequests,
    includeReviewed,
    filterMode: repositoryFilterMode,
    repositoryList: repositoryListArray,
  });

  const sections = useMemo(() => {
    if (!unfilteredSections || repositoryFilterMode === "all" || repositoryListArray.length === 0) {
      return unfilteredSections;
    }

    return unfilteredSections.map((section) => {
      const filteredPullRequests = section.pullRequests?.filter((pr) => {
        if (!pr) return false;

        const repoFullName = pr.repository.nameWithOwner;

        const isInList = repositoryListArray.some((repo) => repo.toLowerCase() === repoFullName.toLowerCase());

        return repositoryFilterMode === "include" ? isInList : !isInList;
      });

      return {
        ...section,
        pullRequests: filteredPullRequests,
      };
    });
  }, [unfilteredSections, repositoryListArray, repositoryFilterMode]);

  const prCount = sections?.reduce((acc, section) => acc + (section.pullRequests ?? []).length, 0);

  return (
    <MenuBarRoot
      title={showtext ? `${prCount}` : undefined}
      icon={{
        source: `pull-request-open${useUnreadIndicator && prCount > 0 ? "-unread" : ""}.svg`,
        tintColor: Color.PrimaryText,
      }}
      isLoading={isLoading}
    >
      {sections?.map((section) => {
        return (
          <MenuBarSection
            key={section.type}
            title={section.type}
            maxChildren={getMaxPullRequestsPreference()}
            moreElement={(hidden) => (
              <MenuBarItem title={`... ${hidden} more`} onAction={() => launchMyPullRequestsCommand()} />
            )}
            emptyElement={<MenuBarItem title="No Pull Requests" />}
          >
            {section.pullRequests?.map((i) => {
              // GitHub had an outage on Nov. 3rd that caused the returned PRs to be null
              // This corrupted the cache so let's check first if there's a PR before rendering
              if (!i) return null;
              return (
                <MenuBarItem
                  key={i.id}
                  title={`#${i.number} ${i.title}`}
                  icon={{ source: getPullRequestStatusIcon(i), tintColor: Color.PrimaryText }}
                  tooltip={i.repository.nameWithOwner}
                  onAction={() => open(i.permalink)}
                />
              );
            })}
          </MenuBarSection>
        );
      })}

      <MenuBarSection>
        <MenuBarItem
          title="Open My Pull Requests"
          icon={Icon.AppWindowList}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => launchMyPullRequestsCommand()}
        />
        <SortMenuBarAction {...{ sortQuery, setSortQuery, data: PR_SORT_TYPES_TO_QUERIES }} />
        <MenuBarItemConfigureCommand />
      </MenuBarSection>
    </MenuBarRoot>
  );
}

export default withGitHubClient(MyPullRequestsMenu);
