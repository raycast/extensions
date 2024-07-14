import { List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";

import PullRequestListEmptyView from "./components/PullRequestListEmptyView";
import PullRequestListItem from "./components/PullRequestListItem";
import RepositoriesDropdown from "./components/RepositoryDropdown";
import { PR_DEFAULT_SORT_QUERY } from "./helpers/pull-request";
import { withGitHubClient } from "./helpers/withGithubClient";
import { useMyPullRequests } from "./hooks/useMyPullRequests";
import { useViewer } from "./hooks/useViewer";

function MyPullRequests() {
  const viewer = useViewer();
  const [selectedRepository, setSelectedRepository] = useState<string | null>(null);
  const [sortQuery, setSortQuery] = useCachedState<string>("sort-query", PR_DEFAULT_SORT_QUERY, {
    cacheNamespace: "github-my-pr",
  });
  const { data: sections, isLoading, mutate: mutateList } = useMyPullRequests(selectedRepository, sortQuery);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter by title, number, or assignee"
      searchBarAccessory={<RepositoriesDropdown setSelectedRepository={setSelectedRepository} />}
    >
      {sections.map((section) => {
        return (
          <List.Section key={section.type} title={section.type} subtitle={section.subtitle}>
            {section.pullRequests?.map((pullRequest) => {
              return (
                <PullRequestListItem
                  key={pullRequest.id}
                  {...{ pullRequest, viewer, mutateList, sortQuery, setSortQuery }}
                />
              );
            })}
          </List.Section>
        );
      })}

      <PullRequestListEmptyView />
    </List>
  );
}

export default withGitHubClient(MyPullRequests);
