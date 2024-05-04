import { useCachedPromise } from "@raycast/utils";
import { compareDesc, format, subDays } from "date-fns";
import { uniqBy } from "lodash";

import { getGitHubClient } from "../api/githubClient";
import { PullRequestFieldsFragment } from "../generated/graphql";
import { pluralize } from "../helpers";

export enum SectionType {
  Open = "Open",
  Assigned = "Assigned",
  Mentioned = "Mentioned",
  ReviewRequests = "Review Requests",
  Reviewed = "Reviewed",
  RecentlyClosed = "Recently Closed",
}

export function useMyPullRequests(repository: string | null) {
  const { github } = getGitHubClient();

  const { data, ...rest } = useCachedPromise(
    async (repository) => {
      const numberOfDays = 14;
      const twoWeeksAgo = format(subDays(Date.now(), numberOfDays), "yyyy-MM-dd");
      const updatedFilter = `updated:>${twoWeeksAgo}`;

      const repositoryFilter = repository ? `repo:${repository}` : "";

      const results = await Promise.all(
        [
          `is:pr author:@me archived:false is:open ${updatedFilter} ${repositoryFilter}`,
          `is:pr author:@me archived:false is:closed ${updatedFilter} ${repositoryFilter}`,
          `is:pr assignee:@me archived:false is:open ${updatedFilter} ${repositoryFilter}`,
          `is:pr assignee:@me archived:false is:closed ${updatedFilter} ${repositoryFilter}`,
          `is:pr mentions:@me archived:false is:open ${updatedFilter} ${repositoryFilter}`,
          `is:pr mentions:@me archived:false is:closed ${updatedFilter} ${repositoryFilter}`,
          `is:pr review-requested:@me archived:false is:open ${updatedFilter} ${repositoryFilter}`,
          `is:pr review-requested:@me archived:false is:closed ${updatedFilter} ${repositoryFilter}`,
          `is:pr reviewed-by:@me archived:false is:open ${updatedFilter} ${repositoryFilter}`,
          `is:pr reviewed-by:@me archived:false is:closed ${updatedFilter} ${repositoryFilter}`,
        ].map((query) => github.searchPullRequests({ query, numberOfItems: 20 })),
      );

      return results.map((result) => result.search.edges?.map((edge) => edge?.node as PullRequestFieldsFragment));
    },
    [repository],
  );

  const [
    created,
    createdClosed,
    assigned,
    assignedClosed,
    mentioned,
    mentionedClosed,
    reviewRequests,
    reviewRequestsClosed,
    reviewedBy,
    reviewedByClosed,
  ] = data ?? [];

  const recentlyClosed = uniqBy(
    [
      ...(createdClosed || []),
      ...(assignedClosed || []),
      ...(mentionedClosed || []),
      ...(reviewRequestsClosed || []),
      ...(reviewedByClosed || []),
    ],
    "id",
  );

  const prIds: string[] = [];
  function getPullRequestsWithoutDuplicates(pullRequests: PullRequestFieldsFragment[] | undefined) {
    const filteredPullRequests = pullRequests?.filter((pr) => !prIds.includes(pr.id));
    prIds.push(...(filteredPullRequests?.map((pr) => pr.id) ?? []));
    return filteredPullRequests;
  }

  const sections = [
    { type: SectionType.Open, pullRequests: created },
    { type: SectionType.Assigned, pullRequests: assigned },
    { type: SectionType.Mentioned, pullRequests: mentioned },
    { type: SectionType.ReviewRequests, pullRequests: reviewRequests },
    { type: SectionType.Reviewed, pullRequests: reviewedBy },
    { type: SectionType.RecentlyClosed, pullRequests: recentlyClosed },
  ]
    .filter((section) => section.pullRequests && section.pullRequests.length > 0)
    .map((section) => {
      const pullRequests = getPullRequestsWithoutDuplicates(section.pullRequests);
      pullRequests?.sort((a, b) => compareDesc(new Date(a.updatedAt), new Date(b.updatedAt)));

      const subtitle = pluralize(pullRequests?.length ?? 0, "pull request", { withNumber: true });

      return { ...section, subtitle, pullRequests };
    });

  return { data: sections, ...rest };
}
