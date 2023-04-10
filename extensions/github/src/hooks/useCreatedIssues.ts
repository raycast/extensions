import { useCachedPromise } from "@raycast/utils";
import { subDays, format, compareDesc } from "date-fns";

import { IssueFieldsFragment } from "../generated/graphql";
import { pluralize } from "../helpers";
import { getGitHubClient } from "../helpers/withGithubClient";

export function useCreatedIssues(repository: string | null) {
  const { data, ...rest } = useCachedPromise(
    (repository) => {
      const numberOfDays = 60;
      const twoWeeksAgo = format(subDays(Date.now(), numberOfDays), "yyyy-MM-dd");
      const updatedFilter = `updated:>${twoWeeksAgo}`;

      const repositoryFilter = repository ? `repo:${repository}` : "";

      return getGitHubClient().github.searchCreatedIssues({
        createdOpenQuery: `is:issue author:@me archived:false is:open ${updatedFilter} ${repositoryFilter}`,
        createdClosedQuery: `is:issue author:@me archived:false is:closed ${updatedFilter} ${repositoryFilter}`,
        numberOfOpenItems: 20,
        numberOfClosedItems: 20,
      });
    },
    [repository]
  );

  const openedIssues = data?.createdOpen.nodes as IssueFieldsFragment[];
  const closedIssues = data?.createdClosed.nodes as IssueFieldsFragment[];

  const sections = [
    { title: "Recently Created", issues: openedIssues },
    { title: "Recently Closed", issues: closedIssues },
  ]
    .filter((section) => section.issues && section.issues.length > 0)
    .map((section) => {
      section.issues?.sort((a, b) => compareDesc(new Date(a.updatedAt), new Date(b.updatedAt)));

      const subtitle = pluralize(section.issues?.length ?? 0, "Issue", { withNumber: true });

      return { ...section, subtitle };
    });

  return { data: sections, ...rest };
}
