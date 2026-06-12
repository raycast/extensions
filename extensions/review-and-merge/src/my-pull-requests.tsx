import { List } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { github } from "./github/auth";
import { usePullRequestSearch } from "./github/usePullRequests";
import { myOpenPullRequestsQuery } from "./lib/searchQueries";
import { groupByRepo, shortRepoName } from "./lib/groupByRepo";
import { PullRequestListItem } from "./components/PullRequestListItem";
import { ErrorView } from "./components/ErrorView";
import {
  autoMergeAccessories,
  checksAccessories,
  commentsAccessories,
  dateAccessories,
  pullRequestStateIcon,
  reviewDecisionAccessories,
} from "./components/accessories";
import { getSearchScope } from "./preferences";

function MyPullRequests() {
  const { data, isLoading, error, revalidate } = usePullRequestSearch(
    myOpenPullRequestsQuery(getSearchScope()),
  );

  if (error) {
    return <ErrorView error={error} onRetry={revalidate} />;
  }

  const groups = groupByRepo(data?.pullRequests ?? []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter my pull requests…">
      {groups.map((group) => (
        <List.Section
          key={group.repo}
          title={shortRepoName(group.repo)}
          subtitle={`${group.pullRequests.length}`}
        >
          {group.pullRequests.map((pr) => (
            <PullRequestListItem
              key={pr.id}
              pr={pr}
              viewerLogin={data?.viewerLogin}
              onRefresh={revalidate}
              primaryMerge
              subtitle={`#${pr.number}`}
              icon={pullRequestStateIcon(pr)}
              accessories={[
                ...checksAccessories(pr),
                ...autoMergeAccessories(pr),
                ...reviewDecisionAccessories(pr),
                ...commentsAccessories(pr),
                ...dateAccessories(pr),
              ]}
            />
          ))}
        </List.Section>
      ))}
      <List.EmptyView
        title="No open pull requests"
        description="You have no open pull requests."
      />
    </List>
  );
}

export default withAccessToken(github)(MyPullRequests);
