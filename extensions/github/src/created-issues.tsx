import { List } from "@raycast/api";
import { useState } from "react";

import IssueListEmptyView from "./components/IssueListEmptyView";
import IssueListItem from "./components/IssueListItem";
import RepositoriesDropdown from "./components/RepositoryDropdown";
import View from "./components/View";
import { useCreatedIssues } from "./hooks/useCreatedIssues";
import { useViewer } from "./hooks/useViewer";

function CreatedIssues() {
  const viewer = useViewer();
  const [selectedRepository, setSelectedRepository] = useState<string | null>(null);
  const { data: sections, isLoading, mutate: mutateList } = useCreatedIssues(selectedRepository);

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
              return <IssueListItem key={issue.id} issue={issue} mutateList={mutateList} viewer={viewer} />;
            })}
          </List.Section>
        );
      })}

      <IssueListEmptyView />
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <CreatedIssues />
    </View>
  );
}
