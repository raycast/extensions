import { List } from "@raycast/api";
import { useState } from "react";

import PullRequestListEmptyView from "./components/PullRequestListEmptyView";
import PullRequestListItem from "./components/PullRequestListItem";
import RepositoriesDropdown from "./components/RepositoryDropdown";
import { withGitHubClient } from "./helpers/withGithubClient";
import { useMyPullRequests } from "./hooks/useMyPullRequests";
import { useViewer } from "./hooks/useViewer";

function MyPullRequests() {
  const viewer = useViewer();
  const [selectedRepository, setSelectedRepository] = useState<string | null>(null);
  const { data: sections, isLoading, mutate: mutateList } = useMyPullRequests(selectedRepository);

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
                  pullRequest={pullRequest}
                  viewer={viewer}
                  mutateList={mutateList}
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
