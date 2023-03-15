import { Action, ActionPanel, List } from "@raycast/api";
import { IssuePriorityValue, User } from "@linear/sdk";

import { getProjectIssues } from "../api/getIssues";

import useIssues from "../hooks/useIssues";

import StateIssueList from "./StateIssueList";
import CreateIssueForm from "./CreateIssueForm";

type ProjectIssuesProps = {
  projectId: string;
  teamId?: string;
  priorities: IssuePriorityValue[] | undefined;
  users: User[] | undefined;
  me: User | undefined;
};

export default function ProjectIssues({ projectId, priorities, me, users }: ProjectIssuesProps) {
  const { issues, isLoadingIssues, mutateList } = useIssues(getProjectIssues, [projectId]);

  return (
    <List isLoading={isLoadingIssues} searchBarPlaceholder="Filter by ID, title, status, assignee or priority">
      <List.EmptyView
        title="No issues"
        description="There are no issues in the project."
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Issue"
              target={<CreateIssueForm projectId={projectId} priorities={priorities} users={users} me={me} />}
            />
          </ActionPanel>
        }
      />

      <StateIssueList issues={issues} mutateList={mutateList} priorities={priorities} users={users} me={me} />
    </List>
  );
}
