import { Action, ActionPanel, List } from "@raycast/api";

import { getCreatedIssues } from "./api/getIssues";
import CreateIssueForm from "./components/CreateIssueForm";
import StateIssueList from "./components/StateIssueList";
import View from "./components/View";
import useIssues from "./hooks/useIssues";
import useMe from "./hooks/useMe";
import usePriorities from "./hooks/usePriorities";

function CreatedIssues() {
  const { issues, isLoadingIssues, mutateList } = useIssues(getCreatedIssues);
  const { priorities, isLoadingPriorities } = usePriorities();
  const { me, isLoadingMe } = useMe();

  return (
    <List
      isLoading={isLoadingIssues || isLoadingPriorities || isLoadingMe}
      searchBarPlaceholder="Filter by ID, title, status, assignee or priority"
      filtering={{ keepSectionOrder: true }}
    >
      <List.EmptyView
        title="No issues"
        description="There are no issues created by you."
        actions={
          <ActionPanel>
            <Action.Push title="Create Issue" target={<CreateIssueForm priorities={priorities} me={me} />} />
          </ActionPanel>
        }
      />
      <StateIssueList mutateList={mutateList} issues={issues} priorities={priorities} me={me} />
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
