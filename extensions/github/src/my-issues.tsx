import { List } from "@raycast/api";
import { useState } from "react";

import IssueListEmptyView from "./components/IssueListEmptyView";
import IssueListItem from "./components/IssueListItem";
import RepositoriesDropdown from "./components/RepositoryDropdown";
import { withGitHubClient } from "./helpers/withGithubClient";
import { useMyIssues } from "./hooks/useMyIssues";
import { useViewer } from "./hooks/useViewer";

function MyIssues() {
  const viewer = useViewer();
  const [selectedRepository, setSelectedRepository] = useState<string | null>(null);
  const { data: sections, isLoading, mutate: mutateList } = useMyIssues(selectedRepository);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter by title, number, or assignee"
      searchBarAccessory={<RepositoriesDropdown setSelectedRepository={setSelectedRepository} />}
    >
      {sections.map((section) => {
        return (
          <List.Section key={section.title} title={section.title} subtitle={section.subtitle}>
            {section.issues?.map((issue) => {
              return <IssueListItem key={issue.id} issue={issue} viewer={viewer} mutateList={mutateList} />;
            })}
          </List.Section>
        );
      })}

      <IssueListEmptyView />
    </List>
  );
}

export default withGitHubClient(MyIssues);
