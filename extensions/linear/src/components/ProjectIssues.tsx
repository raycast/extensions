import { Action, ActionPanel, List } from "@raycast/api";
import { IssuePriorityValue, User } from "@linear/sdk";

import { getProjectIssues } from "../api/getIssues";

import useIssues from "../hooks/useIssues";
import useStates from "../hooks/useStates";

import StateIssueList from "./StateIssueList";
import CreateIssueForm from "./CreateIssueForm";

type ProjectIssuesProps = {
  projectId: string;
  teamId?: string;
  priorities: IssuePriorityValue[] | undefined;
  users: User[] | undefined;
  me: User | undefined;
};

export default function ProjectIssues({ projectId, teamId, priorities, me, users }: ProjectIssuesProps) {
  const { issues, isLoadingIssues, mutateList } = useIssues(getProjectIssues, [projectId]);
  const { allStates, isLoadingAllStates } = useStates();

  const showList = issues && allStates && issues.length > 0 && allStates.length > 0;

  return (
    <List
      isLoading={isLoadingIssues || isLoadingAllStates}
      searchBarPlaceholder="Filter by key, title, status, assignee or priority"
    >
      <List.EmptyView
        title="No issues"
        description="There are no issues in the project."
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Issue"
              target={
                <CreateIssueForm projectId={projectId} teamId={teamId} priorities={priorities} users={users} me={me} />
              }
            />
          </ActionPanel>
        }
      />

      {showList ? (
        <StateIssueList
          issues={issues}
          mutateList={mutateList}
          states={allStates}
          priorities={priorities}
          users={users}
          me={me}
        />
      ) : null}
    </List>
  );
}
