import { Action, ActionPanel, List } from "@raycast/api";

import { getMyIssues } from "./api/getIssues";

import useIssues from "./hooks/useIssues";
import usePriorities from "./hooks/usePriorities";
import useMe from "./hooks/useMe";
import useUsers from "./hooks/useUsers";

import StateIssueList from "./components/StateIssueList";
import CreateIssueForm from "./components/CreateIssueForm";
import View from "./components/View";

function MyIssues() {
  const { issues, isLoadingIssues, mutateList } = useIssues(getMyIssues);
  const { priorities, isLoadingPriorities } = usePriorities();
  const { me, isLoadingMe } = useMe();
  const { users, isLoadingUsers } = useUsers();

  return (
    <List
      isLoading={isLoadingIssues || isLoadingMe || isLoadingPriorities || isLoadingMe || isLoadingUsers}
      searchBarPlaceholder="Filter by ID, title, status, assignee or priority"
      filtering={{ keepSectionOrder: true }}
    >
      <List.EmptyView
        title="No issues"
        description="There are no issues assigned to you."
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Issue"
              target={<CreateIssueForm assigneeId={me?.id} priorities={priorities} users={users} me={me} />}
            />
          </ActionPanel>
        }
      />

      <StateIssueList mutateList={mutateList} issues={issues} priorities={priorities} users={users} me={me} />
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <MyIssues />
    </View>
  );
}
