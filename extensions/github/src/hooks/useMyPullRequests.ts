import { useCachedPromise } from "@raycast/utils";
import { subDays, format, compareDesc } from "date-fns";
import { uniqBy } from "lodash";

import { PullRequestFieldsFragment } from "../generated/graphql";
import { pluralize } from "../helpers";
import { getGitHubClient } from "../helpers/withGithubClient";

export function useMyPullRequests(repository: string | null) {
  const { github } = getGitHubClient();

  const { data, ...rest } = useCachedPromise(
    (repository) => {
      const numberOfDays = 14;
      const twoWeeksAgo = format(subDays(Date.now(), numberOfDays), "yyyy-MM-dd");
      const updatedFilter = `updated:>${twoWeeksAgo}`;

      const repositoryFilter = repository ? `repo:${repository}` : "";

      return github.myPullRequests({
        createdOpenQuery: `is:pr author:@me archived:false is:open ${updatedFilter} ${repositoryFilter}`,
        createdClosedQuery: `is:pr author:@me archived:false is:closed ${updatedFilter} ${repositoryFilter}`,
        assignedOpenQuery: `is:pr assignee:@me archived:false is:open ${updatedFilter} ${repositoryFilter}`,
        assignedClosedQuery: `is:pr assignee:@me archived:false is:closed ${updatedFilter} ${repositoryFilter}`,
        mentionedOpenQuery: `is:pr mentions:@me archived:false is:open ${updatedFilter} ${repositoryFilter}`,
        mentionedClosedQuery: `is:pr mentions:@me archived:false is:closed ${updatedFilter} ${repositoryFilter}`,
        reviewRequestsOpenQuery: `is:pr review-requested:@me archived:false is:open ${updatedFilter} ${repositoryFilter}`,
        reviewRequestsClosedQuery: `is:pr review-requested:@me archived:false is:closed ${updatedFilter} ${repositoryFilter}`,
        reviewedByOpenQuery: `is:pr reviewed-by:@me archived:false is:open ${updatedFilter} ${repositoryFilter}`,
        reviewedByClosedQuery: `is:pr reviewed-by:@me archived:false is:closed ${updatedFilter} ${repositoryFilter}`,
        numberOfOpenItems: 20,
        numberOfClosedItems: 20,
      });
    },
    [repository]
  );

  const created = data?.createdOpen.pullRequests;
  const assigned = data?.assignedOpen.pullRequests;
  const mentioned = data?.mentionedOpen.pullRequests;
  const reviewRequests = data?.reviewRequestsOpen.pullRequests;
  const reviewedBy = data?.reviewedByOpen.pullRequests;

  const recentlyClosed = uniqBy(
    [
      ...(data?.createdClosed.pullRequests || []),
      ...(data?.assignedClosed.pullRequests || []),
      ...(data?.mentionedClosed.pullRequests || []),
      ...(data?.reviewRequestsClosed.pullRequests || []),
      ...(data?.reviewedByClosed.pullRequests || []),
    ],
    "pullRequest.id"
  );

  const prIds: string[] = [];
  function getPullRequestsWithoutDuplicates(pullRequests: PullRequestFieldsFragment[] | undefined) {
    const filteredPullRequests = pullRequests?.filter((pr) => !prIds.includes(pr.id));
    prIds.push(...(filteredPullRequests?.map((pr) => pr.id) ?? []));
    return filteredPullRequests;
  }

  const sections = [
    { title: "Open", pullRequests: created },
    { title: "Assigned", pullRequests: assigned },
    { title: "Mentioned", pullRequests: mentioned },
    { title: "Review Requests", pullRequests: reviewRequests },
    { title: "Reviewed", pullRequests: reviewedBy },
    { title: "Recently Closed", pullRequests: recentlyClosed },
  ]
    .filter((section) => section.pullRequests && section.pullRequests.length > 0)
    .map((section) => {
      const pullRequests = getPullRequestsWithoutDuplicates(
        section.pullRequests?.map((pr) => pr?.pullRequest as PullRequestFieldsFragment)
      );
      pullRequests?.sort((a, b) => compareDesc(new Date(a.updatedAt), new Date(b.updatedAt)));

      const subtitle = pluralize(pullRequests?.length ?? 0, "Pull Request", { withNumber: true });

      return { ...section, subtitle, pullRequests };
    });

  return { data: sections, ...rest };
}
