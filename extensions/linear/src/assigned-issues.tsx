import { Action, ActionPanel, List } from "@raycast/api";

import { getAssignedIssues } from "./api/getIssues";

import useIssues from "./hooks/useIssues";
import useStates from "./hooks/useStates";
import usePriorities from "./hooks/usePriorities";
import useMe from "./hooks/useMe";
import useUsers from "./hooks/useUsers";

import StateIssueList from "./components/StateIssueList";
import CreateIssueForm from "./components/CreateIssueForm";
import View from "./components/View";

function AssignedIssues() {
  const { issues, isLoadingIssues, mutateList } = useIssues(getAssignedIssues);
  const { allStates, isLoadingAllStates } = useStates();
  const { priorities, isLoadingPriorities } = usePriorities();
  const { me, isLoadingMe } = useMe();
  const { users, isLoadingUsers } = useUsers();

  return (
    <List
      isLoading={
        isLoadingIssues || isLoadingMe || isLoadingAllStates || isLoadingPriorities || isLoadingMe || isLoadingUsers
      }
      searchBarPlaceholder="Filter by key, title, status, assignee or priority"
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
      <StateIssueList
        mutateList={mutateList}
        issues={issues}
        states={allStates}
        priorities={priorities}
        users={users}
        me={me}
      />
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <AssignedIssues />
    </View>
  );
}
