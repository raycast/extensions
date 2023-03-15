import { useCachedPromise } from "@raycast/utils";
import { subDays, format, compareDesc } from "date-fns";

import { IssueFieldsFragment } from "../generated/graphql";
import { pluralize } from "../helpers";
import { getGitHubClient } from "../helpers/withGithubClient";

export function useOpenIssues(repository: string | null) {
  const { github } = getGitHubClient();

  const { data, ...rest } = useCachedPromise(
    (repository) => {
      const numberOfDays = 60;
      const twoWeeksAgo = format(subDays(Date.now(), numberOfDays), "yyyy-MM-dd");
      const updatedFilter = `updated:>${twoWeeksAgo}`;

      const repositoryFilter = repository ? `repo:${repository}` : "";

      return github.searchOpenIssues({
        assignedOpenQuery: `is:issue assignee:@me archived:false is:open ${updatedFilter} ${repositoryFilter}`,
        mentionedOpenQuery: `is:issue mentions:@me archived:false is:open ${updatedFilter} ${repositoryFilter}`,
        numberOfOpenItems: 20,
      });
    },
    [repository]
  );

  const assignedIssues = data?.assignedOpen.nodes as IssueFieldsFragment[];
  const mentionedIssues = data?.mentionedOpen.nodes as IssueFieldsFragment[];

  const sections = [
    { title: "Assigned", issues: assignedIssues },
    { title: "Mentioned", issues: mentionedIssues },
  ]
    .filter((section) => section.issues && section.issues.length > 0)
    .map((section) => {
      section.issues?.sort((a, b) => compareDesc(new Date(a.updatedAt), new Date(b.updatedAt)));

      const subtitle = pluralize(section.issues?.length ?? 0, "Issue", { withNumber: true });

      return { ...section, subtitle };
    });

  return { data: sections, ...rest };
}
