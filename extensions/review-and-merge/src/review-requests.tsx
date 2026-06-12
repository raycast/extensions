import { List } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { github } from "./github/auth";
import { useReviewRequests } from "./github/usePullRequests";
import { closedUnreviewedQuery, pendingReviewQuery } from "./lib/searchQueries";
import { groupByRepo, shortRepoName } from "./lib/groupByRepo";
import { PullRequestListItem } from "./components/PullRequestListItem";
import { ErrorView } from "./components/ErrorView";
import {
  authorAccessory,
  checksAccessories,
  commentsAccessories,
  dateAccessories,
  pullRequestStateIcon,
} from "./components/accessories";
import { getSearchScope } from "./preferences";

function ReviewRequests() {
  const scope = getSearchScope();
  const { data, isLoading, error, revalidate } = useReviewRequests(
    pendingReviewQuery(scope),
    closedUnreviewedQuery(new Date(), scope),
  );

  if (error) {
    return <ErrorView error={error} onRetry={revalidate} />;
  }

  const groups = groupByRepo([
    ...(data?.pending ?? []),
    ...(data?.closed ?? []),
  ]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter review requests…">
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
              approveFirst
              repoPullRequests={group.pullRequests}
              subtitle={`#${pr.number}`}
              icon={pullRequestStateIcon(pr)}
              accessories={[
                authorAccessory(pr),
                ...checksAccessories(pr),
                ...commentsAccessories(pr),
                ...dateAccessories(pr),
              ]}
            />
          ))}
        </List.Section>
      ))}
      <List.EmptyView
        title="No review requests"
        description="No PRs are waiting for your review."
      />
    </List>
  );
}

export default withAccessToken(github)(ReviewRequests);
