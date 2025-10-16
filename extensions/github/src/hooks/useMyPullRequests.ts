import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { format, subDays } from "date-fns";
import { uniqBy } from "lodash";

import { getGitHubClient } from "../api/githubClient";
import { PullRequestFieldsFragment } from "../generated/graphql";
import { pluralize } from "../helpers";
import { getRepositoryFilter } from "../helpers/repository";

enum SectionType {
  Open = "Open",
  Assigned = "Assigned",
  Mentioned = "Mentioned",
  ReviewRequests = "Review Requests",
  Reviewed = "Reviewed",
  RecentlyClosed = "Recently Closed",
}

export function useMyPullRequests({
  repository,
  sortQuery,
  includeMentioned,
  includeAssigned,
  includeRecentlyClosed,
  includeReviewRequests,
  includeReviewed,
  filterMode,
  repositoryList,
}: {
  repository: string | null;
  sortQuery: string;
  includeAssigned: boolean;
  includeMentioned: boolean;
  includeRecentlyClosed: boolean;
  includeReviewRequests: boolean;
  includeReviewed: boolean;
  filterMode: Preferences.MyPullRequests["repositoryFilterMode"];
  repositoryList: string[];
}) {
  const { github } = getGitHubClient();

  const { data, ...rest } = useCachedPromise(
    async (
      repo,
      sortTxt,
      enableAssigned,
      enableMentioned,
      enableClosed,
      enableReviewRequests,
      enableReviewed,
      filterMode,
      repositoryList,
    ) => {
      const numberOfDays = 14;
      const twoWeeksAgo = format(subDays(Date.now(), numberOfDays), "yyyy-MM-dd");
      const updatedFilter = `updated:>${twoWeeksAgo}`;

      const repositoryFilter = getRepositoryFilter(filterMode, repositoryList, repo);

      const { includeTeamReviewRequests } = getPreferenceValues<Preferences>();
      const reviewRequestedQuery = includeTeamReviewRequests ? "review-requested" : "user-review-requested";

      const results = await Promise.all(
        [
          `is:pr author:@me archived:false is:open`,
          ...(enableClosed ? [`is:pr author:@me archived:false is:closed ${updatedFilter}`] : []),
          ...(enableAssigned ? [`is:pr assignee:@me archived:false is:open`] : []),
          ...(enableAssigned && enableClosed ? [`is:pr assignee:@me archived:false is:closed ${updatedFilter}`] : []),
          ...(enableMentioned ? [`is:pr mentions:@me archived:false is:open`] : []),
          ...(enableMentioned && enableClosed ? [`is:pr mentions:@me archived:false is:closed ${updatedFilter}`] : []),
          ...(enableReviewRequests ? [`is:pr ${reviewRequestedQuery}:@me archived:false is:open`] : []),
          ...(enableReviewRequests && enableClosed
            ? [`is:pr ${reviewRequestedQuery}:@me archived:false is:closed ${updatedFilter}`]
            : []),
          ...(enableReviewed ? [`is:pr reviewed-by:@me archived:false is:open`] : []),
          ...(enableReviewed && enableClosed
            ? [`is:pr reviewed-by:@me archived:false is:closed ${updatedFilter}`]
            : []),
        ].map((query) =>
          github.searchPullRequests({
            query: `${query} ${sortTxt} ${repositoryFilter}`,
            numberOfItems: 20,
          }),
        ),
      );

      return results.map((result) => result.search.edges?.map((edge) => edge?.node as PullRequestFieldsFragment));
    },
    [
      repository,
      sortQuery,
      includeAssigned,
      includeMentioned,
      includeRecentlyClosed,
      includeReviewRequests,
      includeReviewed,
      filterMode,
      repositoryList,
    ],
  );

  let created,
    createdClosed,
    assigned,
    assignedClosed,
    mentioned,
    mentionedClosed,
    reviewRequests,
    reviewRequestsClosed,
    reviewedBy,
    reviewedByClosed;

  if (data) {
    let count = 0;
    created = data[count++];
    if (includeRecentlyClosed) createdClosed = data[count++];
    if (includeAssigned) {
      assigned = data[count++];
      if (includeRecentlyClosed) assignedClosed = data[count++];
    }
    if (includeMentioned) {
      mentioned = data[count++];
      if (includeRecentlyClosed) mentionedClosed = data[count++];
    }
    if (includeReviewRequests) {
      reviewRequests = data[count++];
      if (includeRecentlyClosed) reviewRequestsClosed = data[count++];
    }
    if (includeReviewed) {
      reviewedBy = data[count++];
      if (includeRecentlyClosed) reviewedByClosed = data[count++];
    }
  }

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

      const subtitle = pluralize(pullRequests?.length ?? 0, "pull request", { withNumber: true });

      return { ...section, subtitle, pullRequests };
    });

  return { data: sections, ...rest };
}
