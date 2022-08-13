import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { GraphQLClient } from "graphql-request";

import {
  getSdk,
  PullRequestFieldsFragment,
} from "./SearchPullRequests.generated";

const api = getSdk(
  new GraphQLClient("https://api.github.com/graphql", {
    headers: {
      Authorization: `token ${getPreferenceValues().token}`,
    },
  })
);
export type Section = {
  title: string;
  requests: PullRequestFieldsFragment[];
};

export const useSearchPullRequests = () => {
  {
    return useCachedPromise(async () => {
      try {
        const apiResult = await api.SearchPullRequests({
          createdOpenQuery: "is:pr author:@me archived:false is:open",
          createdClosedQuery: "is:pr author:@me archived:false is:closed",
          assignedOpenQuery: "is:pr assignee:@me archived:false is:open",
          assignedClosedQuery: "is:pr assignee:@me archived:false is:closed",
          mentionedOpenQuery: "is:pr mentions:@me archived:false is:open",
          mentionedClosedQuery: "is:pr mentions:@me archived:false is:closed",
          reviewRequestsOpenQuery:
            "is:pr review-requested:@me archived:false is:open",
          reviewRequestsClosedQuery:
            "is:pr review-requested:@me archived:false is:closed",
          reviewedByOpenQuery: "is:pr reviewed-by:@me archived:false is:open",
          reviewedByClosedQuery:
            "is:pr reviewed-by:@me archived:false is:closed",
          numberOfOpenItems: 20,
          numberOfClosedItems: 20,
          avatarSize: 64,
        });

        const createdClosed =
          apiResult.createdClosed.pullRequests
            ?.map((item) => item?.pullRequest as PullRequestFieldsFragment)
            .filter((item) => item !== null) ?? [];
        const assignedClosed =
          apiResult.assignedClosed.pullRequests
            ?.map((item) => item?.pullRequest as PullRequestFieldsFragment)
            .filter((item) => item !== null) ?? [];
        const mentionedClosed =
          apiResult.mentionedClosed.pullRequests
            ?.map((item) => item?.pullRequest as PullRequestFieldsFragment)
            .filter((item) => item !== null) ?? [];

        const closed = createdClosed
          .concat(assignedClosed)
          .concat(mentionedClosed)
          .sort(
            (a, b) =>
              new Date(b.updatedDate).getTime() -
              new Date(a.updatedDate).getTime()
          );
        const uniqueClosedIds = new Set();

        const reviewRequested =
          apiResult.reviewRequestsOpen.pullRequests
            ?.map((item) => item?.pullRequest as PullRequestFieldsFragment)
            .filter((item) => item !== null) ?? [];
        const open =
          apiResult.createdOpen.pullRequests
            ?.map((item) => item?.pullRequest as PullRequestFieldsFragment)
            .filter((item) => item !== null) ?? [];
        const mentioned =
          apiResult.mentionedOpen.pullRequests
            ?.map((item) => item?.pullRequest as PullRequestFieldsFragment)
            .filter((item) => item !== null) ?? [];

        const sections: Section[] = [
          { title: "Need Review", requests: reviewRequested },
          { title: "Opened", requests: open },
          { title: "Mentioned", requests: mentioned },
          {
            title: "Recently Closed",
            requests: closed.filter((element) => {
              const isDuplicate = uniqueClosedIds.has(element.nodeId);

              uniqueClosedIds.add(element.nodeId);

              if (!isDuplicate) {
                return true;
              }

              return false;
            }),
          },
        ];
        return sections;
      } catch (error) {
        console.log(error);
      }
    });
  }
};
