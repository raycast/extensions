import { useCachedPromise } from "@raycast/utils";
import { format, subDays } from "date-fns";
import { uniqBy } from "lodash";

import { getGitHubClient } from "../api/githubClient";
import { IssueFieldsFragment } from "../generated/graphql";
import { pluralize } from "../helpers";
import { getRepositoryFilter } from "../helpers/repository";

export function useMyIssues({
  sortQuery,
  repository,
  showCreated,
  showAssigned,
  showMentioned,
  showRecentlyClosed,
  filterMode,
  repositoryList,
}: {
  repository: string | null;
  sortQuery: string;
  showCreated: boolean;
  showAssigned: boolean;
  showMentioned: boolean;
  showRecentlyClosed: boolean;
  filterMode: Preferences.MyIssues["repositoryFilterMode"];
  repositoryList: string[];
}) {
  const { github } = getGitHubClient();

  const { data, ...rest } = useCachedPromise(
    async (repo, sortTxt, enableCreated, enableAssigned, enableMentioned, enableClosed, filterMode, repositoryList) => {
      const numberOfDays = 60;
      const twoWeeksAgo = format(subDays(Date.now(), numberOfDays), "yyyy-MM-dd");
      const updatedFilter = `updated:>${twoWeeksAgo}`;

      const repositoryFilter = getRepositoryFilter(filterMode, repositoryList, repo);

      const results = await Promise.all(
        [
          ...(enableCreated ? [`is:issue author:@me archived:false is:open`] : []),
          ...(enableClosed ? [`is:issue author:@me archived:false is:closed`] : []),
          ...(enableAssigned ? [`is:issue assignee:@me archived:false is:open`] : []),
          ...(enableAssigned && enableClosed ? [`is:issue assignee:@me archived:false is:closed`] : []),
          ...(enableMentioned ? [`is:issue mentions:@me archived:false is:open`] : []),
          ...(enableMentioned && enableClosed ? [`is:issue mentions:@me archived:false is:closed`] : []),
        ].map((query) =>
          github.searchIssues({ query: `${query} ${sortTxt} ${updatedFilter} ${repositoryFilter}`, numberOfItems: 20 }),
        ),
      );

      return results.map((result) => result.search.nodes as IssueFieldsFragment[]);
    },
    [repository, sortQuery, showCreated, showAssigned, showMentioned, showRecentlyClosed, filterMode, repositoryList],
  );

  let created, createdClosed, assigned, assignedClosed, mentioned, mentionedClosed;
  if (data) {
    let count = 0;
    if (showCreated) created = data[count++];
    if (showRecentlyClosed) createdClosed = data[count++];
    if (showAssigned) {
      assigned = data[count++];
      if (showRecentlyClosed) assignedClosed = data[count++];
    }
    if (showMentioned) {
      mentioned = data[count++];
      if (showRecentlyClosed) mentionedClosed = data[count++];
    }
  }

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
