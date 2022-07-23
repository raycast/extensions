import { Action, ActionPanel, List } from "@raycast/api";

import { getSubIssues, IssueResult } from "../api/getIssues";

import useIssues from "../hooks/useIssues";
import usePriorities from "../hooks/usePriorities";
import useMe from "../hooks/useMe";
import useUsers from "../hooks/useUsers";
import CreateIssueForm from "./CreateIssueForm";
import { MutatePromise } from "@raycast/utils";
import IssueListItem from "./IssueListItem";

type SubIssuesProps = {
  issue: IssueResult;
  mutateList?: MutatePromise<IssueResult[] | undefined>;
};

export default function SubIssues({ issue, mutateList }: SubIssuesProps) {
  const {
    issues,
    isLoadingIssues,
    mutateList: mutateSubIssues,
  } = useIssues((issueId) => getSubIssues(issueId), [issue.id]);

  const { priorities, isLoadingPriorities } = usePriorities();
  const { me, isLoadingMe } = useMe();
  const { users, isLoadingUsers } = useUsers();

  return (
    <List
      isLoading={isLoadingIssues || isLoadingMe || isLoadingPriorities || isLoadingMe || isLoadingUsers}
      navigationTitle={`${issue.title} • ${issue.identifier}`}
    >
      <List.EmptyView
        title="No issues"
        description="This issue doesn't have any sub-issues."
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Sub-Issue"
              target={
                <CreateIssueForm
                  priorities={priorities}
                  users={users}
                  me={me}
                  parentId={issue.id}
                  projectId={issue.project?.id}
                  cycleId={issue.cycle?.id}
                  teamId={issue.team.id}
                />
              }
            />
          </ActionPanel>
        }
      />

      {issues?.map((issue) => (
        <IssueListItem
          issue={issue}
          key={issue.id}
          mutateList={mutateList}
          mutateSubIssues={mutateSubIssues}
          priorities={priorities}
          users={users}
          me={me}
        />
      ))}
    </List>
  );
}
