import { useCachedPromise } from "@raycast/utils";
import { compareDesc, format, subDays } from "date-fns";
import { uniqBy } from "lodash";

import { getGitHubClient } from "../api/githubClient";
import { IssueFieldsFragment } from "../generated/graphql";
import { pluralize } from "../helpers";

export function useMyIssues(repository: string | null) {
  const { github } = getGitHubClient();

  const { data, ...rest } = useCachedPromise(
    async (repository) => {
      const numberOfDays = 60;
      const twoWeeksAgo = format(subDays(Date.now(), numberOfDays), "yyyy-MM-dd");
      const updatedFilter = `updated:>${twoWeeksAgo}`;

      const repositoryFilter = repository ? `repo:${repository}` : "";

      const results = await Promise.all(
        [
          `is:issue author:@me archived:false is:open ${updatedFilter} ${repositoryFilter}`,
          `is:issue author:@me archived:false is:closed ${updatedFilter} ${repositoryFilter}`,
          `is:issue assignee:@me archived:false is:open ${updatedFilter} ${repositoryFilter}`,
          `is:issue assignee:@me archived:false is:closed ${updatedFilter} ${repositoryFilter}`,
          `is:issue mentions:@me archived:false is:open ${updatedFilter} ${repositoryFilter}`,
          `is:issue mentions:@me archived:false is:closed ${updatedFilter} ${repositoryFilter}`,
        ].map((query) => github.searchIssues({ query, numberOfItems: 20 })),
      );

      return results.map((result) => result.search.nodes as IssueFieldsFragment[]);
    },
    [repository],
  );

  const [created, createdClosed, assigned, assignedClosed, mentioned, mentionedClosed] = data ?? [];

  const recentlyClosed = uniqBy(
    [...(createdClosed || []), ...(assignedClosed || []), ...(mentionedClosed || [])],
    "id",
  );

  const sections = [
    { title: "Created", issues: created },
    { title: "Assigned", issues: assigned },
    { title: "Mentioned", issues: mentioned },
    { title: "Recently Closed", issues: recentlyClosed },
  ]
    .filter((section) => section.issues && section.issues.length > 0)
    .map((section) => {
      section.issues?.sort((a, b) => compareDesc(new Date(a.updatedAt), new Date(b.updatedAt)));

      const subtitle = pluralize(section.issues?.length ?? 0, "issue", { withNumber: true });

      return { ...section, subtitle };
    });

  return { data: sections, ...rest };
}
