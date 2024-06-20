import { useCachedPromise } from "@raycast/utils";
import { format, subDays } from "date-fns";
import { uniqBy } from "lodash";

import { getGitHubClient } from "../api/githubClient";
import { IssueFieldsFragment } from "../generated/graphql";
import { pluralize } from "../helpers";

export function useMyIssues(repository: string | null, sortQuery: string) {
  const { github } = getGitHubClient();

  const { data, ...rest } = useCachedPromise(
    async (repository, sortTxt) => {
      const numberOfDays = 60;
      const twoWeeksAgo = format(subDays(Date.now(), numberOfDays), "yyyy-MM-dd");
      const updatedFilter = `updated:>${twoWeeksAgo}`;

      const repositoryFilter = repository ? `repo:${repository}` : "";

      const results = await Promise.all(
        [
          `is:issue author:@me archived:false is:open`,
          `is:issue author:@me archived:false is:closed`,
          `is:issue assignee:@me archived:false is:open`,
          `is:issue assignee:@me archived:false is:closed`,
          `is:issue mentions:@me archived:false is:open`,
          `is:issue mentions:@me archived:false is:closed`,
        ].map((query) =>
          github.searchIssues({ query: `${query} ${sortTxt} ${updatedFilter} ${repositoryFilter}`, numberOfItems: 20 }),
        ),
      );

      return results.map((result) => result.search.nodes as IssueFieldsFragment[]);
    },
    [repository, sortQuery],
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
      const subtitle = pluralize(section.issues?.length ?? 0, "issue", { withNumber: true });

      return { ...section, subtitle };
    });

  return { data: sections, ...rest };
}
